<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->foreignId('medecin_id')
                ->nullable()
                ->after('role')
                ->constrained('medecins')
                ->nullOnDelete();
        });

        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->unique('medecin_id');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE utilisateurs MODIFY COLUMN role ENUM('admin', 'patient', 'medecin') NOT NULL DEFAULT 'patient'");
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check');
            DB::statement("
                ALTER TABLE utilisateurs
                ADD CONSTRAINT utilisateurs_role_check
                CHECK (role::text = ANY (ARRAY['admin', 'patient', 'medecin']::text[]))
            ");
        }
    }

    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropUnique(['medecin_id']);
            $table->dropForeign(['medecin_id']);
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("UPDATE utilisateurs SET role = 'patient' WHERE role = 'medecin'");
            DB::statement("ALTER TABLE utilisateurs MODIFY COLUMN role ENUM('admin', 'patient') NOT NULL DEFAULT 'patient'");
        }

        if ($driver === 'pgsql') {
            DB::statement("UPDATE utilisateurs SET role = 'patient' WHERE role = 'medecin'");
            DB::statement('ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check');
            DB::statement("
                ALTER TABLE utilisateurs
                ADD CONSTRAINT utilisateurs_role_check
                CHECK (role::text = ANY (ARRAY['admin', 'patient']::text[]))
            ");
        }
    }
};
