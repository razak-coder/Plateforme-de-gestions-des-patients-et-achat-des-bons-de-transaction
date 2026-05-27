<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Consultation;
use App\Models\RendezVous;
use Illuminate\Http\JsonResponse;

trait AuthorizesMedecinAccess
{
    protected function denyUnlessMedecinOwnsRendezVous(RendezVous $rdv): ?JsonResponse
    {
        $user = auth('api')->user();
        if ($user->isAdmin()) {
            return null;
        }
        if (!$user->isMedecin()) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }
        if (!$user->medecin_id || (int) $user->medecin_id !== (int) $rdv->medecin_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ce rendez-vous ne fait pas partie de votre agenda.',
            ], 403);
        }

        return null;
    }

    protected function denyUnlessMedecinOwnsConsultation(Consultation $consultation): ?JsonResponse
    {
        $user = auth('api')->user();
        if ($user->isAdmin()) {
            return null;
        }
        if (!$user->isMedecin()) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }
        if (!$user->medecin_id || (int) $user->medecin_id !== (int) $consultation->medecin_id) {
            return response()->json([
                'success' => false,
                'message' => 'Cette consultation ne vous est pas attribuée.',
            ], 403);
        }

        return null;
    }
}
