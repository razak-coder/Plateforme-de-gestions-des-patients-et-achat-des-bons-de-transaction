<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\TypeBonController;
use App\Http\Controllers\Admin\BonController as AdminBonController;
use App\Http\Controllers\Admin\TransactionController;
use App\Http\Controllers\Admin\UtilisateurController;
use App\Http\Controllers\Admin\RapportController;
use App\Http\Controllers\Admin\MedecinController;
use App\Http\Controllers\Admin\DossierController;
use App\Http\Controllers\Admin\RendezVousController;
use App\Http\Controllers\Admin\ConsultationController;
use App\Http\Controllers\Patient\BonController as PatientBonController;
use App\Http\Controllers\Patient\HistoriqueController;
use App\Http\Controllers\Patient\PatientDossierController;
use App\Http\Controllers\Medecin\CabinetController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — CTM-Consult
|--------------------------------------------------------------------------
*/

// ─── Authentification ───────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
    Route::middleware('auth:api')->group(function () {
        Route::post('/logout',          [AuthController::class, 'logout']);
        Route::post('/refresh',          [AuthController::class, 'refresh']);
        Route::get('/me',                [AuthController::class, 'me']);
        Route::put('/profil',            [AuthController::class, 'updateProfile']);
        Route::put('/mot-de-passe',      [AuthController::class, 'updatePassword']);
        Route::post('/changer-mdp-force',[AuthController::class, 'forcerChangementMdp']);
    });
});

// ─── Routes Admin (auth + isAdmin) ──────────────────────────────────────────
Route::middleware(['auth:api', 'isAdmin'])->prefix('admin')->group(function () {

    // Tableau de bord
    Route::get('/tableau-bord', [RapportController::class, 'tableauBord']);
    Route::get('/flux-du-jour', [RapportController::class, 'fluxDuJour']);

    // Types de bons
    Route::apiResource('type-bons', TypeBonController::class);

    // Bons
    Route::get('/bons/statistiques',        [AdminBonController::class, 'statistiques']);
    Route::post('/bons/valider',            [AdminBonController::class, 'valider']);
    Route::post('/bons/generer-direct',     [AdminBonController::class, 'genererDirect']);
    Route::get('/bons',                     [AdminBonController::class, 'index']);
    Route::get('/bons/{bon}',               [AdminBonController::class, 'show']);
    Route::put('/bons/{bon}/annuler',       [AdminBonController::class, 'annuler']);
    Route::put('/bons/{bon}/prolonger',     [AdminBonController::class, 'prolonger']);

    // Transactions
    Route::get('/transactions/statistiques',  [TransactionController::class, 'statistiques']);
    Route::get('/transactions',               [TransactionController::class, 'index']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);

    // Utilisateurs (statistiques AVANT apiResource)
    Route::get('/utilisateurs/statistiques',                  [UtilisateurController::class, 'statistiques']);
    Route::post('/utilisateurs/{utilisateur}/reset-password', [UtilisateurController::class, 'resetPassword']);
    Route::apiResource('utilisateurs', UtilisateurController::class);

    // Rapports
    Route::get('/rapports',              [RapportController::class, 'index']);
    Route::post('/rapports/generer',     [RapportController::class, 'generer']);
    Route::get('/rapports/{rapport}',    [RapportController::class, 'show']);
    Route::delete('/rapports/{rapport}', [RapportController::class, 'destroy']);

    // ─── Médecins ─────────────────────────────────────────────────────────
    Route::get('/medecins/specialites',              [MedecinController::class, 'specialites']);
    Route::get('/medecins/{medecin}/disponibilites', [MedecinController::class, 'creneauxDisponibles']);
    Route::apiResource('medecins', MedecinController::class);

    // ─── Dossiers patients ────────────────────────────────────────────────
    Route::get('/dossiers-patients/statistiques', [DossierController::class, 'statistiques']);
    Route::apiResource('dossiers-patients', DossierController::class);

    // ─── Rendez-vous ──────────────────────────────────────────────────────
    Route::get('/rendez-vous/aujourd-hui',           [RendezVousController::class, 'rdvDuJour']);
    Route::get('/rendez-vous/statistiques',          [RendezVousController::class, 'statistiques']);
    Route::put('/rendez-vous/{rendezVous}/statut',   [RendezVousController::class, 'changerStatut']);
    Route::apiResource('rendez-vous', RendezVousController::class);

    // ─── Consultations ────────────────────────────────────────────────────
    Route::put('/consultations/{consultation}/terminer', [ConsultationController::class, 'terminer']);
    Route::apiResource('consultations', ConsultationController::class);
});

