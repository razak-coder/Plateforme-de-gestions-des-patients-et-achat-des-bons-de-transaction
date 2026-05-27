<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    protected $table = 'consultations';

    protected $fillable = [
        'rendez_vous_id', 'dossier_id', 'utilisateur_id', 'medecin_id', 'bon_id',
        'date_consultation', 'diagnostic', 'traitement', 'orientation', 'statut', 'notes',
    ];

    protected $casts = [
        'date_consultation' => 'date',
    ];

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class, 'rendez_vous_id');
    }

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

    public function scopeTermine($query)
    {
        return $query->where('statut', 'termine');
    }
}
