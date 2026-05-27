<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medecins', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenom');
            $table->string('specialite');
            $table->string('email')->unique();
            $table->string('telephone', 20)->nullable();
            $table->string('numero_ordre', 50)->nullable()->comment('Numéro d\'ordre médical');
            $table->enum('statut', ['actif', 'inactif'])->default('actif');
            $table->text('bio')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medecins');
    }
};
