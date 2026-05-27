<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Bon;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Journal;
use App\Models\RendezVous;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PatientDossierController extends Controller
{
    /**
     * Retourne le dossier médical complet du patient connecté.
     * Inclut tous les dossiers, RDV et consultations.
     */
    public function mesDossiers()
    {
        $userId = auth('api')->id();

        $dossiers = DossierPatient::with([
            'rendezVous.medecin',
            'rendezVous.bon.typeBon',
            'consultations.medecin',
            'consultations.bon.typeBon',
        ])
        ->where('utilisateur_id', $userId)
        ->orderBy('date_ouverture', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'data'    => $dossiers,
        ]);
    }

    /**
     * Retourne tous les rendez-vous du patient (passés et à venir).
     * Paramètre optionnel ?a_venir=1 pour ne retourner que les futurs.
     */
    public function mesRendezVous(Request $request)
    {
        $userId = auth('api')->id();

        $query = RendezVous::with(['medecin', 'dossier', 'bon.typeBon'])
            ->where('utilisateur_id', $userId);

        // Filtre optionnel : seulement les RDV à venir
        if ($request->boolean('a_venir')) {
            $query->where('date_rdv', '>=', today())
                  ->whereNotIn('statut', ['annule', 'termine']);
        }

        // Filtre optionnel : seulement passés
        if ($request->boolean('passes')) {
            $query->where('date_rdv', '<', today());
        }

        $rdvs = $query->orderBy('date_rdv', 'desc')
            ->orderBy('heure_rdv', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $rdvs,
        ]);
    }

    /**
     * Retourne toutes les consultations du patient.
     */
    public function mesConsultations()
    {
        $userId = auth('api')->id();

        $consultations = Consultation::with(['medecin', 'dossier', 'bon.typeBon'])
            ->where('utilisateur_id', $userId)
            ->orderBy('date_consultation', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $consultations,
        ]);
    }

    /**
     * Tableau de bord complet du patient : stats + prochains RDV + dernières consultations.
     */
    public function tableauBord()
    {
        $userId = auth('api')->id();

        $totalDossiers     = DossierPatient::where('utilisateur_id', $userId)->count();
        $dossierActif      = DossierPatient::where('utilisateur_id', $userId)->where('statut', 'ouvert')->first();
        $prochainRdv       = RendezVous::with(['medecin'])
            ->where('utilisateur_id', $userId)
            ->where('date_rdv', '>=', today())
            ->whereNotIn('statut', ['annule', 'termine'])
            ->orderBy('date_rdv')->orderBy('heure_rdv')
            ->first();
        $totalConsultations = Consultation::where('utilisateur_id', $userId)->count();
        $totalBons          = Bon::where('utilisateur_id', $userId)->count();
        $bonsValides        = Bon::where('utilisateur_id', $userId)->where('statut', 'valide')->count();
        $totalDepense       = Transaction::where('utilisateur_id', $userId)
            ->where('statut', 'confirmee')->sum('montant');

        // Bons expirant dans les 7 prochains jours (A4)
        $bonsExpirantBientot = Bon::where('utilisateur_id', $userId)
            ->where('statut', 'valide')
            ->whereBetween('date_expiration', [today(), today()->addDays(7)])
            ->with('typeBon')
            ->get();

        // Dernières consultations
        $dernieresConsultations = Consultation::with(['medecin'])
            ->where('utilisateur_id', $userId)
            ->orderBy('date_consultation', 'desc')
            ->limit(3)->get();

        // Prochains RDV (5 prochains)
        $prochainsRdv = RendezVous::with(['medecin'])
            ->where('utilisateur_id', $userId)
            ->where('date_rdv', '>=', today())
            ->whereNotIn('statut', ['annule'])
            ->orderBy('date_rdv')->orderBy('heure_rdv')
            ->limit(5)->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'total_dossiers'          => $totalDossiers,
                'dossier_actif'           => $dossierActif,
                'prochain_rdv'            => $prochainRdv,
                'total_consultations'     => $totalConsultations,
                'total_bons'              => $totalBons,
                'bons_valides'            => $bonsValides,
                'total_depense'           => (float) $totalDepense,
                'bons_expirant_bientot'   => $bonsExpirantBientot,
                'dernieres_consultations' => $dernieresConsultations,
                'prochains_rdv'           => $prochainsRdv,
            ],
        ]);
    }

    /**
     * Timeline clinique et financière du patient.
     */
    public function chronologie()
    {
        $userId = auth('api')->id();

        $dossiers = DossierPatient::where('utilisateur_id', $userId)
            ->get()
            ->map(function ($dossier) {
                return [
                    'type'        => 'dossier',
                    'date'        => optional($dossier->date_ouverture)->toDateString(),
                    'titre'       => 'Ouverture/MAJ du dossier',
                    'description' => "{$dossier->numero_dossier} - {$dossier->service}",
                    'statut'      => $dossier->statut,
                    'meta'        => [
                        'dossier_id' => $dossier->id,
                    ],
                ];
            });

        $rdvs = RendezVous::with('medecin')
            ->where('utilisateur_id', $userId)
            ->get()
            ->map(function ($rdv) {
                return [
                    'type'        => 'rendez_vous',
                    'date'        => optional($rdv->date_rdv)->toDateString(),
                    'heure'       => substr((string) $rdv->heure_rdv, 0, 5),
                    'titre'       => 'Rendez-vous médical',
                    'description' => ($rdv->medecin->nom_complet ?? 'Médecin') . " - {$rdv->motif}",
                    'statut'      => $rdv->statut,
                    'meta'        => [
                        'rdv_id'      => $rdv->id,
                        'medecin_id'  => $rdv->medecin_id,
                        'dossier_id'  => $rdv->dossier_id,
                        'priorite'    => $rdv->priorite,
                    ],
                ];
            });

        $consultations = Consultation::with('medecin')
            ->where('utilisateur_id', $userId)
            ->get()
            ->map(function ($consultation) {
                return [
                    'type'        => 'consultation',
                    'date'        => optional($consultation->date_consultation)->toDateString(),
                    'titre'       => 'Consultation réalisée',
                    'description' => ($consultation->medecin->nom_complet ?? 'Médecin') . " - {$consultation->diagnostic}",
                    'statut'      => $consultation->statut,
                    'meta'        => [
                        'consultation_id' => $consultation->id,
                        'dossier_id'      => $consultation->dossier_id,
                    ],
                ];
            });

        $bons = Bon::with('typeBon')
            ->where('utilisateur_id', $userId)
            ->get()
            ->map(function ($bon) {
                return [
                    'type'        => 'bon',
                    'date'        => optional($bon->date_achat)->toDateString(),
                    'titre'       => 'Bon de consultation',
                    'description' => "{$bon->code_unique} - {$bon->typeBon->nom}",
                    'statut'      => $bon->statut,
                    'meta'        => [
                        'bon_id'          => $bon->id,
                        'date_expiration' => optional($bon->date_expiration)->toDateString(),
                    ],
                ];
            });

        $paiements = Transaction::where('utilisateur_id', $userId)
            ->get()
            ->map(function ($transaction) {
                return [
                    'type'        => 'paiement',
                    'date'        => optional($transaction->created_at)->toDateString(),
                    'titre'       => 'Paiement',
                    'description' => "Paiement {$transaction->methode_paiement} - {$transaction->montant} FCFA",
                    'statut'      => $transaction->statut,
                    'meta'        => [
                        'transaction_id' => $transaction->id,
                        'bon_id'         => $transaction->bon_id,
                    ],
                ];
            });

        $timeline = collect()
            ->merge($dossiers)
            ->merge($rdvs)
            ->merge($consultations)
            ->merge($bons)
            ->merge($paiements)
            ->filter(fn ($event) => !empty($event['date']))
            ->sortByDesc(fn ($event) => ($event['date'] ?? '') . ' ' . ($event['heure'] ?? '00:00'))
            ->values();

        return response()->json([
            'success' => true,
            'data'    => $timeline,
        ]);
    }

    /**
     * Notifications du patient : changements de statut de ses rendez-vous.
     * Basé sur la table journals avec actions liées à l'utilisateur.
     * GET /patient/notifications
     */
    public function mesNotifications(Request $request)
    {
        $userId = auth('api')->id();

        // Récupérer les journaux liés à cet utilisateur (changements de statut RDV)
        $journaux = Journal::where('id_utilisateur', $userId)
            ->whereIn('action', [
                'rendez_vous_confirme',
                'rendez_vous_annule',
                'rendez_vous_refuse_par_medecin',
                'rendez_vous_cree',
                'consultation_terminee',
            ])
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        // Compter les notifications non lues (créées depuis 7 jours)
        $nonLues = $journaux->where('created_at', '>=', now()->subDays(7))->count();

        return response()->json([
            'success'  => true,
            'data'     => $journaux,
            'non_lues' => $nonLues,
        ]);
    }
}
