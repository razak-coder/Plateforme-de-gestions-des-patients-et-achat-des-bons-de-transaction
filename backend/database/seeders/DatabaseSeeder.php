<?php

namespace Database\Seeders;

use App\Models\TypeBon;
use App\Models\Utilisateur;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Créer l'administrateur par défaut
        Utilisateur::create([
            'nom'      => 'Admin',
            'prenom'   => 'CTM',
            'email'    => 'admin@ctm-consult.com',
            'password' => Hash::make('Admin@1234'),
            'role'     => 'admin',
            'actif'    => true,
        ]);

        // Créer un patient de test
        Utilisateur::create([
            'nom'       => 'Dupont',
            'prenom'    => 'Jean',
            'email'     => 'patient@ctm-consult.com',
            'telephone' => '+221 77 000 0000',
            'password'  => Hash::make('Patient@1234'),
            'role'      => 'patient',
            'actif'     => true,
        ]);

        // Créer des types de bons
        $typesBons = [
            [
                'nom'            => 'Consultation Généraliste',
                'description'    => 'Consultation chez un médecin généraliste',
                'prix'           => 5000,
                'specialite'     => 'Médecine générale',
                'validite_jours' => 30,
            ],
            [
                'nom'            => 'Consultation Spécialiste',
                'description'    => 'Consultation chez un médecin spécialiste',
                'prix'           => 15000,
                'specialite'     => 'Spécialité médicale',
                'validite_jours' => 60,
            ],
            [
                'nom'            => 'Consultation Cardiologie',
                'description'    => 'Consultation cardiologique complète',
                'prix'           => 25000,
                'specialite'     => 'Cardiologie',
                'validite_jours' => 60,
            ],
            [
                'nom'            => 'Consultation Pédiatrie',
                'description'    => 'Consultation pédiatrique pour enfant',
                'prix'           => 8000,
                'specialite'     => 'Pédiatrie',
                'validite_jours' => 30,
            ],
            [
                'nom'            => 'Consultation Gynécologie',
                'description'    => 'Consultation gynécologique',
                'prix'           => 20000,
                'specialite'     => 'Gynécologie',
                'validite_jours' => 45,
            ],
        ];

        foreach ($typesBons as $type) {
            TypeBon::create($type);
        }

        $this->command->info('✅ Données de test créées avec succès !');
        $this->command->info('Admin: admin@ctm-consult.com / Admin@1234');
        $this->command->info('Patient: patient@ctm-consult.com / Patient@1234');
    }
}
