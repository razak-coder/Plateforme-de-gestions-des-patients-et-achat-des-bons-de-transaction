<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$tables = ['journals', 'bons', 'medecins', 'utilisateurs', 'rendez_vous', 'dossiers_patients', 'consultations'];
foreach ($tables as $t) {
    try {
        $cols = Schema::getColumnListing($t);
        echo strtoupper($t) . ': ' . implode(', ', $cols) . PHP_EOL;
    } catch (Exception $e) {
        echo strtoupper($t) . ': ERREUR — ' . $e->getMessage() . PHP_EOL;
    }
}
