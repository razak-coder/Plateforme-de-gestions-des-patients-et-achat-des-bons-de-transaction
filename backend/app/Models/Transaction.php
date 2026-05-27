<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $table = 'transactions';

    protected $fillable = [
        'utilisateur_id', 'bon_id', 'reference', 'montant',
        'methode_paiement', 'statut', 'numero_telephone', 'details',
    ];

    protected $casts = [
        'montant' => 'decimal:2',
    ];

    public function utilisateur()
    {
        return $this->belongsTo(Utilisateur::class, 'utilisateur_id');
    }

    public function bon()
    {
        return $this->belongsTo(Bon::class, 'bon_id');
    }
}
