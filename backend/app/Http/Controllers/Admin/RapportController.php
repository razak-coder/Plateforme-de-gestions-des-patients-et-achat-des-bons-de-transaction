<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bon;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\Medecin;
use App\Models\Rapport;
use App\Models\RendezVous;
use App\Models\Transaction;
use App\Models\Utilisateur;
use Illuminate\Http\Request;

class RapportController extends Controller
{
    public function index()
    {
        $rapports = Rapport::with('generateurRapport')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json(['success' => true, 'data' => $rapports]);
    }

    public function generer(Request $request)
    {
        $data = $request->validate([
            'titre'      => 'required|string|max:200',
            'type'       => 'required|in:journalier,hebdomadaire,mensuel,annuel,personnalise',
            'date_debut' => 'required|date',
            'date_fin'   => 'required|date|after_or_equal:date_debut',
        ]);

        $dateDebut = $data['date_debut'];
        $dateFin   = $data['date_fin'];

        $donnees = [
            'bons' => [
                'total'    => Bon::whereBetween('date_achat', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->count(),
                'actifs'   => Bon::whereBetween('date_achat', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->where('statut', 'valide')->count(),
                'utilises' => Bon::whereBetween('date_achat', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->where('statut', 'utilise')->count(),
                'expires'  => Bon::whereBetween('date_achat', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->where('statut', 'expire')->count(),
            ],
            'transactions' => [
                'total'         => Transaction::whereBetween('created_at', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->count(),
                'montant_total' => Transaction::whereBetween('created_at', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->where('statut', 'confirmee')->sum('montant'),
                'reussies'      => Transaction::whereBetween('created_at', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->where('statut', 'confirmee')->count(),
            ],
            'utilisateurs' => [
                'nouveaux' => Utilisateur::whereBetween('created_at', [$dateDebut . ' 00:00:00', $dateFin . ' 23:59:59'])->count(),
            ],
            'consultations' => [
                'total'     => Consultation::whereBetween('date_consultation', [$dateDebut, $dateFin])->count(),
                'terminees' => Consultation::whereBetween('date_consultation', [$dateDebut, $dateFin])->where('statut', 'termine')->count(),
            ],
            'rendez_vous' => [
                'total'   => RendezVous::whereBetween('date_rdv', [$dateDebut, $dateFin])->count(),
                'honores' => RendezVous::whereBetween('date_rdv', [$dateDebut, $dateFin])->where('statut', 'termine')->count(),
                'annules' => RendezVous::whereBetween('date_rdv', [$dateDebut, $dateFin])->where('statut', 'annule')->count(),
            ],
            'periode' => ['debut' => $dateDebut, 'fin' => $dateFin],
        ];

        $rapport = Rapport::create([
            'id_utilisateur' => auth('api')->id(),
            'titre'          => $data['titre'],
            'type'           => $data['type'],
            'date_debut'     => $dateDebut,
            'date_fin'       => $dateFin,
            'donnees'        => $donnees,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rapport généré avec succès.',
            'data'    => $rapport->load('generateurRapport'),
        ], 201);
    }

    public function show(Rapport $rapport)
    {
        return response()->json(['success' => true, 'data' => $rapport->load('generateurRapport')]);
    }

    public function destroy(Rapport $rapport)
    {
        $rapport->delete();
        return response()->json(['success' => true, 'message' => 'Rapport supprimé.']);
    }

    public function tableauBord()
    {
        // Graphique mensuel
        $ventes_mensuelles = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $ventes_mensuelles[] = [
                'name'          => $month->translatedFormat('M'),
                'ventes'        => Transaction::whereMonth('created_at', $month->month)->whereYear('created_at', $month->year)->where('statut', 'confirmee')->count(),
                'revenus'       => (int) Transaction::whereMonth('created_at', $month->month)->whereYear('created_at', $month->year)->where('statut', 'confirmee')->sum('montant'),
                'consultations' => Consultation::whereMonth('date_consultation', $month->month)->whereYear('date_consultation', $month->year)->count(),
            ];
        }

        // Stats RDV du jour
        $rdvAujourdhui = RendezVous::whereDate('date_rdv', today());
        $rdvEnAttente  = (clone $rdvAujourdhui)->where('statut', 'en_attente')->count();
        $rdvConfirmes  = (clone $rdvAujourdhui)->where('statut', 'confirme')->count();
        $rdvTermines   = (clone $rdvAujourdhui)->where('statut', 'termine')->count();
        $totalRdvJour  = (clone $rdvAujourdhui)->whereNotIn('statut', ['annule'])->count();

        // Médecins actifs ayant des RDV aujourd'hui
        $medecinsDuJour = Medecin::actif()
            ->whereHas('rendezVous', fn($q) => $q->whereDate('date_rdv', today())->whereNotIn('statut', ['annule']))
            ->withCount(['rendezVous as rdv_jour' => fn($q) => $q->whereDate('date_rdv', today())->whereNotIn('statut', ['annule'])])
            ->get(['id', 'nom', 'prenom', 'specialite']);

        $bonsExpirantBientot = Bon::where('statut', 'valide')
            ->whereBetween('date_expiration', [today(), today()->addDays(3)])
            ->count();

        // Consultations par médecin ce mois (M6)
        $consultationsParMedecin = Consultation::with('medecin')
            ->whereMonth('date_consultation', now()->month)
            ->whereYear('date_consultation', now()->year)
            ->where('statut', 'termine')
            ->selectRaw('medecin_id, count(*) as total')
            ->groupBy('medecin_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'medecin' => Medecin::find($c->medecin_id, ['id', 'nom', 'prenom', 'specialite']),
                'total'   => $c->total,
            ]);

        // Taux d'honoring des RDV ce mois (M6)
        $totalRdvMois   = RendezVous::whereMonth('date_rdv', now()->month)->whereYear('date_rdv', now()->year)->count();
        $rdvHonoresMois = RendezVous::whereMonth('date_rdv', now()->month)->whereYear('date_rdv', now()->year)
            ->where('statut', 'termine')->count();
        $tauxHonoring   = $totalRdvMois > 0 ? round(($rdvHonoresMois / $totalRdvMois) * 100, 1) : 0;

        return response()->json([
            'success' => true,
            'data'    => [
                // Opérationnel du jour
                'rdv_aujourd_hui'           => $totalRdvJour,
                'rdv_en_attente'            => $rdvEnAttente,
                'rdv_confirmes'             => $rdvConfirmes,
                'rdv_termines'              => $rdvTermines,
                'consultations_jour'        => Consultation::whereDate('date_consultation', today())->count(),
                'medecins_du_jour'          => $medecinsDuJour,
                'bons_expirant_bientot'     => $bonsExpirantBientot,

                // Globaux
                'total_bons'                => Bon::count(),
                'bons_valides'              => Bon::where('statut', 'valide')->count(),
                'bons_expires'              => Bon::where('statut', 'expire')->count(),
                'bons_utilises'             => Bon::where('statut', 'utilise')->count(),
                'transactions_attente'      => Transaction::where('statut', 'en_attente')->count(),
                'total_patients'            => Utilisateur::where('role', 'patient')->count(),
                'total_dossiers'            => DossierPatient::count(),
                'montant_total'             => (int) Transaction::where('statut', 'confirmee')->sum('montant'),
                'revenus_mois'              => (int) Transaction::whereMonth('created_at', now()->month)->where('statut', 'confirmee')->sum('montant'),
                'revenus_today'             => (int) Transaction::whereDate('created_at', today())->where('statut', 'confirmee')->sum('montant'),

                // Performance médicale (M6)
                'taux_honoring'             => $tauxHonoring,
                'consultations_par_medecin' => $consultationsParMedecin,

                // Graphique
                'ventes_mensuelles'         => $ventes_mensuelles,
            ],
        ]);
    }

    /**
     * Flux temps réel du jour — GET /admin/flux-du-jour
     */
    public function fluxDuJour()
    {
        return response()->json($this->buildFluxJourPayload(null));
    }

    /**
     * Flux du jour limité au praticien connecté — GET /medecin/flux-du-jour
     */
    public function fluxDuJourMedecin()
    {
        $medecinId = auth('api')->user()->medecin_id;

        return response()->json($this->buildFluxJourPayload($medecinId));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildFluxJourPayload(?int $medecinId): array
    {
        $q = RendezVous::with(['utilisateur', 'medecin', 'bon.typeBon', 'consultation'])
            ->whereDate('date_rdv', today())
            ->orderBy('heure_rdv');

        if ($medecinId !== null) {
            $q->where('medecin_id', $medecinId);
        }

        $rdvs = $q->get();

        $parMedecin = $rdvs->groupBy('medecin_id')->map(function ($rdvsMedecin) {
            $medecin = $rdvsMedecin->first()->medecin;
            return [
                'medecin'     => $medecin,
                'rendez_vous' => $rdvsMedecin->values(),
                'stats'       => [
                    'total'      => $rdvsMedecin->count(),
                    'en_attente' => $rdvsMedecin->where('statut', 'en_attente')->count(),
                    'confirme'   => $rdvsMedecin->where('statut', 'confirme')->count(),
                    'termine'    => $rdvsMedecin->where('statut', 'termine')->count(),
                ],
            ];
        })->values();

        return [
            'success'      => true,
            'date'         => today()->format('Y-m-d'),
            'date_lisible' => today()->translatedFormat('l d F Y'),
            'stats'        => [
                'total'      => $rdvs->count(),
                'en_attente' => $rdvs->where('statut', 'en_attente')->count(),
                'confirme'   => $rdvs->where('statut', 'confirme')->count(),
                'termine'    => $rdvs->where('statut', 'termine')->count(),
                'annule'     => $rdvs->where('statut', 'annule')->count(),
            ],
            'par_medecin'  => $parMedecin,
            'tous_rdv'     => $rdvs->values(),
        ];
    }
}