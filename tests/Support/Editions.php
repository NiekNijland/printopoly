<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Actions\Editions\StoreEdition;
use App\Edition\EditionValidator;
use App\Models\Edition;
use App\Models\User;

final class Editions
{
    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    public static function payload(string $id = 'e1', array $overrides = []): array
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
    public static function store(User $user, string $id = 'e1', array $overrides = []): Edition
    {
        $input = resolve(EditionValidator::class)->edition(self::payload($id, $overrides));

        return resolve(StoreEdition::class)->handle($user, $input);
    }
}
