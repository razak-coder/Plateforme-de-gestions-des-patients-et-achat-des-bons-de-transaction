<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute la colonne duree_minutes à la table disponibilites.
 * Permet de configurer des durées de créneaux variables par médecin (M4).
 * Valeur par défaut : 30 minutes (comportement actuel préservé).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('disponibilites', function (Blueprint $table) {
            $table->unsignedSmallInteger('duree_minutes')
                ->default(30)
                ->after('heure_fin')
                ->comment('Durée d\'un créneau en minutes (15, 20, 30, 45, 60)');
        });
    }

    public function down(): void
    {
        Schema::table('disponibilites', function (Blueprint $table) {
            $table->dropColumn('duree_minutes');
        });
    }
};
