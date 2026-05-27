<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== DIAGNOSTIC CTM-Consult ===\n\n";

// 1. Clés primaires des modèles
try {
    $b = App\Models\Bon::first();
    echo "[BON] pkName=" . $b->getKeyName() . " | pk=" . $b->getKey() . " | utilisateur_id=" . $b->utilisateur_id . "\n";
} catch (Exception $e) {
    echo "[BON] ERREUR: " . $e->getMessage() . "\n";
}

try {
    $d = App\Models\DossierPatient::first();
    echo "[DOSSIER] pkName=" . $d->getKeyName() . " | pk=" . $d->getKey() . " | utilisateur_id=" . $d->utilisateur_id . "\n";
} catch (Exception $e) {
    echo "[DOSSIER] ERREUR: " . $e->getMessage() . "\n";
}

try {
    $u = App\Models\Utilisateur::where('role', 'patient')->first();
    echo "[UTIL] pkName=" . $u->getKeyName() . " | pk=" . $u->getKey() . " | id_utilisateur=" . $u->id_utilisateur . "\n";
} catch (Exception $e) {
    echo "[UTIL] ERREUR: " . $e->getMessage() . "\n";
}

// 2. Tester le withCount du UtilisateurController
try {
    $u2 = App\Models\Utilisateur::withCount(['bons', 'transactions'])->first();
    echo "[UTIL withCount] OK - bons_count=" . $u2->bons_count . "\n";
} catch (Exception $e) {
    echo "[UTIL withCount] ERREUR: " . $e->getMessage() . "\n";
}

// 3. Tester l'AuditService
try {
    $audit = app(App\Services\AuditService::class);
    echo "[AUDITSERVICE] OK - classe=" . get_class($audit) . "\n";
} catch (Exception $e) {
    echo "[AUDITSERVICE] ERREUR: " . $e->getMessage() . "\n";
}

// 4. Tester la relation Bon->utilisateur
try {
    $bon = App\Models\Bon::with('utilisateur')->first();
    echo "[BON->utilisateur] " . ($bon->utilisateur ? "OK: " . $bon->utilisateur->nom : "NULL") . "\n";
} catch (Exception $e) {
    echo "[BON->utilisateur] ERREUR: " . $e->getMessage() . "\n";
}

// 5. Tester DossierPatient query par utilisateur_id
try {
    $u = App\Models\Utilisateur::where('role', 'patient')->first();
    if ($u) {
        $count = App\Models\DossierPatient::where('utilisateur_id', $u->getKey())->count();
        echo "[DOSSIER par utilisateur_id=" . $u->getKey() . "] count=" . $count . "\n";
    }
} catch (Exception $e) {
    echo "[DOSSIER par utilisateur_id] ERREUR: " . $e->getMessage() . "\n";
}

// 6. Tester Bons par utilisateur_id + statut
try {
    $u = App\Models\Utilisateur::where('role', 'patient')->first();
    if ($u) {
        $count = App\Models\Bon::where('utilisateur_id', $u->getKey())->where('statut', 'valide')->count();
        echo "[BONS valides pour utilisateur_id=" . $u->getKey() . "] count=" . $count . "\n";
    }
} catch (Exception $e) {
    echo "[BONS valides] ERREUR: " . $e->getMessage() . "\n";
}

echo "\n=== FIN DIAGNOSTIC ===\n";
