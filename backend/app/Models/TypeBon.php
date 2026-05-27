<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TypeBon extends Model
{
    protected $table = 'type_bons';

    protected $fillable = [
        'nom', 'description', 'prix', 'specialite', 'validite_jours', 'actif',
    ];

    protected $appends = ['actif'];

    protected $casts = [
        'prix' => 'decimal:2',
        'validite_jours' => 'integer',
    ];

    public function getActifAttribute(): bool
    {
        return ($this->attributes['statut'] ?? 'actif') === 'actif';
    }

    public function setActifAttribute($value)
    {
        $this->attributes['statut'] = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'actif' : 'inactif';
    }

    public function bons()
    {
        return $this->hasMany(Bon::class, 'type_bon_id');
    }

    public function scopeActif($query)
    {
        return $query->where('statut', 'actif');
    }
}
