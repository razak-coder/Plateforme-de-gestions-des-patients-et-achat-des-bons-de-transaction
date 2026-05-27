<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TypeBon;
use Illuminate\Http\Request;

class TypeBonController extends Controller
{
    public function index()
    {
        $typeBons = TypeBon::orderBy('nom')->get();
        return response()->json(['success' => true, 'data' => $typeBons]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'           => 'required|string|max:100',
            'description'   => 'nullable|string',
            'prix'          => 'required|numeric|min:0',
            'specialite'    => 'required|string|max:100',
            'validite_jours'=> 'required|integer|min:1',
            'actif'         => 'boolean',
        ]);

        $data['specialite'] = trim((string) $data['specialite']);
        if ($data['specialite'] === '') {
            return response()->json([
                'success' => false,
                'message' => 'La spécialité est obligatoire.',
            ], 422);
        }

        $typeBon = TypeBon::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Type de bon créé avec succès.',
            'data'    => $typeBon,
        ], 201);
    }

    public function show(TypeBon $typeBon)
    {
        return response()->json(['success' => true, 'data' => $typeBon]);
    }

    public function update(Request $request, TypeBon $typeBon)
    {
        $data = $request->validate([
            'nom'           => 'sometimes|string|max:100',
            'description'   => 'nullable|string',
            'prix'          => 'sometimes|numeric|min:0',
            'specialite'    => 'sometimes|string|max:100',
            'validite_jours'=> 'sometimes|integer|min:1',
            'actif'         => 'boolean',
        ]);

        if (array_key_exists('specialite', $data)) {
            $data['specialite'] = trim((string) $data['specialite']);
            if ($data['specialite'] === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'La spécialité est obligatoire pour un type de bon.',
                ], 422);
            }
        }

        $typeBon->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Type de bon mis à jour.',
            'data'    => $typeBon,
        ]);
    }

    public function destroy(TypeBon $typeBon)
    {
        if ($typeBon->bons()->count() > 0) {
            $typeBon->update(['actif' => false]);
            return response()->json([
                'success' => true,
                'message' => 'Type de bon désactivé (des bons existe avec ce type).',
            ]);
        }

        $typeBon->delete();
        return response()->json(['success' => true, 'message' => 'Type de bon supprimé.']);
    }
}
