<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bon;
use App\Models\TypeBon;
use App\Models\Utilisateur;
use App\Services\BonService;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BonController extends Controller
{
    protected BonService $bonService;
    protected AuditService $auditService;

    public function __construct(BonService $bonService, AuditService $auditService)
    {
        $this->bonService = $bonService;
        $this->auditService = $auditService;
    }

    public function index(Request $request)
    {
        $query = Bon::with(['utilisateur', 'typeBon',])
            ->orderBy('created_at', 'desc');

        if ($request->has('statut'))        { $query->where('statut',         $request->statut); }
        if ($request->has('type_bon_id'))   { $query->where('type_bon_id',    $request->type_bon_id); }
        if ($request->has('utilisateur_id')){ $query->where('utilisateur_id', $request->utilisateur_id); }

        $bons = $query->paginate($request->get('per_page', 50));

        return response()->json(['success' => true, 'data' => $bons]);
    }

    public function show(Bon $bon)
    {
        return response()->json([
            'success' => true,
            'data'    => $bon->load(['utilisateur', 'typeBon', 'transaction']),
        ]);
    }

    public function valider(Request $request)
    {
        $request->validate(['code_unique' => 'required|string']);
        $result = $this->bonService->validerBon($request->code_unique);
        $status = $result['succes'] ? 200 : 422;
        return response()->json($result, $status);
    }

    public function annuler(Bon $bon)
    {
        if (in_array($bon->statut, ['utilise', 'annule'])) {
            return response()->json([
                'success' => false,
                'message' => "Ce bon ne peut pas être annulé (statut: {$bon->statut}).",
            ], 422);
        }
        $bon->update(['statut' => 'annule']);
        $this->auditService->log('bon_annule', 'Bon', $bon->id, "Bon {$bon->code_unique} annule");
        return response()->json(['success' => true, 'message' => 'Bon annulé.', 'data' => $bon]);
    }

    /**
     * Prolonger la date d'expiration d'un bon.
     * PUT /admin/bons/{bon}/prolonger
     */
    public function prolonger(Request $request, Bon $bon)
    {
        $data = $request->validate([
            'jours' => 'required|integer|min:1|max:365',
        ]);

        if (in_array($bon->statut, ['utilise', 'annule'])) {
            return response()->json([
                'success' => false,
                'message' => "Impossible de prolonger un bon {$bon->statut}.",
            ], 422);
        }

        // Prolonger depuis la date d'expiration actuelle OU depuis aujourd'hui si déjà expiré
        $base = Carbon::parse($bon->date_expiration)->isPast()
            ? Carbon::today()
            : Carbon::parse($bon->date_expiration);

        $nouvelleExpiration = $base->addDays($data['jours']);

        $bon->update([
            'date_expiration' => $nouvelleExpiration->toDateString(),
            'statut'          => 'valide', // réactiver un bon expiré si prolongé
        ]);
        $this->auditService->log(
            'bon_prolonge',
            'Bon',
            $bon->id,
            "Bon {$bon->code_unique} prolonge de {$data['jours']} jour(s)"
        );

        return response()->json([
            'success'          => true,
            'message'          => "Bon prolongé de {$data['jours']} jour(s). Nouvelle expiration : {$nouvelleExpiration->format('d/m/Y')}.",
            'data'             => $bon->fresh(['typeBon', 'utilisateur']),
        ]);
    }

    /**
     * Générer un bon directement pour un patient (sans paiement mobile).
     * Cas d'usage : prise en charge, correction, don.
     * POST /admin/bons/generer-direct
     */
    public function genererDirect(Request $request)
    {
        $data = $request->validate([
            'utilisateur_id' => 'required|exists:utilisateurs,id_utilisateur',
            'type_bon_id'    => 'required|exists:type_bons,id',
            'nb_jours'       => 'nullable|integer|min:1|max:365',
            'notes'          => 'nullable|string|max:255',
        ]);

        $patient = Utilisateur::findOrFail($data['utilisateur_id']);
        if ($patient->role !== 'patient') {
            return response()->json([
                'success' => false,
                'message' => 'Le bon doit etre genere pour un compte patient.',
            ], 422);
        }

        $typeBon  = TypeBon::findOrFail($data['type_bon_id']);
        if (!$typeBon->actif) {
            return response()->json([
                'success' => false,
                'message' => 'Ce type de bon est inactif.',
            ], 422);
        }

        if (!filled(trim((string) $typeBon->specialite))) {
            return response()->json([
                'success' => false,
                'message' => 'Ce type de bon doit avoir une spécialité avant de générer un bon.',
            ], 422);
        }

        $nbJours  = $data['nb_jours'] ?? 30;

        $bon = Bon::create([
            'utilisateur_id'  => $data['utilisateur_id'],
            'type_bon_id'     => $data['type_bon_id'],
            'code_unique'     => 'BON-' . strtoupper(Str::random(10)),
            'statut'          => 'valide',
            'date_achat'      => today()->toDateString(),
            'date_expiration' => today()->addDays($nbJours)->toDateString(),
            'genere_par_admin'=> true,
            'notes_admin'     => $data['notes'] ?? null,
        ]);

        $this->auditService->log(
            'bon_genere_direct',
            'Bon',
            $bon->id,
            "Bon {$bon->code_unique} genere en direct pour {$patient->nom_complet}"
        );

        return response()->json([
            'success' => true,
            'message' => "Bon {$bon->code_unique} généré pour le patient.",
            'data'    => $bon->load(['typeBon', 'utilisateur']),
        ], 201);
    }

    public function statistiques()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'total'      => Bon::count(),
                'valides'    => Bon::where('statut', 'valide')->count(),
                'utilises'   => Bon::where('statut', 'utilise')->count(),
                'expires'    => Bon::where('statut', 'expire')->count(),
                'annules'    => Bon::where('statut', 'annule')->count(),
                'en_attente' => Bon::where('statut', 'en_attente')->count(),
                'expirant_bientot' => Bon::where('statut', 'valide')
                    ->whereBetween('date_expiration', [today(), today()->addDays(5)])
                    ->count(),
            ],
        ]);
    }
}
