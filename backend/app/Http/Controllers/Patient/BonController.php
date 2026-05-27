<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Http\Requests\AchatBonRequest;
use App\Models\Bon;
use App\Models\TypeBon;
use App\Services\BonService;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class BonController extends Controller
{
    protected BonService $bonService;
    protected NotificationService $notificationService;

    public function __construct(BonService $bonService, NotificationService $notificationService)
    {
        $this->bonService          = $bonService;
        $this->notificationService = $notificationService;
    }

    public function typesDisponibles()
    {
        $types = TypeBon::actif()
            ->whereNotNull('specialite')
            ->where('specialite', '!=', '')
            ->orderBy('prix')
            ->get();

        return response()->json(['success' => true, 'data' => $types]);
    }

    public function mesBons(Request $request)
    {
        $perPage = (int) $request->get('limit', 10);

        $bons = Bon::with('typeBon')
            ->where('utilisateur_id', auth('api')->id())
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json(['success' => true, 'data' => $bons]);
    }

    public function show(Bon $bon)
    {
        if ($bon->utilisateur_id !== auth('api')->id()) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => $bon->load('typeBon'),
        ]);
    }

    public function acheter(AchatBonRequest $request)
    {
        $typeBon = TypeBon::findOrFail($request->type_bon_id);

        if (!$typeBon->actif) {
            return response()->json([
                'success' => false,
                'message' => 'Ce type de bon n\'est plus disponible.',
            ], 422);
        }

        if (!filled(trim((string) $typeBon->specialite))) {
            return response()->json([
                'success' => false,
                'message' => 'Ce type de bon n\'est pas lié à une spécialité. Impossible de l\'acheter.',
            ], 422);
        }

        $utilisateur = auth('api')->user();
        $result = $this->bonService->acheterBon($utilisateur, $typeBon, $request->all());

        if ($result['succes']) {
            $this->notificationService->notifierAchatBon(
                $utilisateur,
                $result['bon']->code_unique,
                $typeBon->nom
            );
        }

        $status = $result['succes'] ? 201 : 422;
        return response()->json($result, $status);
    }
}
