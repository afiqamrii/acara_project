<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminInviteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only super admins can invite other admins
        return $this->user() && $this->user()->role === 'super_admin';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => 'required|string|email|max:255|unique:users,email',
        ];
    }
}
