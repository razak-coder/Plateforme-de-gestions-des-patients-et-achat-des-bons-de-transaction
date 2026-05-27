<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rendez_vous_id')
                  ->nullable()
                  ->constrained('rendez_vous')
                  ->onDelete('set null');
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
            $table->date('date_consultation');
            $table->text('diagnostic');
            $table->text('traitement');
            $table->string('orientation')->nullable();
            $table->enum('statut', ['en_cours', 'termine'])->default('en_cours');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
