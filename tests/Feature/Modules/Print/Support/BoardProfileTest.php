<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Print\Support\BoardProfile;
use App\Modules\Print\Support\PrintEditionReader;
use Tests\TestCase;

final class BoardProfileTest extends TestCase
{
    public function test_the_board_profile_is_the_editions_own_or_the_configured_default(): void
    {
        self::assertSame(
            ['outer' => 500.0, 'corner' => 70.0, 'border' => 0.0, 'panels' => 4, 'boxLidWidth' => 267.0, 'boxLidHeight' => 267.0],
            BoardProfile::of(resolve(PrintEditionReader::class)->fromArray(['elements' => []])),
        );
        self::assertSame(
            ['outer' => 450.0, 'corner' => 70.0, 'border' => 5.0, 'panels' => 2, 'boxLidWidth' => 200.0, 'boxLidHeight' => 267.0],
            BoardProfile::of(resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'boardProfile' => ['outer' => 450, 'corner' => 'wide', 'border' => 5, 'panels' => 2, 'boxLid' => ['w' => 200]]])),
        );
        self::assertSame(4, BoardProfile::of(resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'boardProfile' => ['panels' => 3]]))['panels']);
    }
}
