<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs', 'id_utilisateur')->onDelete('cascade');
            $table->foreignId('bon_id')->nullable()->constrained('bons')->onDelete('set null');
            $table->string('reference')->nullable();
            $table->decimal('montant', 10, 2);
            $table->string('methode_paiement');
            $table->enum('statut', ['en_attente', 'confirmee', 'echouee', 'annulee'])->default('en_attente');
            $table->string('numero_telephone')->nullable();
            $table->text('details')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
