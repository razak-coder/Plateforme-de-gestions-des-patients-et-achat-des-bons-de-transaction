<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medecin extends Model
{
    protected $table = 'medecins';

    protected $fillable = [
        'nom', 'prenom', 'specialite', 'email', 'telephone',
        'numero_ordre', 'statut', 'bio',
    ];

    protected $appends = ['nom_complet', 'actif'];

    public function getNomCompletAttribute(): string
    {
        return "Dr {$this->prenom} {$this->nom}";
    }

    public function getActifAttribute(): bool
    {
        return $this->getAttribute('statut') === 'actif';
    }

    public function disponibilites()
    {
        return $this->hasMany(Disponibilite::class, 'medecin_id');
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class, 'medecin_id');
    }

    public function consultations()
    {
        return $this->hasMany(Consultation::class, 'medecin_id');
    }

    public function notifications()
    {
        return $this->hasMany(MedecinNotification::class, 'medecin_id');
    }

    public function scopeActif($query)
    {
        return $query->where('statut', 'actif');
    }

    /**
     * Vérifie si le médecin est disponible à une date/heure donnée.
     * Retourne true si disponible, false sinon.
     */
    public function estDisponible(string $dateRdv, string $heureRdv): bool
    {
        $jours = [
            1 => 'lundi', 2 => 'mardi', 3 => 'mercredi',
            4 => 'jeudi', 5 => 'vendredi', 6 => 'samedi', 7 => 'dimanche',
        ];

        $jourSemaine = $jours[(int) date('N', strtotime($dateRdv))] ?? null;
        if (!$jourSemaine) return false;

        // Vérifier créneau dans les disponibilités
        $creneauExiste = $this->disponibilites()
            ->where('jour_semaine', $jourSemaine)
            ->where('actif', true)
            ->where('heure_debut', '<=', $heureRdv)
            ->where('heure_fin', '>', $heureRdv)
            ->exists();

        if (!$creneauExiste) return false;

        // Vérifier absence de conflit de rendez-vous
        $conflit = $this->rendezVous()
            ->where('date_rdv', $dateRdv)
            ->where('heure_rdv', $heureRdv)
            ->whereNotIn('statut', ['annule'])
            ->exists();

        return !$conflit;
    }
}
