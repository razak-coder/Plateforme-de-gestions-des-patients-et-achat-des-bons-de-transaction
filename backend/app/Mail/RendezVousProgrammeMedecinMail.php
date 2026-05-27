<?php

namespace App\Mail;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RendezVousProgrammeMedecinMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public RendezVous $rendezVous)
    {
    }

    public function build()
    {
        return $this
            ->subject('Nouveau rendez-vous programme')
            ->view('emails.rendez_vous_programme_medecin');
    }
}
