<?php

namespace App\Services;

use App\Models\Bon;
use App\Models\Transaction;
use App\Models\TypeBon;
use App\Models\Utilisateur;
use Carbon\Carbon;
use Illuminate\Support\Str;

class BonService
{
    protected MobileMoneyService $mobileMoneyService;

    public function __construct(MobileMoneyService $mobileMoneyService)
    {
        $this->mobileMoneyService = $mobileMoneyService;
    }

    public function acheterBon(Utilisateur $patient, TypeBon $typeBon, array $paiementData): array
    {
        if (!filled(trim((string) $typeBon->specialite))) {
            return [
                'succes'      => false,
                'message'     => 'Ce type de bon n\'est pas lié à une spécialité.',
                'transaction' => null,
            ];
        }

        // Initier le paiement
        $paiementData['montant'] = $typeBon->prix;
        $resultPaiement = $this->mobileMoneyService->initierPaiement($paiementData);

        // Créer la transaction
        $transaction = Transaction::create([
            'utilisateur_id'   => $patient->id_utilisateur,
            'reference'        => $resultPaiement['reference'],
            'montant'          => $typeBon->prix,
            'methode_paiement' => $paiementData['methode_paiement'],
            'statut'           => $resultPaiement['statut'],
            'numero_telephone' => $paiementData['numero_telephone'] ?? null,
            'details'          => json_encode($resultPaiement),
        ]);

        if (!$resultPaiement['succes']) {
            return [
                'succes'      => false,
                'message'     => $resultPaiement['message'],
                'transaction' => $transaction,
            ];
        }

        // Créer le bon
        $bon = Bon::create([
            'utilisateur_id'  => $patient->id_utilisateur,
            'type_bon_id'     => $typeBon->id,
            'code_unique'     => (string) Str::uuid(),
            'statut'          => 'valide',
            'date_achat'      => Carbon::now(),
            'date_expiration' => Carbon::now()->addDays($typeBon->validite_jours),
            'montant_paye'    => $typeBon->prix,
        ]);

        // Mettre à jour la transaction avec le bon_id
        $transaction->update(['bon_id' => $bon->id]);

        return [
            'succes'      => true,
            'message'     => 'Bon acheté avec succès.',
            'bon'         => $bon->load('typeBon'),
            'transaction' => $transaction,
        ];
    }

    public function validerBon(string $codeUnique): array
    {
        $bon = Bon::where('code_unique', $codeUnique)->first();

        if (!$bon) {
            return ['succes' => false, 'message' => 'Code bon invalide.'];
        }

        if ($bon->statut !== 'valide') {
            return ['succes' => false, 'message' => "Ce bon est {$bon->statut}."];
        }

        if ($bon->date_expiration->isPast()) {
            $bon->update(['statut' => 'expire']);
            return ['succes' => false, 'message' => 'Ce bon a expiré.'];
        }

        $bon->update([
            'statut'           => 'utilise',
            'date_utilisation' => now(),
        ]);

        return [
            'succes'  => true,
            'message' => 'Bon validé avec succès.',
            'bon'     => $bon->load(['utilisateur', 'typeBon']),
        ];
    }

    public function expireBonskExpires(): int
    {
        return Bon::where('statut', 'valide')
            ->where('date_expiration', '<', now())
            ->update(['statut' => 'expire']);
    }
}