// ─── Routes Patient (auth + isPatient) ──────────────────────────────────────
Route::middleware(['auth:api', 'isPatient'])->prefix('patient')->group(function () {

    // Types de bons disponibles
    Route::get('/type-bons',     [PatientBonController::class, 'typesDisponibles']);

    // Bons du patient
    Route::get('/bons',          [PatientBonController::class, 'mesBons']);
    Route::post('/bons/acheter', [PatientBonController::class, 'acheter']);
    Route::get('/bons/{bon}',    [PatientBonController::class, 'show']);

    // Historique
    Route::get('/historique',              [HistoriqueController::class, 'index']);
    Route::get('/historique/statistiques', [HistoriqueController::class, 'statistiques']);

    // ─── Dossier médical du patient ───────────────────────────────────────
    Route::get('/tableau-bord',    [PatientDossierController::class, 'tableauBord']);
    Route::get('/dossiers',        [PatientDossierController::class, 'mesDossiers']);
    Route::get('/rendez-vous',     [PatientDossierController::class, 'mesRendezVous']);
    Route::get('/consultations',   [PatientDossierController::class, 'mesConsultations']);
    Route::get('/chronologie',     [PatientDossierController::class, 'chronologie']);
    Route::get('/notifications',   [PatientDossierController::class, 'mesNotifications']);

    // ─── Prise de RDV en autonomie (A2) ──────────────────────────────────
    Route::get('/medecins-disponibles',                       [\App\Http\Controllers\Patient\RendezVousController::class, 'medecinsDisponibles']);
    Route::get('/medecins/{medecin}/creneaux',                [\App\Http\Controllers\Patient\RendezVousController::class, 'creneaux']);
    Route::post('/rendez-vous',                               [\App\Http\Controllers\Patient\RendezVousController::class, 'store']);
    Route::put('/rendez-vous/{rendezVous}/annuler',           [\App\Http\Controllers\Patient\RendezVousController::class, 'annuler']);
});

// ─── Espace praticien (auth + compte lié à une fiche médecin) ───────────────
Route::middleware(['auth:api', 'isMedecin'])->prefix('medecin')->group(function () {
    Route::get('/patients', [CabinetController::class, 'patients']);
    Route::get('/patients/{patient}/historique', [CabinetController::class, 'patientHistorique']);
    Route::get('/notifications', [CabinetController::class, 'notifications']);
    Route::put('/notifications/{notification}/lue', [CabinetController::class, 'marquerNotificationLue']);
    Route::get('/flux-du-jour', [RapportController::class, 'fluxDuJourMedecin']);
    Route::get('/rendez-vous', [RendezVousController::class, 'index']);
    Route::put('/rendez-vous/{rendezVous}/statut', [RendezVousController::class, 'changerStatut']);
    Route::put('/rendez-vous/{rendezVous}/refuser', [RendezVousController::class, 'refuserParMedecin']);
    Route::put('/consultations/{consultation}/terminer', [ConsultationController::class, 'terminer']);
    Route::get('/consultations', [ConsultationController::class, 'index']);
    Route::post('/consultations', [ConsultationController::class, 'store']);
    Route::get('/consultations/{consultation}', [ConsultationController::class, 'show']);
    Route::put('/consultations/{consultation}', [ConsultationController::class, 'update']);
    Route::patch('/consultations/{consultation}', [ConsultationController::class, 'update']);
});
