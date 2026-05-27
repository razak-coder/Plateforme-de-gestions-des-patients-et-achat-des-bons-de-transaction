<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DossierPatient extends Model
{
    protected $table = 'dossiers_patients';

    protected $fillable = [
        'numero_dossier', 'utilisateur_id', 'service',
        'antecedents', 'statut', 'date_ouverture', 'notes',
    ];

    protected $casts = [
        'date_ouverture' => 'date',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (DossierPatient $dossier) {
            if (empty($dossier->numero_dossier)) {
                $annee = Carbon::now()->year;

                // Verrou de table pour éviter les doublons concurrents
                $dernierSeq = \DB::transaction(function () use ($annee) {
                    return static::whereYear('created_at', $annee)
                        ->lockForUpdate()
                        ->count() + 1;
                });

                $dossier->numero_dossier = 'DOS-' . $annee . '-' . str_pad($dernierSeq, 4, '0', STR_PAD_LEFT);
            }

            if (empty($dossier->date_ouverture)) {
                $dossier->date_ouverture = Carbon::today();
            }
        });
    }

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id', 'id_utilisateur');
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class, 'dossier_id');
    }

    public function consultations()
    {
        return $this->hasMany(Consultation::class, 'dossier_id');
    }

    public function scopeOuvert($query)
    {
        return $query->where('statut', 'ouvert');
    }
}
