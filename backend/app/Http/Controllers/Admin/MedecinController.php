<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Disponibilite;
use App\Models\Medecin;
use App\Models\RendezVous;
use Illuminate\Http\Request;

class MedecinController extends Controller
{
    public function index(Request $request)
    {
        $query = Medecin::with('disponibilites')->withCount(['rendezVous', 'consultations']);

        if ($request->filled('specialite')) {
            $query->where('specialite', $request->specialite);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('recherche')) {
            $terme = $request->recherche;
            $query->where(function ($q) use ($terme) {
                $q->where('nom', 'like', "%{$terme}%")
                  ->orWhere('prenom', 'like', "%{$terme}%")
                  ->orWhere('email', 'like', "%{$terme}%")
                  ->orWhere('specialite', 'like', "%{$terme}%");
            });
        }

        return response()->json(['success' => true, 'data' => $query->orderBy('nom')->paginate(20)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'           => 'required|string|max:100',
            'prenom'        => 'required|string|max:100',
            'specialite'    => 'required|string|max:100',
            'email'         => 'required|email|unique:medecins,email',
            'telephone'     => 'nullable|string|max:20',
            'numero_ordre'  => 'nullable|string|max:50',
            'bio'           => 'nullable|string',
            'statut'        => 'in:actif,inactif',
            'disponibilites'            => 'nullable|array',
            'disponibilites.*.jour_semaine' => 'required_with:disponibilites|in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
            'disponibilites.*.heure_debut'  => 'required_with:disponibilites|date_format:H:i',
            'disponibilites.*.heure_fin'    => 'required_with:disponibilites|date_format:H:i|after:disponibilites.*.heure_debut',
        ]);

        $medecin = Medecin::create($data);

        if (!empty($data['disponibilites'])) {
            foreach ($data['disponibilites'] as $dispo) {
                Disponibilite::create([
                    'medecin_id'   => $medecin->id,
                    'jour_semaine' => $dispo['jour_semaine'],
                    'heure_debut'  => $dispo['heure_debut'],
                    'heure_fin'    => $dispo['heure_fin'],
                    'actif'        => true,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Médecin créé avec succès.',
            'data'    => $medecin->load('disponibilites'),
        ], 201);
    }

    public function show(Medecin $medecin)
    {
        $stats = [
            'total_rdv'          => $medecin->rendezVous()->count(),
            'rdv_termines'       => $medecin->rendezVous()->where('statut', 'termine')->count(),
            'rdv_aujourd_hui'    => $medecin->rendezVous()->whereDate('date_rdv', today())->count(),
            'total_consultations'=> $medecin->consultations()->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => $medecin->load(['disponibilites', 'rendezVous.utilisateur']),
            'stats'   => $stats,
        ]);
    }

    public function update(Request $request, Medecin $medecin)
    {
        $data = $request->validate([
            'nom'           => 'sometimes|string|max:100',
            'prenom'        => 'sometimes|string|max:100',
            'specialite'    => 'sometimes|string|max:100',
            'email'         => 'sometimes|email|unique:medecins,email,' . $medecin->id,
            'telephone'     => 'nullable|string|max:20',
            'numero_ordre'  => 'nullable|string|max:50',
            'bio'           => 'nullable|string',
            'statut'        => 'sometimes|in:actif,inactif',
            'disponibilites'            => 'nullable|array',
            'disponibilites.*.jour_semaine' => 'required_with:disponibilites|in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
            'disponibilites.*.heure_debut'  => 'required_with:disponibilites|date_format:H:i',
            'disponibilites.*.heure_fin'    => 'required_with:disponibilites|date_format:H:i',
        ]);

        $medecin->update($data);

        // Remplacer les disponibilités si fournies
        if (array_key_exists('disponibilites', $data)) {
            $medecin->disponibilites()->delete();
            foreach (($data['disponibilites'] ?? []) as $dispo) {
                Disponibilite::create([
                    'medecin_id'   => $medecin->id,
                    'jour_semaine' => $dispo['jour_semaine'],
                    'heure_debut'  => $dispo['heure_debut'],
                    'heure_fin'    => $dispo['heure_fin'],
                    'actif'        => true,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Médecin mis à jour.',
            'data'    => $medecin->load('disponibilites'),
        ]);
    }

    public function destroy(Medecin $medecin)
    {
        // Vérifier qu'aucun RDV à venir n'est lié
        $rdvAVenir = $medecin->rendezVous()
            ->where('date_rdv', '>=', today())
            ->whereNotIn('statut', ['annule', 'termine'])
            ->count();

        if ($rdvAVenir > 0) {
            return response()->json([
                'success' => false,
                'message' => "Ce médecin a {$rdvAVenir} rendez-vous à venir. Veuillez les annuler d'abord.",
            ], 422);
        }

        $medecin->update(['statut' => 'inactif']);

        return response()->json(['success' => true, 'message' => 'Médecin désactivé.']);
    }

    /**
     * Retourne les créneaux disponibles d'un médecin pour une date donnée.
     * GET /admin/medecins/{id}/disponibilites?date=YYYY-MM-DD
     */
    public function creneauxDisponibles(Request $request, Medecin $medecin)
    {
        $request->validate(['date' => 'required|date|after_or_equal:today']);

        $date = $request->date;

        $jours = [
            1 => 'lundi', 2 => 'mardi', 3 => 'mercredi',
            4 => 'jeudi', 5 => 'vendredi', 6 => 'samedi', 7 => 'dimanche',
        ];
        $jourSemaine = $jours[(int) date('N', strtotime($date))];

        // Plages de disponibilité
        $plages = $medecin->disponibilites()
            ->where('jour_semaine', $jourSemaine)
            ->where('actif', true)
            ->get();

        // RDV déjà pris ce jour-là
        $rdvPris = RendezVous::where('medecin_id', $medecin->id)
            ->where('date_rdv', $date)
            ->whereNotIn('statut', ['annule'])
            ->pluck('heure_rdv')
            ->map(fn($h) => substr($h, 0, 5))
            ->toArray();

        // Générer créneaux selon la durée configurée par plage (défaut : 30 min)
        $creneaux = [];
        foreach ($plages as $plage) {
            $dureeMinutes = $plage->duree_minutes ?? 30;
            $debut = strtotime($plage->heure_debut);
            $fin   = strtotime($plage->heure_fin);

            while ($debut < $fin) {
                $heure = date('H:i', $debut);
                $creneaux[] = [
                    'heure'          => $heure,
                    'disponible'     => !in_array($heure, $rdvPris),
                    'duree_minutes'  => $dureeMinutes,
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

    public function specialites()
    {
        $specialites = Medecin::actif()->distinct()->pluck('specialite')->sort()->values();
        return response()->json(['success' => true, 'data' => $specialites]);
    }
}
