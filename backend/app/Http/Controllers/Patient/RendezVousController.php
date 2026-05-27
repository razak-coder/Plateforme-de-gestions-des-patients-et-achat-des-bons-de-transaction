<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\Bon;
use App\Models\DossierPatient;
use App\Models\Medecin;
use App\Models\RendezVous;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Permet au patient de prendre et annuler ses propres rendez-vous (A2).
 */
class RendezVousController extends Controller
{
    /**
     * Liste des médecins actifs disponibles pour prise de RDV.
     * GET /patient/medecins-disponibles
     */
    public function medecinsDisponibles(Request $request)
    {
        $query = Medecin::with('disponibilites')
            ->actif()
            ->withCount('rendezVous');

        if ($request->filled('specialite')) {
            $query->where('specialite', $request->specialite);
        }

        if ($request->filled('recherche')) {
            $terme = $request->recherche;
            $query->where(function ($q) use ($terme) {
                $q->where('nom', 'like', "%{$terme}%")
                  ->orWhere('prenom', 'like', "%{$terme}%")
                  ->orWhere('specialite', 'like', "%{$terme}%");
            });
        }

        $medecins    = $query->orderBy('nom')->get();
        $specialites = Medecin::actif()->distinct()->pluck('specialite')->sort()->values();

        return response()->json([
            'success'     => true,
            'data'        => $medecins,
            'specialites' => $specialites,
        ]);
    }

    /**
     * Créneaux disponibles d'un médecin pour une date donnée.
     * GET /patient/medecins/{medecin}/creneaux?date=YYYY-MM-DD
     */
    public function creneaux(Request $request, Medecin $medecin)
    {
        $request->validate(['date' => 'required|date|after_or_equal:today']);

        if ($medecin->statut !== 'actif') {
            return response()->json([
                'success' => false,
                'message' => 'Ce médecin n\'est plus disponible.',
            ], 422);
        }

        $date = $request->date;
        $jours = [
            1 => 'lundi', 2 => 'mardi', 3 => 'mercredi',
            4 => 'jeudi', 5 => 'vendredi', 6 => 'samedi', 7 => 'dimanche',
        ];
        $jourSemaine = $jours[(int) date('N', strtotime($date))];

        $plages = $medecin->disponibilites()
            ->where('jour_semaine', $jourSemaine)
            ->where('actif', true)
            ->get();

        $rdvPris = RendezVous::where('medecin_id', $medecin->id)
            ->where('date_rdv', $date)
            ->whereNotIn('statut', ['annule'])
            ->pluck('heure_rdv')
            ->map(fn($h) => substr($h, 0, 5))
            ->toArray();

        $creneaux = [];
        foreach ($plages as $plage) {
            $dureeMinutes = $plage->duree_minutes ?? 30;
            $debut = strtotime($plage->heure_debut);
            $fin   = strtotime($plage->heure_fin);
            while ($debut < $fin) {
                $heure = date('H:i', $debut);
                $creneaux[] = [
                    'heure'      => $heure,
                    'disponible' => !in_array($heure, $rdvPris),
                ];
                $debut += $dureeMinutes * 60;
            }
        }

        return response()->json([
            'success'  => true,
            'date'     => $date,
            'medecin'  => $medecin->nom_complet,
            'creneaux' => $creneaux,
        ]);
    }

