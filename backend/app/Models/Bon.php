<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Bon extends Model
{
    protected $table = 'bons';

    protected $fillable = [
        'utilisateur_id', 'type_bon_id', 'code_unique', 'statut',
        'date_achat', 'date_expiration', 'date_utilisation', 'montant_paye',
        'notes', 'genere_par_admin', 'notes_admin',
    ];

    protected $casts = [
        'date_achat' => 'datetime',
        'date_expiration' => 'datetime',
        'date_utilisation' => 'datetime',
        'montant_paye' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($bon) {
            if (empty($bon->code_unique)) {
                $bon->code_unique = strtoupper('CTM-' . Str::random(8));
            }
        });
    }

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    public function typeBon()
    {
        return $this->belongsTo(TypeBon::class, 'type_bon_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'bon_id');
    }

    public function estValide(): bool
    {
        return $this->statut === 'valide' && $this->date_expiration->isFuture();
    }

    // Alias pour compatibilité
    public function estActif(): bool
    {
        return $this->estValide();
    }

    public function estExpire(): bool
    {
        return $this->date_expiration->isPast() && $this->statut === 'valide';
    }
}
