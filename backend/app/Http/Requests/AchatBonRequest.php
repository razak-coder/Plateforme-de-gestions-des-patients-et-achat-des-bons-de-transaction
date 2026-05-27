<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AchatBonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type_bon_id'      => 'required|exists:type_bons,id',
            'methode_paiement' => 'required|in:mobile_money,carte,especes,virement',
            'numero_telephone' => 'required_if:methode_paiement,mobile_money|nullable|string|max:20',
            'notes'            => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'type_bon_id.required'       => 'Le type de bon est obligatoire.',
            'type_bon_id.exists'         => 'Ce type de bon n\'existe pas.',
            'methode_paiement.required'  => 'La méthode de paiement est obligatoire.',
            'methode_paiement.in'        => 'La méthode de paiement n\'est pas valide.',
            'numero_telephone.required_if' => 'Le numéro de téléphone est requis pour Mobile Money.',
        ];
    }
}
