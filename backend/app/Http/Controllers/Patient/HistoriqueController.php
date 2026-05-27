<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Bon;
use App\Models\Transaction;
use Carbon\Carbon;

class HistoriqueController extends Controller
{
    public function index()
    {
        $transactions = Transaction::with('bon.typeBon')
            ->where('utilisateur_id', auth('api')->id())
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $transactions]);
    }

    public function statistiques()
    {
        $userId = auth('api')->id();

        return response()->json([
            'success' => true,
            'data'    => [
                // Champs attendus par le Dashboard patient (Dashboard.js)
                'total_bons'      => Bon::where('utilisateur_id', $userId)->count(),
                'bons_valides'    => Bon::where('utilisateur_id', $userId)->where('statut', 'valide')->count(),
                'bons_en_attente' => Bon::where('utilisateur_id', $userId)->where('statut', 'en_attente')->count(),
                'bons_expires'    => Bon::where('utilisateur_id', $userId)->where('statut', 'expire')->count(),

                // Données supplémentaires (transactions)
                'total_depense'      => Transaction::where('utilisateur_id', $userId)
                                            ->where('statut', 'confirmee')
                                            ->sum('montant'),
                'total_transactions' => Transaction::where('utilisateur_id', $userId)->count(),
                'reussies'           => Transaction::where('utilisateur_id', $userId)
                                            ->where('statut', 'confirmee')->count(),

                // Graphique : bons achetés par mois (6 derniers mois)
                'bons_par_mois' => collect(range(5, 0))->map(function ($i) use ($userId) {
                    $month = now()->subMonths($i);
                    return [
                        'name'  => $month->translatedFormat('M'),
                        'bons'  => Bon::where('utilisateur_id', $userId)
                                      ->whereMonth('created_at', $month->month)
                                      ->whereYear('created_at', $month->year)
                                      ->count(),
                    ];
                })->values(),
            ],
        ]);
    }
}