    /**
     * Créer un rendez-vous pour le patient connecté.
     * POST /patient/rendez-vous
     */
    public function store(Request $request)
    {
        $userId = auth('api')->id();

        $data = $request->validate([
            'medecin_id' => 'required|exists:medecins,id',
            'bon_id'     => 'required|exists:bons,id',
            'date_rdv'   => 'required|date|after_or_equal:today',
            'heure_rdv'  => 'required|date_format:H:i',
            'motif'      => 'required|string|max:255',
            'priorite'   => 'nullable|in:normale,haute,urgente',
        ]);

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
        if ((int) $bon->utilisateur_id !== (int) $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Ce bon ne vous appartient pas.',
            ], 422);
        }
        if ($bon->date_expiration && Carbon::parse($bon->date_expiration)->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Ce bon est expiré.',
            ], 422);
        }
        $specialiteBon = trim((string) optional($bon->typeBon)->specialite);
        if ($specialiteBon !== '' && strcasecmp($specialiteBon, (string) $medecin->specialite) !== 0) {
            return response()->json([
                'success' => false,
                'message' => "Votre bon {$bon->code_unique} est prévu pour \"{$specialiteBon}\" et ne correspond pas à la consultation \"{$medecin->specialite}\".",
            ], 422);
        }

        // Vérifier la disponibilité du médecin
        if (!$medecin->estDisponible($data['date_rdv'], $data['heure_rdv'])) {
            return response()->json([
                'success' => false,
                'message' => 'Le médecin n\'est pas disponible sur ce créneau.',
            ], 422);
        }

        // Anti-doublon patient
        $doublon = RendezVous::where('utilisateur_id', $userId)
            ->where('date_rdv', $data['date_rdv'])
            ->where('heure_rdv', $data['heure_rdv'])
            ->whereNotIn('statut', ['annule'])
            ->exists();

        if ($doublon) {
            return response()->json([
                'success' => false,
                'message' => 'Vous avez déjà un rendez-vous à cette date et heure.',
            ], 422);
        }

        // Trouver ou créer le dossier patient
        $dossier = DossierPatient::firstOrCreate(
            ['utilisateur_id' => $userId, 'statut' => 'ouvert'],
            [
                'date_ouverture' => $data['date_rdv'],
                'service'        => $medecin->specialite ?? 'Médecine générale',
                'statut'         => 'ouvert',
            ]
        );

        $rdv = RendezVous::create([
            'dossier_id'     => $dossier->id,
            'utilisateur_id' => $userId,
            'medecin_id'     => $data['medecin_id'],
            'bon_id'         => $data['bon_id'] ?? null,
            'date_rdv'       => $data['date_rdv'],
            'heure_rdv'      => $data['heure_rdv'],
            'motif'          => $data['motif'],
            'priorite'       => $data['priorite'] ?? 'normale',
            'statut'         => 'en_attente',
        ]);

        // Notifier le médecin
        \App\Models\MedecinNotification::create([
            'medecin_id'     => $medecin->id,
            'rendez_vous_id' => $rdv->id,
            'type'           => 'rdv_programme',
            'titre'          => 'Nouvelle demande de rendez-vous',
            'message'        => "Demande de rendez-vous le {$rdv->date_rdv?->format('d/m/Y')} à " . substr((string) $rdv->heure_rdv, 0, 5) . " · Motif : {$rdv->motif}",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Votre rendez-vous a été soumis. En attente de confirmation.',
            'data'    => $rdv->load(['medecin', 'dossier', 'bon.typeBon']),
        ], 201);
    }

    /**
     * Annuler un rendez-vous du patient connecté.
     * PUT /patient/rendez-vous/{rendezVous}/annuler
     */
    public function annuler(RendezVous $rendezVous)
    {
        $userId = auth('api')->id();

        if ((int) $rendezVous->utilisateur_id !== (int) $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Ce rendez-vous ne vous appartient pas.',
            ], 403);
        }

        if (in_array($rendezVous->statut, ['annule', 'termine'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Ce rendez-vous est déjà clôturé.',
            ], 422);
        }

        // Interdire l'annulation si la consultation est déjà en cours
        if ($rendezVous->consultation()->where('statut', 'en_cours')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Votre consultation est déjà en cours, vous ne pouvez plus l\'annuler.',
            ], 422);
        }

        // Interdire si le RDV est dans moins de 2 heures
        $dateRdv  = Carbon::parse($rendezVous->date_rdv->toDateString() . ' ' . substr((string) $rendezVous->heure_rdv, 0, 5));
        if ($dateRdv->diffInHours(now(), false) > -2) {
            return response()->json([
                'success' => false,
                'message' => 'L\'annulation n\'est plus possible moins de 2 heures avant le rendez-vous.',
            ], 422);
        }

        $rendezVous->update(['statut' => 'annule']);

        return response()->json([
            'success' => true,
            'message' => 'Rendez-vous annulé avec succès.',
            'data'    => $rendezVous->fresh(['medecin']),
        ]);
    }
}
