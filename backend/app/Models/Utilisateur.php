<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class Utilisateur extends Authenticatable implements JWTSubject
{
    use Notifiable;

    protected $table = 'utilisateurs';

    protected $primaryKey = 'id_utilisateur';
    public $incrementing = true;

    protected $fillable = [
        'nom', 'prenom', 'email', 'telephone', 'password', 'role', 'medecin_id', 'actif',
        'numero_patient', 'date_naissance', 'sexe', 'groupe_sanguin', 'adresse',
        'doit_changer_mdp',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function (Utilisateur $utilisateur) {
            if ($utilisateur->role === 'patient' && empty($utilisateur->numero_patient)) {
                $annee = \Carbon\Carbon::now()->year;

                // Verrou de table pour éviter les doublons concurrents
                $seq = \DB::transaction(function () use ($annee) {
                    return static::where('role', 'patient')
                        ->whereYear('created_at', $annee)
                        ->lockForUpdate()
                        ->count() + 1;
                });

                $utilisateur->numero_patient = 'PAT-' . $annee . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    protected $hidden = ['password', 'remember_token'];

    protected $appends = ['nom_complet', 'actif', 'statut'];

    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    public function getActifAttribute(): bool
    {
        return ($this->attributes['statut'] ?? 'inactif') === 'actif';
    }

    public function setActifAttribute($value)
    {
        $this->attributes['statut'] = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'actif' : 'inactif';
    }

    public function getStatutAttribute(): string
    {
        return $this->attributes['statut'] ?? 'inactif';
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'role'       => $this->role,
            'medecin_id' => $this->medecin_id,
        ];
    }

    public function bons()
    {
        return $this->hasMany(Bon::class, 'utilisateur_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'utilisateur_id');
    }

    public function journals()
    {
        // La table journals utilise 'id_utilisateur' comme clé étrangère
        return $this->hasMany(Journal::class, 'id_utilisateur', 'id_utilisateur');
    }

    public function dossiers()
    {
        return $this->hasMany(DossierPatient::class, 'utilisateur_id', 'id_utilisateur');
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class, 'utilisateur_id', 'id_utilisateur');
    }

    public function ficheMedecin()
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isPatient(): bool
    {
        return $this->role === 'patient';
    }

    public function isMedecin(): bool
    {
        return $this->role === 'medecin';
    }

    public function getNomCompletAttribute(): string
    {
        return "{$this->prenom} {$this->nom}";
    }
}
