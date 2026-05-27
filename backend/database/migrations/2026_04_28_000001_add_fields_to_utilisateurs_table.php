<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->string('numero_patient')->unique()->nullable()->after('telephone');
            $table->date('date_naissance')->nullable()->after('numero_patient');
            $table->enum('sexe', ['M', 'F'])->nullable()->after('date_naissance');
            $table->string('groupe_sanguin', 5)->nullable()->after('sexe');
            $table->text('adresse')->nullable()->after('groupe_sanguin');
        });
    }

    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropColumn(['numero_patient', 'date_naissance', 'sexe', 'groupe_sanguin', 'adresse']);
        });
    }
};
