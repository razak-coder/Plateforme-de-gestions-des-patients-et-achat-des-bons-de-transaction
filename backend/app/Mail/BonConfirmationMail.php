<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BonConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $nomComplet;
    public string $codeBon;
    public string $typeBon;
    public string $montant;
    public string $dateExpiration;

    public function __construct(
        string $nomComplet,
        string $codeBon,
        string $typeBon,
        string $montant,
        string $dateExpiration
    ) {
        $this->nomComplet     = $nomComplet;
        $this->codeBon        = $codeBon;
        $this->typeBon        = $typeBon;
        $this->montant        = $montant;
        $this->dateExpiration = $dateExpiration;
    }

    public function build()
    {
        return $this
            ->subject("✅ Votre bon CTM-Consult — {$this->codeBon}")
            ->view('emails.bon_confirmation');
    }
}
