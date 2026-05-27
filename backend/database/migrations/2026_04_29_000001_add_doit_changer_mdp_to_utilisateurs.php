<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->boolean('doit_changer_mdp')->default(false)->after('actif')
                ->comment('Vrai si le compte a été créé par un admin et doit changer son mot de passe à la première connexion');
        });
    }

    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropColumn('doit_changer_mdp');
        });
    }
};
