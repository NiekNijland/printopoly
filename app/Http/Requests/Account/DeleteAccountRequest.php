<?php

declare(strict_types=1);

namespace App\Http\Requests\Account;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;

/**
 * The confirmation is checked here, not only in the dialog: the request must carry the e-mail address of the account,
 * typed by the user.
 */
final class DeleteAccountRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'confirmation' => ['required', 'string'],
        ];
    }

    /**
     * @return list<Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->user();
                $typed = Str::lower(Str::trim($this->string('confirmation')->toString()));

                if (! $validator->errors()->has('confirmation') && (! $user instanceof User || $typed !== Str::lower($user->email))) {
                    $validator->errors()->add('confirmation', __('account.delete_confirmation_mismatch'));
                }
            },
        ];
    }
}
