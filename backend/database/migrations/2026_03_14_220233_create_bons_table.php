<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bons', function (Blueprint $table) {
            $table->id();
            $table->uuid('code_unique')->unique();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs', 'id_utilisateur')->onDelete('cascade');
            $table->foreignId('type_bon_id')->constrained('type_bons')->onDelete('cascade');
            $table->enum('statut', ['valide', 'utilise', 'expire', 'annule'])->default('valide');
            $table->timestamp('date_achat')->useCurrent();
            $table->timestamp('date_expiration');
            $table->timestamp('date_utilisation')->nullable();
            $table->decimal('montant_paye', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bons');
    }
};
