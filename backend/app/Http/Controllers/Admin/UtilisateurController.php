<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bon;
use App\Models\Consultation;
use App\Models\DossierPatient;
use App\Models\RendezVous;
use App\Models\Transaction;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UtilisateurController extends Controller
{
    public function index(Request $request)
    {
        $query = Utilisateur::orderBy('nom');

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('recherche')) {
            $terme = $request->recherche;
            $query->where(function ($q) use ($terme) {
                $q->where('nom',            'like', "%{$terme}%")
                  ->orWhere('prenom',       'like', "%{$terme}%")
                  ->orWhere('email',        'like', "%{$terme}%")
                  ->orWhere('telephone',    'like', "%{$terme}%")
                  ->orWhere('numero_patient','like', "%{$terme}%");
            });
        }

        if ($request->has('statut')) {
            // La colonne DB est 'statut' (valeurs : 'actif' / 'inactif')
            $query->where('statut', $request->statut);
        }

        $utilisateurs = $query->withCount(['bons', 'transactions'])->paginate($request->get('per_page', 20));

        return response()->json(['success' => true, 'data' => $utilisateurs]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'            => 'required|string|max:100',
            'prenom'         => 'required|string|max:100',
            'email'          => 'required|email|unique:utilisateurs,email',
            'telephone'      => 'nullable|string|max:20',
            'password'       => 'required|string|min:6',
            'role'           => 'required|in:admin,patient,medecin',
            // excludeUnless (Rule) n'existe pas sur toutes les versions : règles natives équivalentes
            'medecin_id'     => [
                'prohibited_unless:role,medecin',
                'required_if:role,medecin',
                'exists:medecins,id',
                Rule::unique('utilisateurs', 'medecin_id'),
            ],
            'date_naissance' => 'nullable|date|before:today',
            'sexe'           => 'nullable|in:M,F',
            'groupe_sanguin' => 'nullable|string|max:5',
            'adresse'        => 'nullable|string',
        ]);

        $data['password']          = Hash::make($data['password']);
        $data['doit_changer_mdp']  = true; // forcé pour les comptes créés par l'admin

        if (($data['role'] ?? '') !== 'medecin') {
            $data['medecin_id'] = null;
        }

        $utilisateur = Utilisateur::create($data);

        $message = $utilisateur->role === 'medecin'
            ? "Compte praticien {$utilisateur->prenom} {$utilisateur->nom} créé. Il devra changer son mot de passe à la première connexion."
            : "Patient {$utilisateur->prenom} {$utilisateur->nom} créé (N° {$utilisateur->numero_patient}). Il devra changer son mot de passe à la première connexion.";

        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $utilisateur,
        ], 201);
    }

    public function show(Utilisateur $utilisateur)
    {
        // Profil complet avec toutes les relations
        $utilisateur->loadCount(['bons', 'transactions', 'dossiers', 'rendezVous']);
        $utilisateur->load(['bons' => fn($q) => $q->latest()->limit(5)->with('typeBon')]);

        // Utiliser getKey() car la PK est 'id_utilisateur', pas 'id'
        $uid = $utilisateur->getKey();
        $stats = [
            'total_bons'          => $utilisateur->bons_count,
            'bons_valides'        => Bon::where('utilisateur_id', $uid)->where('statut', 'valide')->count(),
            'bons_utilises'       => Bon::where('utilisateur_id', $uid)->where('statut', 'utilise')->count(),
            'bons_expires'        => Bon::where('utilisateur_id', $uid)->where('statut', 'expire')->count(),
            'total_consultations' => Consultation::where('utilisateur_id', $uid)->count(),
            'total_rdv'           => RendezVous::where('utilisateur_id', $uid)->count(),
            'total_depense'       => (float) Transaction::where('utilisateur_id', $uid)->where('statut', 'confirmee')->sum('montant'),
            'dossiers_ouverts'    => DossierPatient::where('utilisateur_id', $uid)->where('statut', 'ouvert')->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => $utilisateur,
            'stats'   => $stats,
        ]);
    }

    public function update(Request $request, Utilisateur $utilisateur)
    {
        $data = $request->validate([
            'nom'            => 'sometimes|string|max:100',
            'prenom'         => 'sometimes|string|max:100',
            'email'          => 'sometimes|email|unique:utilisateurs,email,' . $utilisateur->id_utilisateur . ',id_utilisateur',
            'telephone'      => 'nullable|string|max:20',
            'role'           => 'sometimes|in:admin,patient,medecin',
            'medecin_id'     => [
                'nullable',
                'exists:medecins,id',
                Rule::unique('utilisateurs', 'medecin_id')->ignore($utilisateur->id_utilisateur, 'id_utilisateur'),
            ],
            // Accepter les deux formes : boolean 'actif' ou string 'statut'
            'actif'          => 'sometimes|boolean',
            'statut'         => 'sometimes|in:actif,inactif',
            'date_naissance' => 'nullable|date|before:today',
            'sexe'           => 'nullable|in:M,F',
            'groupe_sanguin' => 'nullable|string|max:5',
            'adresse'        => 'nullable|string',
        ]);

        // Normaliser : si 'actif' boolean reçu, convertir en colonne 'statut'
        if (array_key_exists('actif', $data)) {
            $data['statut'] = filter_var($data['actif'], FILTER_VALIDATE_BOOLEAN) ? 'actif' : 'inactif';
            unset($data['actif']);
        }

        $roleFinal      = $data['role'] ?? $utilisateur->role;
        $medecinIdFinal = array_key_exists('medecin_id', $data) ? $data['medecin_id'] : $utilisateur->medecin_id;
        if ($roleFinal === 'medecin' && empty($medecinIdFinal)) {
            return response()->json([
                'success' => false,
                'message' => 'Un compte praticien doit être lié à une fiche médecin.',
            ], 422);
        }
        if ($roleFinal !== 'medecin') {
            $data['medecin_id'] = null;
        }

        if ($request->has('password')) {
            $request->validate(['password' => 'string|min:6']);
            $data['password']         = Hash::make($request->password);
            $data['doit_changer_mdp'] = true;
        }

        $utilisateur->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur mis à jour.',
            'data'    => $utilisateur->fresh(),
        ]);
    }


    /**
     * Réinitialiser le mot de passe d'un patient avec un mot de passe temporaire.
     * POST /admin/utilisateurs/{utilisateur}/reset-password
     */
    public function resetPassword(Request $request, Utilisateur $utilisateur)
    {
        $data = $request->validate([
            'nouveau_mot_de_passe' => 'nullable|string|min:6',
        ]);

        $mdpTemp = $data['nouveau_mot_de_passe'] ?? 'Ctm@' . rand(1000, 9999);

        $utilisateur->update([
            'password'         => Hash::make($mdpTemp),
            'doit_changer_mdp' => true,
        ]);

        return response()->json([
            'success'            => true,
            'message'            => 'Mot de passe réinitialisé. Le patient devra le changer à sa prochaine connexion.',
            'mot_de_passe_temp'  => $mdpTemp, // retourné UNE SEULE FOIS pour le communiquer au patient
        ]);
    }

    /**
     * Statistiques globales
     */
    public function statistiques()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'total'                    => Utilisateur::count(),
                'patients'                 => Utilisateur::where('role', 'patient')->count(),
                'medecins'                 => Utilisateur::where('role', 'medecin')->count(),
                'admins'                   => Utilisateur::where('role', 'admin')->count(),
                'actifs'                   => Utilisateur::where('actif', true)->count(),
                'doivent_changer_mdp'      => Utilisateur::where('doit_changer_mdp', true)->count(),
                'nouveaux_ce_mois'         => Utilisateur::whereMonth('created_at', now()->month)->count(),
            ],
        ]);
    }

    public function destroy(Utilisateur $utilisateur)
    {
        if ((int) $utilisateur->id_utilisateur === (int) auth('api')->id()) {
            return response()->json(['success' => false, 'message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }
        // Écrire directement sur la colonne 'statut' pour éviter l'ambiguïté
        $utilisateur->update(['statut' => 'inactif']);
        return response()->json(['success' => true, 'message' => 'Compte utilisateur désactivé.']);
    }
}
