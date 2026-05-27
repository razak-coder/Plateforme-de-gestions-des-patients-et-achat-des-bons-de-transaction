<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedecinNotification extends Model
{
    protected $table = 'medecin_notifications';

    protected $fillable = [
        'medecin_id',
        'rendez_vous_id',
        'type',
        'titre',
        'message',
        'lu_at',
    ];

    protected $casts = [
        'lu_at' => 'datetime',
    ];

    public function medecin()
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class, 'rendez_vous_id');
    }
}
