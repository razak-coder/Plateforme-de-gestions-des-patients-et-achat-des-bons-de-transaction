<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Disponibilite extends Model
{
    protected $table = 'disponibilites';

    protected $fillable = [
        'medecin_id', 'jour_semaine', 'heure_debut', 'heure_fin', 'actif', 'duree_minutes',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    public function medecin()
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }
}
