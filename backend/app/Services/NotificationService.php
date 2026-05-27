<?php

namespace App\Services;

use App\Mail\BonConfirmationMail;
use App\Models\Journal;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    /**
     * Envoyer un email générique et journaliser la notification.
     */
    public function notifier(Utilisateur $utilisateur, string $sujet, string $message): void
    {
        // Journaliser (utiliser id_utilisateur = la vraie clé primaire)
        try {
            Journal::create([
                'id_utilisateur' => $utilisateur->id_utilisateur,
                'action'         => 'notification',
                'description'    => "[{$sujet}] {$message}",
            ]);
        } catch (\Throwable $e) {
            Log::warning("NotificationService: impossible de journaliser — {$e->getMessage()}");
        }
    }

    /**
     * Envoyer l'email de confirmation d'achat d'un bon.
     */
    public function notifierAchatBon(Utilisateur $utilisateur, string $codeBon, string $typeBon): void
    {
        // 1. Journaliser
        $this->notifier(
            $utilisateur,
            'Achat de bon',
            "Votre bon {$typeBon} (code: {$codeBon}) a été créé avec succès."
        );

        // 2. Envoyer l'email de confirmation
        try {
            $bon = $utilisateur->bons()->where('code_unique', $codeBon)->with('typeBon')->first();
            $montant        = $bon?->montant_paye ?? $bon?->typeBon?->prix ?? '—';
            $dateExpiration = $bon?->date_expiration
                ? \Carbon\Carbon::parse($bon->date_expiration)->format('d/m/Y')
                : '—';

            Mail::to($utilisateur->email)->send(new BonConfirmationMail(
                nomComplet:     $utilisateur->nom_complet,
                codeBon:        $codeBon,
                typeBon:        $typeBon,
                montant:        number_format((float) $montant, 0, ',', ' '),
                dateExpiration: $dateExpiration,
            ));

            Log::info("Email de confirmation envoyé à {$utilisateur->email} pour le bon {$codeBon}");
        } catch (\Throwable $e) {
            // Ne pas faire échouer la transaction si l'email plante
            Log::error("NotificationService::notifierAchatBon — Échec envoi email à {$utilisateur->email}: {$e->getMessage()}");
        }
    }

    /**
     * Envoyer un rappel d'expiration proche.
     */
    public function notifierExpirationProche(Utilisateur $utilisateur, string $codeBon, string $dateExpiration): void
    {
        $this->notifier(
            $utilisateur,
            'Expiration de bon',
            "Votre bon (code: {$codeBon}) expire le {$dateExpiration}. Pensez à l'utiliser avant cette date."
        );

        // Email de rappel (optionnel — à étendre avec un autre Mailable si besoin)
        try {
            Mail::to($utilisateur->email)
                ->send(new \Illuminate\Mail\Message());
        } catch (\Throwable $e) {
            Log::warning("NotificationService::notifierExpirationProche — {$e->getMessage()}");
        }
    }
}
