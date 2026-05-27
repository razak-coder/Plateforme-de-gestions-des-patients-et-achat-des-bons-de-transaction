<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DossierPatient;
use App\Models\RendezVous;
use App\Models\Utilisateur;
use App\Services\AuditService;
use Illuminate\Http\Request;

class DossierController extends Controller
{
    public function __construct(protected AuditService $auditService)
    {
    }

    public function index(Request $request)
    {
        $query = DossierPatient::with(['utilisateur', 'rendezVous', 'consultations'])
            ->withCount(['rendezVous', 'consultations'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('utilisateur_id')) {
            $query->where('utilisateur_id', $request->utilisateur_id);
        }
        if ($request->filled('recherche')) {
            $terme = $request->recherche;
            $query->where(function ($q) use ($terme) {
                $q->where('numero_dossier', 'like', "%{$terme}%")
                  ->orWhere('service', 'like', "%{$terme}%")
                  ->orWhereHas('utilisateur', function ($qu) use ($terme) {
                      $qu->where('nom', 'like', "%{$terme}%")
                         ->orWhere('prenom', 'like', "%{$terme}%");
                  });
            });
        }
        if ($request->filled('date_debut')) {
            $query->where('date_ouverture', '>=', $request->date_debut);
        }
        if ($request->filled('date_fin')) {
            $query->where('date_ouverture', '<=', $request->date_fin);
        }

        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'utilisateur_id' => 'required|exists:utilisateurs,id_utilisateur',
            'service'        => 'required|string|max:150',
            'antecedents'    => 'nullable|string',
            'statut'         => 'in:ouvert,ferme,archive',
            'date_ouverture' => 'nullable|date',
            'notes'          => 'nullable|string',
        ]);

        // Vérifier que l'utilisateur est bien un patient
        $utilisateur = Utilisateur::findOrFail($data['utilisateur_id']);
        if ($utilisateur->role !== 'patient') {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les patients peuvent avoir un dossier médical.',
            ], 422);
        }

        $dossierOuvertMemeService = DossierPatient::where('utilisateur_id', $data['utilisateur_id'])
            ->where('service', $data['service'])
            ->where('statut', 'ouvert')
            ->exists();

        if ($dossierOuvertMemeService) {
            return response()->json([
                'success' => false,
                'message' => 'Un dossier ouvert existe deja pour ce patient et ce service.',
            ], 422);
        }

        $dossier = DossierPatient::create($data);
        $this->auditService->log(
            'dossier_cree',
            'DossierPatient',
            $dossier->id,
            "Dossier {$dossier->numero_dossier} cree pour {$utilisateur->nom_complet}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Dossier patient créé avec succès.',
            'data'    => $dossier->load('utilisateur'),
        ], 201);
    }

    public function show(DossierPatient $dossier)
    {
        return response()->json([
            'success' => true,
            'data'    => $dossier->load([
                'utilisateur',
                'rendezVous.medecin',
                'rendezVous.bon',
                'consultations.medecin',
                'consultations.bon',
            ]),
        ]);
    }

    public function update(Request $request, DossierPatient $dossier)
    {
        $data = $request->validate([
            'service'     => 'sometimes|string|max:150',
            'antecedents' => 'nullable|string',
            'statut'      => 'sometimes|in:ouvert,ferme,archive',
            'notes'       => 'nullable|string',
        ]);

        if (($data['statut'] ?? null) === 'ferme') {
            $rdvRestants = RendezVous::where('dossier_id', $dossier->id)
                ->whereNotIn('statut', ['annule', 'termine'])
                ->count();

            if ($rdvRestants > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de fermer ce dossier: des rendez-vous sont encore en cours.',
                ], 422);
            }

            // Vérifier aussi les consultations en cours (P3)
            $consultEnCours = \App\Models\Consultation::where('dossier_id', $dossier->id)
                ->where('statut', 'en_cours')
                ->count();

            if ($consultEnCours > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de fermer ce dossier: une consultation est encore en cours. Clôturez-la d\'abord.',
                ], 422);
            }
        }

        $dossier->update($data);
        $this->auditService->log(
            'dossier_mis_a_jour',
            'DossierPatient',
            $dossier->id,
            "Mise a jour du dossier {$dossier->numero_dossier}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Dossier mis à jour.',
            'data'    => $dossier->load('utilisateur'),
        ]);
    }

    public function destroy(DossierPatient $dossier)
    {
        $dossier->update(['statut' => 'archive']);
        $this->auditService->log(
            'dossier_archive',
            'DossierPatient',
            $dossier->id,
            "Archivage du dossier {$dossier->numero_dossier}"
        );

        return response()->json(['success' => true, 'message' => 'Dossier archivé.']);
    }

    public function statistiques()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'total'   => DossierPatient::count(),
                'ouverts' => DossierPatient::where('statut', 'ouvert')->count(),
                'fermes'  => DossierPatient::where('statut', 'ferme')->count(),
                'archives'=> DossierPatient::where('statut', 'archive')->count(),
            ],
        ]);
    }
}
