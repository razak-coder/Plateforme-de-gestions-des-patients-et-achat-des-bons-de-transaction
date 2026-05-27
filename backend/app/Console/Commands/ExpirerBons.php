<?php

namespace App\Console\Commands;

use App\Models\Bon;
use Illuminate\Console\Command;

class ExpirerBons extends Command
{
    protected $signature   = 'bons:expirer';
    protected $description = 'Marque comme expirés tous les bons valides dont la date d\'expiration est dépassée.';

    public function handle(): int
    {
        $count = Bon::where('statut', 'valide')
            ->where('date_expiration', '<', now())
            ->update(['statut' => 'expire']);

        $this->info("{$count} bon(s) marqué(s) comme expirés.");
        return Command::SUCCESS;
    }
}
