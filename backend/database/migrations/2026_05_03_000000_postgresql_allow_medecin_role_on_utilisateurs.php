<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PostgreSQL : les colonnes enum Laravel sont des varchar + contrainte CHECK (ex. utilisateurs_role_check).
 * La migration add_medecin ne modifiait que MySQL ; sans ceci, role = medecin provoque SQLSTATE 23514.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check');

        DB::statement("
            ALTER TABLE utilisateurs
            ADD CONSTRAINT utilisateurs_role_check
            CHECK (role::text = ANY (ARRAY['admin', 'patient', 'medecin']::text[]))
        ");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("UPDATE utilisateurs SET role = 'patient' WHERE role = 'medecin'");

        DB::statement('ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check');

        DB::statement("
            ALTER TABLE utilisateurs
            ADD CONSTRAINT utilisateurs_role_check
            CHECK (role::text = ANY (ARRAY['admin', 'patient']::text[]))
        ");
    }
};
