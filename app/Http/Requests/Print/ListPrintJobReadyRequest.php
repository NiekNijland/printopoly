<?php

declare(strict_types=1);

namespace App\Http\Requests\Print;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Body: `tokens`, a list of at most 50 job tokens.
 */
final class ListPrintJobReadyRequest extends FormRequest
{
    public const int MAX_TOKENS = 50;

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'tokens' => ['present', 'array', 'max:' . self::MAX_TOKENS],
            'tokens.*' => ['string', 'regex:/^[A-Za-z0-9]{40}$/'],
        ];
    }

    /**
     * @return list<string>
     */
    public function tokens(): array
    {
        $tokens = [];

        foreach ($this->safe()->array('tokens') as $token) {
            if (is_string($token)) {
                $tokens[$token] = $token;
            }
        }

        return array_values($tokens);
    }
}
