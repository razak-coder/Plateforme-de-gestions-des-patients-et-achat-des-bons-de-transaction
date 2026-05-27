<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->id('id_journal');
            $table->foreignId('id_utilisateur')
                  ->nullable()
                  ->constrained('utilisateurs', 'id_utilisateur')
                  ->onDelete('set null');
            $table->string('action');
            $table->string('modele')->nullable();
            $table->unsignedBigInteger('modele_id')->nullable();
            $table->text('description')->nullable();
            $table->string('ip_adresse')->nullable();
            $table->timestamps();
            
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journals');
    }
};
