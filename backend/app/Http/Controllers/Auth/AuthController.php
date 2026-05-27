<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConnexionRequest;
use App\Http\Requests\InscriptionRequest;
use App\Models\Journal;
use App\Models\Utilisateur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login', 'register']]);
    }

    public function register(InscriptionRequest $request)
    {
        $utilisateur = Utilisateur::create([
            'nom'       => $request->nom,
            'prenom'    => $request->prenom,
            'email'     => $request->email,
            'telephone' => $request->telephone,
            'password'  => Hash::make($request->password),
            'role'      => 'patient', // toujours patient à l'inscription
        ]);

        $token = auth('api')->login($utilisateur);

        Journal::create([
            'id_utilisateur' => $utilisateur->id_utilisateur,
            'action'         => 'inscription',
            'description'    => "Nouvel utilisateur inscrit : {$utilisateur->nom_complet}",
            'ip_adresse'     => $request->ip(),
        ]);

        return response()->json([
            'success'     => true,
            'message'     => 'Inscription réussie.',
            'utilisateur' => $utilisateur,
            'token'       => $token,
            'token_type'  => 'bearer',
            'expires_in'  => auth('api')->factory()->getTTL() * 60,
        ], 201);
    }

    public function login(ConnexionRequest $request)
    {
        $token = auth('api')->attempt([
            'email'    => $request->email,
            'password' => $request->password,
        ]);

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Email ou mot de passe incorrect.',
            ], 401);
        }

        $utilisateur = auth('api')->user();

        if (!$utilisateur->actif) {
            auth('api')->logout();
            return response()->json([
                'success' => false,
                'message' => 'Votre compte a été désactivé.',
            ], 403);
        }

        Journal::create([
            'id_utilisateur' => $utilisateur->id_utilisateur,
            'action'         => 'connexion',
            'description'    => "Connexion de {$utilisateur->nom_complet}",
            'ip_adresse'     => $request->ip(),
        ]);

        return response()->json([
            'success'          => true,
            'message'          => 'Connexion réussie.',
            'utilisateur'      => $utilisateur,
            'token'            => $token,
            'token_type'       => 'bearer',
            'expires_in'       => auth('api')->factory()->getTTL() * 60,
            'doit_changer_mdp' => (bool) $utilisateur->doit_changer_mdp,
        ]);
    }

    public function me()
    {
        return response()->json([
            'success'     => true,
            'utilisateur' => auth('api')->user(),
        ]);
    }

    /**
     * Forcer le changement de mot de passe (premier login après création par admin).
     * POST /auth/changer-mdp-force
     */
    public function forcerChangementMdp(Request $request)
    {
        $request->validate([
            'nouveau_mot_de_passe'    => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()],
            'confirmation_mot_de_passe' => 'required|same:nouveau_mot_de_passe',
        ]);

        $user = auth('api')->user();

        $user->update([
            'password'         => Hash::make($request->nouveau_mot_de_passe),
            'doit_changer_mdp' => false, // drapeau levé
        ]);

        Journal::create([
            'id_utilisateur' => $user->id_utilisateur,
            'action'         => 'changement_mdp_force',
            'description'    => "Changement de mot de passe obligatoire effectué par {$user->nom_complet}",
            'ip_adresse'     => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe mis à jour avec succès. Bienvenue !',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = auth('api')->user();
        $data = $request->validate([
            'nom'       => 'sometimes|string|max:100',
            'prenom'    => 'sometimes|string|max:100',
            'email'     => 'sometimes|email|unique:utilisateurs,email,' . $user->id_utilisateur . ',id_utilisateur',
            'telephone' => 'nullable|string|max:20',
        ]);

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Profil mis à jour.',
            'utilisateur' => $user,
        ]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'ancien_mot_de_passe'  => 'required|string',
            'nouveau_mot_de_passe' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()],
            'confirmation_mot_de_passe' => 'required|same:nouveau_mot_de_passe',
        ]);

        $user = auth('api')->user();

        if (!Hash::check($request->ancien_mot_de_passe, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'L\'ancien mot de passe est incorrect.',
            ], 422);
        }

        if (Hash::check($request->nouveau_mot_de_passe, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Le nouveau mot de passe doit etre different de l ancien.',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->nouveau_mot_de_passe)]);

        Journal::create([
            'id_utilisateur' => $user->id_utilisateur,
            'action'         => 'changement_mdp',
            'description'    => "Mot de passe change par {$user->nom_complet}",
            'ip_adresse'     => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe mis à jour avec succès.',
        ]);
    }

    public function logout(Request $request)
    {
        $user = auth('api')->user();
        auth('api')->logout();

        Journal::create([
            'id_utilisateur' => $user->id_utilisateur,
            'action'         => 'deconnexion',
            'description'    => "Déconnexion de {$user->nom_complet}",
            'ip_adresse'     => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie.',
        ]);
    }

    public function refresh()
    {
        $token = auth('api')->refresh();
        return response()->json([
            'success'    => true,
            'token'      => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
        ]);
    }
}
