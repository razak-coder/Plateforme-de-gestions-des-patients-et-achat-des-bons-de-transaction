<?php

namespace App\Services;

use App\Models\Journal;

class AuditService
{
    public function log(
        string $action,
        ?string $modele = null,
        $modeleId = null,
        ?string $description = null
    ): void {
        Journal::create([
            'id_utilisateur' => auth('api')->id(),
            'action'         => $action,
            'modele'         => $modele,
            'modele_id'      => $modeleId,
            'description'    => $description,
            'ip_adresse'     => request()?->ip(),
        ]);
    }
}
