<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rapport extends Model
{
    protected $table      = 'rapports';
    protected $primaryKey = 'id_rapport';   // migration: $table->id('id_rapport')

    protected $fillable = [
        'id_utilisateur', 'titre', 'type', 'date_debut', 'date_fin', 'donnees', 'fichier_pdf',
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
        'donnees' => 'array',
    ];

    public function generateurRapport()
    {
        return $this->belongsTo(Utilisateur::class, 'id_utilisateur', 'id_utilisateur');
    }
}
