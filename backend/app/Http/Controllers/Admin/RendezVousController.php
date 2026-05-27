<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\AuthorizesMedecinAccess;
use App\Http\Controllers\Controller;
use App\Mail\RendezVousProgrammeMedecinMail;
use App\Models\Bon;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Medecin;
use App\Models\MedecinNotification;
use App\Models\RendezVous;
use App\Models\Utilisateur;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class RendezVousController extends Controller
{
    use AuthorizesMedecinAccess;

    public function __construct(protected AuditService $auditService)
    {
    }

    public function index(Request $request)
    {
        $query = RendezVous::with(['utilisateur', 'medecin', 'bon.typeBon', 'dossier', 'consultation'])
            ->orderBy('date_rdv', 'desc')
            ->orderBy('heure_rdv');

        $user = auth('api')->user();
        if ($user && $user->isMedecin()) {
            $query->where('medecin_id', $user->medecin_id);
        }

        if ($request->filled('statut'))         $query->where('statut', $request->statut);
        if ($request->filled('medecin_id') && !($user && $user->isMedecin())) {
            $query->where('medecin_id', $request->medecin_id);
        }
        if ($request->filled('utilisateur_id')) $query->where('utilisateur_id', $request->utilisateur_id);
        if ($request->filled('dossier_id'))     $query->where('dossier_id', $request->dossier_id);
        if ($request->filled('date'))           $query->whereDate('date_rdv', $request->date);
        if ($request->filled('priorite'))       $query->where('priorite', $request->priorite);
        if ($request->boolean('a_venir')) {
            $query->whereDate('date_rdv', '>=', today())
                ->whereNotIn('statut', ['annule', 'termine'])
                ->orderBy('date_rdv')
                ->orderBy('heure_rdv');
        }

        return response()->json(['success' => true, 'data' => $query->paginate($request->get('per_page', 50))]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'dossier_id'     => 'nullable|exists:dossiers_patients,id',
            'utilisateur_id' => 'required|exists:utilisateurs,id_utilisateur',
            'medecin_id'     => 'required|exists:medecins,id',
            'bon_id'         => 'required|exists:bons,id',
            'date_rdv'       => 'required|date|after_or_equal:today',
            'heure_rdv'      => 'required|date_format:H:i',
            'motif'          => 'required|string|max:255',
            'priorite'       => 'nullable|in:normale,haute,urgente',
            'notes'          => 'nullable|string',
        ]);

        $patient = Utilisateur::findOrFail($data['utilisateur_id']);
        if ($patient->role !== 'patient') {
            return response()->json([
                'success' => false,
                'message' => 'Le rendez-vous doit être lié à un patient valide.',
            ], 422);
        }

        $medecin = Medecin::findOrFail($data['medecin_id']);
        if ($medecin->statut !== 'actif') {
            return response()->json([
                'success' => false,
                'message' => 'Ce médecin est inactif et ne peut pas recevoir de rendez-vous.',
            ], 422);
        }

        // Bon obligatoire et compatible avec la consultation ciblée
        $bon = Bon::with('typeBon')->findOrFail($data['bon_id']);
        if ($bon->statut !== 'valide') {
            return response()->json([
                'success' => false,
                'message' => "Ce bon est {$bon->statut} et ne peut pas être utilisé.",
            ], 422);
        }
        if ((int) $bon->utilisateur_id !== (int) $data['utilisateur_id']) {
            return response()->json([
                'success' => false,
                'message' => 'Ce bon ne correspond pas au patient sélectionné.',
            ], 422);
        }
        if ($bon->date_expiration && Carbon::parse($bon->date_expiration)->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Ce bon est expiré et ne peut pas être utilisé.',
            ], 422);
        }
        $specialiteBon = trim((string) optional($bon->typeBon)->specialite);
        if ($specialiteBon !== '' && strcasecmp($specialiteBon, (string) $medecin->specialite) !== 0) {
            return response()->json([
                'success' => false,
                'message' => "Le bon {$bon->code_unique} est prévu pour \"{$specialiteBon}\" et ne peut pas être utilisé pour une consultation \"{$medecin->specialite}\".",
            ], 422);
        }

        // Créer un dossier si non fourni
        if (empty($data['dossier_id'])) {
            $dossier = DossierPatient::firstOrCreate(
                ['utilisateur_id' => $data['utilisateur_id'], 'statut' => 'ouvert'],
                [
                    'date_ouverture' => $data['date_rdv'],
                    'service'        => 'Médecine générale',
                    'statut'         => 'ouvert',
                ]
            );
            $data['dossier_id'] = $dossier->id;
        } else {
            $dossier = DossierPatient::findOrFail($data['dossier_id']);
            if ((int) $dossier->utilisateur_id !== (int) $data['utilisateur_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le dossier sélectionné n\'appartient pas à ce patient.',
                ], 422);
            }
            if ($dossier->statut !== 'ouvert') {
                return response()->json([
                    'success' => false,
                    'message' => 'Le dossier doit être ouvert pour planifier un rendez-vous.',
                ], 422);
            }
        }

        // Vérifier la disponibilité du médecin au créneau exact
        if (!$medecin->estDisponible($data['date_rdv'], $data['heure_rdv'])) {
            return response()->json([
                'success' => false,
                'message' => 'Le médecin n\'est pas disponible sur ce créneau.',
            ], 422);
        }

        // Éviter les doublons côté patient au même instant
        $doublonPatient = RendezVous::where('utilisateur_id', $data['utilisateur_id'])
            ->where('date_rdv', $data['date_rdv'])
            ->where('heure_rdv', $data['heure_rdv'])
            ->whereNotIn('statut', ['annule'])
            ->exists();

        if ($doublonPatient) {
            return response()->json([
                'success' => false,
                'message' => 'Ce patient a déjà un rendez-vous à cette date et heure.',
            ], 422);
        }

        $data['statut'] = 'en_attente';

        $rdv = RendezVous::create($data);
        $this->notifierMedecinNouveauRdv($rdv, $medecin, $patient);
        $this->auditService->log(
            'rendez_vous_cree',
            'RendezVous',
            $rdv->id,
            "RDV {$rdv->date_rdv} {$rdv->heure_rdv} cree pour patient {$patient->nom_complet}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous créé avec succès.',
            'data'    => $rdv->load(['utilisateur', 'medecin', 'bon.typeBon', 'dossier']),
        ], 201);
    }

    public function show(RendezVous $rendezVous)
    {
        return response()->json([
            'success' => true,
            'data'    => $rendezVous->load(['utilisateur', 'medecin', 'bon.typeBon', 'dossier', 'consultation']),
        ]);
    }

    public function update(Request $request, RendezVous $rendezVous)
    {
        $data = $request->validate([
            'medecin_id' => 'sometimes|exists:medecins,id',
            'date_rdv'  => 'sometimes|date',
            'heure_rdv' => 'sometimes|date_format:H:i',
            'motif'     => 'sometimes|string|max:255',
            'priorite'  => 'nullable|in:normale,haute,urgente',
            'statut'    => 'sometimes|in:en_attente,confirme,termine,annule',
            'notes'     => 'nullable|string',
        ]);

        $date = $data['date_rdv'] ?? $rendezVous->date_rdv?->toDateString();
        $heure = $data['heure_rdv'] ?? substr((string) $rendezVous->heure_rdv, 0, 5);

        if (($data['medecin_id'] ?? null) || array_key_exists('date_rdv', $data) || array_key_exists('heure_rdv', $data)) {
            $medecinId = $data['medecin_id'] ?? $rendezVous->medecin_id;
            $medecin = Medecin::findOrFail($medecinId);
            if (!$medecin->estDisponible($date, $heure) && !(
                (int) $medecinId === (int) $rendezVous->medecin_id
                && $date === $rendezVous->date_rdv?->toDateString()
                && $heure === substr((string) $rendezVous->heure_rdv, 0, 5)
            )) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le médecin n\'est pas disponible sur ce créneau.',
                ], 422);
            }
        }

        $rendezVous->update($data);
        $this->auditService->log(
            'rendez_vous_mis_a_jour',
            'RendezVous',
            $rendezVous->id,
            "Mise a jour du rendez-vous {$rendezVous->id}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous mis à jour.',
            'data'    => $rendezVous->fresh(['utilisateur', 'medecin']),
        ]);
    }

    public function destroy(RendezVous $rendezVous)
    {
        if ($rendezVous->statut === 'termine') {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer un rendez-vous terminé.',
            ], 422);
        }
        $rendezVous->update(['statut' => 'annule']);
        $this->auditService->log(
            'rendez_vous_annule',
            'RendezVous',
            $rendezVous->id,
            "Annulation du rendez-vous {$rendezVous->id}"
        );
        return response()->json(['success' => true, 'message' => 'Rendez-vous annulé.']);
    }

    /**
     * Changer le statut d'un RDV (appel depuis Salle d'attente).
     * PUT /admin/rendez-vous/{id}/statut
     */
    public function changerStatut(Request $request, RendezVous $rendezVous)
    {
        if ($response = $this->denyUnlessMedecinOwnsRendezVous($rendezVous)) {
            return $response;
        }

        $data = $request->validate([
            'statut' => 'required|in:en_attente,confirme,termine,annule',
        ]);

        $ancienStatut = $rendezVous->statut;

        // Passage « en consultation » : ouvrir une consultation brouillon liée au médecin du RDV uniquement
        if ($data['statut'] === 'confirme' && !$rendezVous->consultation()->exists()) {
            if (in_array($rendezVous->statut, ['annule', 'termine'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de passer en consultation pour ce rendez-vous.',
                ], 422);
            }

            $rdv = $rendezVous->load('bon');
            if ($rdv->bon_id) {
                $bon = Bon::find($rdv->bon_id);
                if (!$bon || $bon->statut !== 'valide') {
                    return response()->json([
                        'success' => false,
                        'message' => $bon
                            ? "Ce bon est {$bon->statut} et ne peut pas être utilisé pour démarrer la consultation."
                            : 'Bon introuvable.',
                    ], 422);
                }
                if ((int) $bon->utilisateur_id !== (int) $rdv->utilisateur_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Ce bon ne correspond pas au patient du rendez-vous.',
                    ], 422);
                }
                if ($bon->date_expiration && Carbon::parse($bon->date_expiration)->isPast()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Ce bon est expiré et ne peut pas être utilisé.',
                    ], 422);
                }
            }

            $rdvDate = $rdv->date_rdv?->format('Y-m-d');
            Consultation::create([
                'rendez_vous_id'    => $rdv->id,
                'dossier_id'        => $rdv->dossier_id,
                'utilisateur_id'    => $rdv->utilisateur_id,
                'medecin_id'        => $rdv->medecin_id,
                'bon_id'            => $rdv->bon_id,
                'date_consultation' => $rdvDate,
                'diagnostic'        => 'Consultation en cours',
                'traitement'        => 'À compléter avant clôture de la consultation.',
                'statut'            => 'en_cours',
            ]);
        }

        $rendezVous->update(['statut' => $data['statut']]);

        $rdvFresh = $rendezVous->fresh();
        // Clôture sans fiche consultation : marquer le bon (parcours alternatif)
        if ($data['statut'] === 'termine' && !$rdvFresh->consultation) {
            if ($rendezVous->bon_id) {
                Bon::where('id', $rendezVous->bon_id)
                    ->where('statut', 'valide')
                    ->update(['statut' => 'utilise', 'date_utilisation' => now()]);
            }
        }

        // Notifier le patient du changement de statut (M3)
        $this->notifierPatientChangementStatut($rendezVous, $ancienStatut, $data['statut']);

        $this->auditService->log(
            'rendez_vous_statut_modifie',
            'RendezVous',
            $rendezVous->id,
            "Statut RDV {$rendezVous->id}: {$ancienStatut} -> {$data['statut']}"
        );

        return response()->json([
            'success' => true,
            'message' => "Statut mis à jour : {$ancienStatut} → {$data['statut']}.",
            'data'    => $rendezVous->fresh(['utilisateur', 'medecin', 'consultation']),
        ]);
    }

    public function refuserParMedecin(Request $request, RendezVous $rendezVous)
    {
        if ($response = $this->denyUnlessMedecinOwnsRendezVous($rendezVous)) {
            return $response;
        }

        $data = $request->validate([
            'motif_refus' => 'required|string|max:500',
        ]);

        if (in_array($rendezVous->statut, ['annule', 'termine'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Ce rendez-vous est déjà clôturé.',
            ], 422);
        }

        if ($rendezVous->consultation()->where('statut', 'en_cours')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de refuser : une consultation est déjà en cours pour ce rendez-vous.',
            ], 422);
        }

        $motif = trim($data['motif_refus']);
        $prefix = '[Refus medecin] ';
        $notes = trim(($rendezVous->notes ? $rendezVous->notes . PHP_EOL : '') . $prefix . $motif);
        $rendezVous->update([
            'statut' => 'annule',
            'notes'  => $notes,
        ]);

        $this->auditService->log(
            'rendez_vous_refuse_par_medecin',
            'RendezVous',
            $rendezVous->id,
            "RDV {$rendezVous->id} refuse par le medecin avec motif: {$motif}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous refusé et annulé.',
            'data'    => $rendezVous->fresh(['utilisateur', 'medecin']),
        ]);
    }

    /**
     * Notifie le médecin d'un nouveau RDV programmé.
     */
    private function notifierMedecinNouveauRdv(RendezVous $rdv, Medecin $medecin, Utilisateur $patient): void
    {
        MedecinNotification::create([
            'medecin_id'    => $medecin->id,
            'rendez_vous_id'=> $rdv->id,
            'type'          => 'rdv_programme',
            'titre'         => 'Nouveau rendez-vous programmé',
            'message'       => "Patient {$patient->nom_complet} le {$rdv->date_rdv?->format('d/m/Y')} à " . substr((string) $rdv->heure_rdv, 0, 5),
        ]);

        if (!$medecin->email) {
            return;
        }

        try {
            Mail::to($medecin->email)->send(new RendezVousProgrammeMedecinMail(
                $rdv->loadMissing(['utilisateur', 'medecin'])
            ));
        } catch (\Throwable $e) {
            // Ne pas bloquer la création du RDV si l'email échoue.
            report($e);
        }
    }

    /**
     * Notifie le patient d'un changement de statut de son rendez-vous (M3).
     * Crée une entrée dans le journal avec l'ID du patient comme utilisateur.
     */
    private function notifierPatientChangementStatut(RendezVous $rdv, string $ancienStatut, string $nouveauStatut): void
    {
        $messages = [
            'confirme' => 'Votre rendez-vous a été confirmé. Présentez-vous à l\'heure prévue.',
            'annule'   => 'Votre rendez-vous a été annulé. Contactez-nous pour reprogrammer.',
            'termine'  => 'Votre consultation est terminée. Consultez votre dossier médical.',
        ];

        if (!isset($messages[$nouveauStatut]) || $ancienStatut === $nouveauStatut) {
            return;
        }

        $dateHeure = $rdv->date_rdv?->format('d/m/Y') . ' à ' . substr((string) $rdv->heure_rdv, 0, 5);

        // Créer une entrée journal pour le patient (action spécifique lisible)
        \App\Models\Journal::create([
            'id_utilisateur' => $rdv->utilisateur_id,
            'action'         => "rendez_vous_{$nouveauStatut}",
            'modele'         => 'RendezVous',
            'modele_id'      => $rdv->id,
            'description'    => "RDV du {$dateHeure} — " . $messages[$nouveauStatut],
            'ip_adresse'     => request()?->ip(),
        ]);
    }

    /**
     * RDV du jour — GET /admin/rendez-vous/aujourd-hui
     */
    public function rdvDuJour(Request $request)
    {
        $query = RendezVous::with(['utilisateur', 'medecin', 'bon.typeBon', 'consultation'])
            ->whereDate('date_rdv', today())
            ->orderBy('heure_rdv');

        if ($request->filled('medecin_id')) $query->where('medecin_id', $request->medecin_id);
        if ($request->filled('statut'))     $query->where('statut', $request->statut);

        $rdvs = $query->get();

        return response()->json([
            'success' => true,
            'data'    => $rdvs,
            'stats'   => [
                'total'      => $rdvs->count(),
                'en_attente' => $rdvs->where('statut', 'en_attente')->count(),
                'confirme'   => $rdvs->where('statut', 'confirme')->count(),
                'termine'    => $rdvs->where('statut', 'termine')->count(),
                'annule'     => $rdvs->where('statut', 'annule')->count(),
            ],
        ]);
    }

    /**
     * Statistiques globales des RDV.
     */
    public function statistiques()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'total'           => RendezVous::count(),
                'aujourd_hui'     => RendezVous::whereDate('date_rdv', today())->count(),
                'en_attente'      => RendezVous::where('statut', 'en_attente')->count(),
                'confirme'        => RendezVous::where('statut', 'confirme')->count(),
                'termine'         => RendezVous::where('statut', 'termine')->count(),
                'annule'          => RendezVous::where('statut', 'annule')->count(),
                'cette_semaine'   => RendezVous::whereBetween('date_rdv', [now()->startOfWeek(), now()->endOfWeek()])->count(),
                'ce_mois'         => RendezVous::whereMonth('date_rdv', now()->month)->count(),
            ],
        ]);
    }
}
