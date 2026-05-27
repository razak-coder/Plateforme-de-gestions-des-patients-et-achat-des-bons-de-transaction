<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class IsPatient
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth('api')->user();

        if (!$user || !$user->isPatient()) {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Accès patient requis.',
            ], 403);
        }

        return $next($request);
    }
}
