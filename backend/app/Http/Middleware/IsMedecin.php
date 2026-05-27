<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class IsMedecin
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth('api')->user();

        if (!$user || !$user->isMedecin() || !$user->medecin_id) {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Compte praticien requis (lié à une fiche médecin).',
            ], 403);
        }

        return $next($request);
    }
}
