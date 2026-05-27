<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapports', function (Blueprint $table) {
            $table->id('id_rapport');
            $table->foreignId('id_utilisateur')
                  ->nullable()
                  ->constrained('utilisateurs', 'id_utilisateur')
                  ->onDelete('set null');
            $table->string('titre');
            $table->enum('type', ['journalier', 'hebdomadaire', 'mensuel', 'annuel', 'personnalise'])->default('mensuel');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->json('donnees')->nullable(); // statistiques JSON
            $table->string('fichier_pdf')->nullable(); // chemin vers le PDF
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rapports');
    }
};
