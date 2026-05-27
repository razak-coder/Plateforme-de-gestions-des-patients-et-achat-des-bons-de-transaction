<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bons', function (Blueprint $table) {
            if (!Schema::hasColumn('bons', 'genere_par_admin')) {
                $table->boolean('genere_par_admin')->default(false)->after('statut')
                    ->comment('Vrai si le bon a été généré directement par l\'admin sans paiement');
            }
            if (!Schema::hasColumn('bons', 'notes_admin')) {
                $table->string('notes_admin')->nullable()->after('genere_par_admin')
                    ->comment('Note administrative sur la raison de la génération directe');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bons', function (Blueprint $table) {
            $table->dropColumn(['genere_par_admin', 'notes_admin']);
        });
    }
};
