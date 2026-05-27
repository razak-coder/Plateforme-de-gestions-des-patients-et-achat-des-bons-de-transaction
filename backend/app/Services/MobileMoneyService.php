<?php

namespace App\Services;

use App\Models\Transaction;
use Illuminate\Support\Str;

class MobileMoneyService
{
    /**
     * Simule un paiement Mobile Money.
     * Retourne true (succès) ou false (échec) aléatoirement avec un délai simulé.
     */
    public function initierPaiement(array $data): array
    {
        // Simulation : 90% de chance de succès
        $succes = rand(1, 10) > 1;
        $reference = 'MM-' . strtoupper(Str::random(10));

        return [
            'succes'    => $succes,
            'reference' => $reference,
            'statut'    => $succes ? 'confirmee' : 'echouee',
            'message'   => $succes
                ? 'Paiement Mobile Money effectué avec succès.'
                : 'Échec du paiement Mobile Money. Veuillez réessayer.',
            'numero'    => $data['numero_telephone'] ?? null,
            'montant'   => $data['montant'],
        ];
    }

    public function verifierPaiement(string $reference): array
    {
        // Simulation : vérification de statut
        $transaction = Transaction::where('reference', $reference)->first();

        if (!$transaction) {
            return ['succes' => false, 'message' => 'Transaction introuvable.'];
        }

        return [
            'succes'  => $transaction->statut === 'confirmee',
            'statut'  => $transaction->statut,
            'montant' => $transaction->montant,
        ];
    }
}
