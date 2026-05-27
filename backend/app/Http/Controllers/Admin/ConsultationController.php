<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\AuthorizesMedecinAccess;
use App\Http\Controllers\Controller;
use App\Models\Bon;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\RendezVous;
use App\Models\Utilisateur;
use App\Services\AuditService;
use Illuminate\Http\Request;

class ConsultationController extends Controller
{
    use AuthorizesMedecinAccess;

    public function __construct(protected AuditService $auditService)
    {
    }

    public function index(Request $request)
    {
        $query = Consultation::with(['utilisateur', 'medecin', 'dossier', 'bon.typeBon', 'rendezVous'])
            ->orderBy('date_consultation', 'desc');

        $user = auth('api')->user();
        if ($user && $user->isMedecin()) {
            $query->where('medecin_id', $user->medecin_id);
        }

        if ($request->filled('statut'))       $query->where('statut', $request->statut);
        if ($request->filled('medecin_id') && !($user && $user->isMedecin())) {
            $query->where('medecin_id', $request->medecin_id);
        }
        if ($request->filled('dossier_id'))   $query->where('dossier_id', $request->dossier_id);
        if ($request->filled('date'))         $query->whereDate('date_consultation', $request->date);

        return response()->json([
            'success' => true,
            'data'    => $query->paginate(min((int) $request->get('per_page', 20), 200)),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth('api')->user();
        if (!$user || !$user->isMedecin()) {
            return response()->json([
                'success' => false,
                'message' => 'La creation de consultation est reservee au medecin attribue.',
            ], 403);
        }

        $data = $request->validate([
            'rendez_vous_id'   => 'required|exists:rendez_vous,id',
            'dossier_id'       => 'required|exists:dossiers_patients,id',
            'utilisateur_id'   => 'required|exists:utilisateurs,id_utilisateur',
            'bon_id'           => 'nullable|exists:bons,id',
            'date_consultation'=> 'required|date',
            'diagnostic'       => 'required|string',
            'traitement'       => 'required|string',
            'orientation'      => 'nullable|string|max:255',
            'notes'            => 'nullable|string',
        ]);

        $patient = Utilisateur::findOrFail($data['utilisateur_id']);
        if ($patient->role !== 'patient') {
            return response()->json([
                'success' => false,
                'message' => 'La consultation doit etre rattachee a un patient valide.',
            ], 422);
        }

        $dossier = DossierPatient::findOrFail($data['dossier_id']);
        if ((int) $dossier->utilisateur_id !== (int) $data['utilisateur_id']) {
            return response()->json([
                'success' => false,
                'message' => 'Le dossier selectionne n appartient pas a ce patient.',
            ], 422);
        }

        $rdv = RendezVous::with('medecin')->findOrFail($data['rendez_vous_id']);

        if ($response = $this->denyUnlessMedecinOwnsRendezVous($rdv)) {
            return $response;
        }

        if ((int) $rdv->utilisateur_id !== (int) $data['utilisateur_id'] || (int) $rdv->dossier_id !== (int) $data['dossier_id']) {
            return response()->json([
                'success' => false,
                'message' => 'Le rendez-vous ne correspond pas au patient ou au dossier indique.',
            ], 422);
        }

        if (in_array($rdv->statut, ['annule', 'termine'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de creer une consultation pour un rendez-vous annule ou deja termine.',
            ], 422);
        }

        if (Consultation::where('rendez_vous_id', $rdv->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Une consultation existe deja pour ce rendez-vous.',
            ], 422);
        }

        // Le médecin de la consultation est toujours celui attribué sur le rendez-vous
        $data['medecin_id'] = $rdv->medecin_id;

        $rdvDate = $rdv->date_rdv?->format('Y-m-d');
        if ($rdvDate && $data['date_consultation'] !== $rdvDate) {
            return response()->json([
                'success' => false,
                'message' => 'La date de consultation doit correspondre a la date du rendez-vous (' . $rdvDate . ').',
            ], 422);
        }

        // Bon : aligné sur le RDV si un bon y est lié
        if ($rdv->bon_id) {
            if (!empty($data['bon_id']) && (int) $data['bon_id'] !== (int) $rdv->bon_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le bon doit etre le meme que celui du rendez-vous.',
                ], 422);
            }
            $data['bon_id'] = $rdv->bon_id;
        }

