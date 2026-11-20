<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Actions\Editions\StoreEdition;
use App\Edition\EditionValidator;
use App\Models\Edition;
use App\Models\User;

/**
 * Edition payloads the way the browser sends them, and editions stored for a
 * user without going through HTTP.
 */
trait MakesEditions
{
    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    protected function editionPayload(string $id = 'e1', array $overrides = []): array
    {
        return [
            'schemaVersion' => 1,
            'id' => $id,
            'name' => 'Zaterdagclub',
            'language' => 'nl',
            'currency' => 'eur',
            'theme' => 'classic',
            'boardProfile' => [
                'id' => 'modern-square',
                'name' => 'Modern vierkant',
                'outer' => 500,
                'corner' => 70,
                'border' => 0,
                'panels' => 4,
                'boxLid' => ['w' => 267, 'h' => 267],
                'provisional' => true,
            ],
            'parts' => [
                'board' => true,
                'deeds' => true,
                'cards' => true,
                'money' => false,
                'pawns' => false,
                'boxLid' => false,
                'houseRules' => false,
            ],
            'elements' => [],
            'revision' => 0,
            'createdAt' => 1_000,
            'updatedAt' => 1_000,
            ...$overrides,
        ];
    }

    /**
     * @param array<string, mixed> $overrides
     */
    protected function storeEdition(User $user, string $id = 'e1', array $overrides = []): Edition
    {
        $input = app(EditionValidator::class)->edition($this->editionPayload($id, $overrides));

        return app(StoreEdition::class)->handle($user, $input);
    }
}
