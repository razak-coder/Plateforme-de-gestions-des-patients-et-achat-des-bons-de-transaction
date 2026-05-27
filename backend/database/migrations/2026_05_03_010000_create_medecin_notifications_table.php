<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medecin_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medecin_id')
                ->constrained('medecins')
                ->onDelete('cascade');
            $table->foreignId('rendez_vous_id')
                ->nullable()
                ->constrained('rendez_vous')
                ->nullOnDelete();
            $table->string('type', 50)->default('rdv_programme');
            $table->string('titre');
            $table->text('message');
            $table->timestamp('lu_at')->nullable();
            $table->timestamps();

            $table->index(['medecin_id', 'lu_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medecin_notifications');
    }
};
