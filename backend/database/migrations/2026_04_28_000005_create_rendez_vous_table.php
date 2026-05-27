<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rendez_vous', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dossier_id')
                  ->constrained('dossiers_patients')
                  ->onDelete('cascade');
            $table->foreignId('utilisateur_id')
                  ->constrained('utilisateurs', 'id_utilisateur')
                  ->onDelete('cascade');
            $table->foreignId('medecin_id')
                  ->constrained('medecins')
                  ->onDelete('cascade');
            $table->foreignId('bon_id')
                  ->nullable()
                  ->constrained('bons')
                  ->onDelete('set null');
            $table->date('date_rdv');
            $table->time('heure_rdv');
            $table->string('motif');
            $table->enum('priorite', ['normale', 'haute', 'urgente'])->default('normale');
            $table->enum('statut', ['en_attente', 'confirme', 'annule', 'termine'])->default('en_attente');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rendez_vous');
    }
};
