<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RendezVous extends Model
{
    protected $table = 'rendez_vous';

    protected $fillable = [
        'dossier_id', 'utilisateur_id', 'medecin_id', 'bon_id',
        'date_rdv', 'heure_rdv', 'motif', 'priorite', 'statut', 'notes',
    ];

    protected $casts = [
        'date_rdv' => 'date',
    ];

    public function dossier()
    {
        return $this->belongsTo(DossierPatient::class, 'dossier_id');
    }

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id', 'id_utilisateur');
    }

    public function medecin()
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    public function bon()
    {
        return $this->belongsTo(Bon::class, 'bon_id');
    }

    public function consultation()
    {
        return $this->hasOne(Consultation::class, 'rendez_vous_id');
    }

    public function scopeAujourdhui($query)
    {
        return $query->whereDate('date_rdv', today());
    }

    public function scopeAVenir($query)
    {
        return $query->where('date_rdv', '>=', today())->whereNotIn('statut', ['annule', 'termine']);
    }

    public function scopeParMedecin($query, int $medecinId)
    {
        return $query->where('medecin_id', $medecinId);
    }
}
