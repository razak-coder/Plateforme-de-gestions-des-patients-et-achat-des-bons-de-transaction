<?php

namespace App\Http\Controllers\Medecin;

use App\Http\Controllers\Controller;
use App\Models\MedecinNotification;
use App\Models\RendezVous;
use App\Models\Utilisateur;
use Illuminate\Http\Request;

class CabinetController extends Controller
{
    /**
     * Patients ayant au moins un rendez-vous avec le praticien connecté.
     */
    public function patients(Request $request)
    {
        $medecinId = auth('api')->user()->medecin_id;

        $ids = RendezVous::query()
            ->where('medecin_id', $medecinId)
            ->distinct()
            ->pluck('utilisateur_id');

        $query = Utilisateur::query()
            ->where('role', 'patient')
            ->whereIn('id_utilisateur', $ids)
            ->orderBy('nom')
            ->orderBy('prenom');

        if ($request->filled('recherche')) {
            $t = $request->recherche;
            $query->where(function ($q) use ($t) {
                $q->where('nom', 'like', "%{$t}%")
                    ->orWhere('prenom', 'like', "%{$t}%")
                    ->orWhere('email', 'like', "%{$t}%")
                    ->orWhere('numero_patient', 'like', "%{$t}%");
            });
        }

        $patients = $request->boolean('paginate')
            ? $query->paginate($request->get('per_page', 50))
            : $query->get();

        return response()->json([
            'success' => true,
            'data'    => $patients,
        ]);
    }

    public function notifications(Request $request)
    {
        $medecinId = auth('api')->user()->medecin_id;
        $query = MedecinNotification::with(['rendezVous.utilisateur'])
            ->where('medecin_id', $medecinId)
            ->orderByDesc('created_at');

        if ($request->boolean('non_lues')) {
            $query->whereNull('lu_at');
        }

        return response()->json([
            'success' => true,
            'data'    => $query->limit(min((int) $request->get('limit', 20), 100))->get(),
        ]);
    }

    public function marquerNotificationLue(MedecinNotification $notification)
    {
        $medecinId = auth('api')->user()->medecin_id;
        if ((int) $notification->medecin_id !== (int) $medecinId) {
            return response()->json([
                'success' => false,
                'message' => 'Notification non autorisee.',
            ], 403);
        }

        if (!$notification->lu_at) {
            $notification->update(['lu_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification marquee comme lue.',
            'data'    => $notification->fresh(),
        ]);
    }

    /**
     * Retourne l'historique médical complet d'un patient pour le médecin connecté.
     * Accessible uniquement si le médecin a au moins un RDV avec ce patient.
     * GET /medecin/patients/{patient}/historique
     */
    public function patientHistorique(Utilisateur $patient)
    {
        $medecinId = auth('api')->user()->medecin_id;

        // Vérifier que ce patient est bien lié au médecin
        $estPatientDuMedecin = RendezVous::where('medecin_id', $medecinId)
            ->where('utilisateur_id', $patient->id_utilisateur)
            ->exists();

        if (!$estPatientDuMedecin) {
            return response()->json([
                'success' => false,
                'message' => 'Ce patient n\'est pas associé à votre cabinet.',
            ], 403);
        }

        if ($patient->role !== 'patient') {
            return response()->json(['success' => false, 'message' => 'Utilisateur invalide.'], 422);
        }

        $dossiers = \App\Models\DossierPatient::with([
                'consultations.medecin',
                'consultations.bon.typeBon',
                'rendezVous.medecin',
            ])
            ->where('utilisateur_id', $patient->id_utilisateur)
            ->orderBy('date_ouverture', 'desc')
            ->get();

        $dernieresConsultations = \App\Models\Consultation::with(['medecin', 'bon.typeBon'])
            ->where('utilisateur_id', $patient->id_utilisateur)
            ->orderBy('date_consultation', 'desc')
            ->limit(10)
            ->get();

        $prochainRdv = RendezVous::with('medecin')
            ->where('utilisateur_id', $patient->id_utilisateur)
            ->where('date_rdv', '>=', today())
            ->whereNotIn('statut', ['annule', 'termine'])
            ->orderBy('date_rdv')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'patient'                => $patient,
                'dossiers'               => $dossiers,
                'dernieres_consultations'=> $dernieresConsultations,
                'prochain_rdv'           => $prochainRdv,
                'stats'                  => [
                    'total_dossiers'      => $dossiers->count(),
                    'total_consultations' => \App\Models\Consultation::where('utilisateur_id', $patient->id_utilisateur)->count(),
                    'total_rdv'           => RendezVous::where('utilisateur_id', $patient->id_utilisateur)->count(),
                ],
            ],
        ]);
    }
}
