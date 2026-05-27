<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dossiers_patients', function (Blueprint $table) {
            $table->id();
            $table->string('numero_dossier')->unique()->comment('Ex: DOS-2026-0001');
            $table->foreignId('utilisateur_id')
                  ->constrained('utilisateurs', 'id_utilisateur')
                  ->onDelete('cascade');
            $table->string('service');
            $table->text('antecedents')->nullable();
            $table->enum('statut', ['ouvert', 'ferme', 'archive'])->default('ouvert');
            $table->date('date_ouverture');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dossiers_patients');
    }
};
