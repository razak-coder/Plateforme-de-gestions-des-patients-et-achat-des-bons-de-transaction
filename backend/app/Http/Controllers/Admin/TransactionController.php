<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaction::with(['utilisateur', 'bon.typeBon'])
            ->orderBy('created_at', 'desc');

        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }

        if ($request->has('methode_paiement')) {
            $query->where('methode_paiement', $request->methode_paiement);
        }

        if ($request->has('date_debut')) {
            $query->whereDate('created_at', '>=', $request->date_debut);
        }

        if ($request->has('date_fin')) {
            $query->whereDate('created_at', '<=', $request->date_fin);
        }

        $transactions = $query->paginate(20);

        return response()->json(['success' => true, 'data' => $transactions]);
    }

    public function show(Transaction $transaction)
    {
        return response()->json([
            'success' => true,
            'data'    => $transaction->load(['utilisateur', 'bon.typeBon']),
        ]);
    }

    public function statistiques()
    {
        $stats = [
            'montant_total'    => Transaction::where('statut', 'confirmee')->sum('montant'),
            'total'            => Transaction::count(),
            'reussies'         => Transaction::where('statut', 'confirmee')->count(),
            'echouees'         => Transaction::where('statut', 'echouee')->count(),
            'en_attente'       => Transaction::where('statut', 'en_attente')->count(),
            'par_methode'      => Transaction::where('statut', 'confirmee')
                                    ->selectRaw('methode_paiement, COUNT(*) as total, SUM(montant) as montant')
                                    ->groupBy('methode_paiement')
                                    ->get(),
        ];

        return response()->json(['success' => true, 'data' => $stats]);
    }

}