        // Valider le bon si fourni
        if (!empty($data['bon_id'])) {
            $bon = Bon::findOrFail($data['bon_id']);
            if ($bon->statut !== 'valide') {
                return response()->json([
                    'success' => false,
                    'message' => "Ce bon est {$bon->statut} et ne peut pas être utilisé.",
                ], 422);
            }
            if ((int) $bon->utilisateur_id !== (int) $data['utilisateur_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce bon ne correspond pas au patient selectionne.',
                ], 422);
            }
        }

        $consultation = Consultation::create($data);
        $this->auditService->log(
            'consultation_creee',
            'Consultation',
            $consultation->id,
            "Consultation du patient {$patient->nom_complet}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Consultation créée.',
            'data'    => $consultation->load(['utilisateur', 'medecin', 'dossier']),
        ], 201);
    }

    public function show(Consultation $consultation)
    {
        if ($response = $this->denyUnlessMedecinOwnsConsultation($consultation)) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data'    => $consultation->load(['utilisateur', 'medecin', 'dossier', 'bon.typeBon', 'rendezVous']),
        ]);
    }

    public function update(Request $request, Consultation $consultation)
    {
        $user = auth('api')->user();
        if (!$user || !$user->isMedecin()) {
            return response()->json([
                'success' => false,
                'message' => 'La mise a jour de consultation est reservee au medecin attribue.',
            ], 403);
        }

        if ($response = $this->denyUnlessMedecinOwnsConsultation($consultation)) {
            return $response;
        }

        $data = $request->validate([
            'diagnostic'  => 'sometimes|string',
            'traitement'  => 'sometimes|string',
            'orientation' => 'nullable|string|max:255',
            'notes'       => 'nullable|string',
        ]);

        $consultation->update($data);
        $this->auditService->log(
            'consultation_mise_a_jour',
            'Consultation',
            $consultation->id,
            "Mise a jour consultation {$consultation->id}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Consultation mise à jour.',
            'data'    => $consultation->fresh(),
        ]);
    }

    public function terminer(Consultation $consultation)
    {
        $user = auth('api')->user();
        if (!$user || !$user->isMedecin()) {
            return response()->json([
                'success' => false,
                'message' => 'La cloture de consultation est reservee au medecin attribue.',
            ], 403);
        }

        if ($response = $this->denyUnlessMedecinOwnsConsultation($consultation)) {
            return $response;
        }

        if ($consultation->statut === 'termine') {
            return response()->json(['success' => false, 'message' => 'Déjà terminée.'], 422);
        }

        // Bloquer la clôture si les champs contiennent encore les valeurs par défaut du brouillon
        $diagnosticsFactices = ['Consultation en cours', 'consultation en cours', ''];
        $traitementsFactices  = ['À compléter avant clôture de la consultation.', 'A completer avant cloture de la consultation.', ''];

        if (in_array(trim($consultation->diagnostic ?? ''), $diagnosticsFactices, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Le diagnostic doit être renseigné avant de clôturer la consultation. Merci de le compléter.',
            ], 422);
        }

        if (in_array(trim($consultation->traitement ?? ''), $traitementsFactices, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Le traitement prescrit doit être renseigné avant de clôturer la consultation. Merci de le compléter.',
            ], 422);
        }

        $consultation->update(['statut' => 'termine']);

        // Marquer le bon comme utilisé
        if ($consultation->bon_id) {
            $bon = Bon::find($consultation->bon_id);
            if ($bon && $bon->statut === 'valide') {
                $bon->update(['statut' => 'utilise', 'date_utilisation' => now()]);
            }
        }

        // Marquer le RDV comme terminé
        if ($consultation->rendez_vous_id) {
            RendezVous::where('id', $consultation->rendez_vous_id)
                ->update(['statut' => 'termine']);
        }

        $this->auditService->log(
            'consultation_terminee',
            'Consultation',
            $consultation->id,
            "Consultation terminee {$consultation->id}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Consultation terminée. Bon marqué comme utilisé.',
            'data'    => $consultation->load(['utilisateur', 'medecin', 'bon']),
        ]);
    }
}
