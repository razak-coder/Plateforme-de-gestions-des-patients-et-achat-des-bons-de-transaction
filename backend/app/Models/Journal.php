<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Journal extends Model
{
    protected $table = 'journals';
    protected $primaryKey = 'id_journal';  // ← ta vraie clé primaire


    protected $fillable = [
        'id_utilisateur', 'action', 'modele', 'modele_id', 'description', 'ip_adresse',
    ];

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'id_utilisateur', 'id_utilisateur');
    }
}
