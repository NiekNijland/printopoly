<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Print;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use PHPUnit\Framework\TestCase;

final class PartFileNameTest extends TestCase
{
    /**
     * R5-15: the order sheet said "Pawns (…-04-tokens.pdf)", and Emma wondered whether tokens were something else.
     */
    public function test_it_names_the_pawns_file_after_the_pawns(): void
    {
        self::assertSame('pawns', PrintPart::TOKENS->fileName(Locale::ENGLISH));
        self::assertSame('pionnen', PrintPart::TOKENS->fileName(Locale::DUTCH));
        self::assertSame('test-sheet', PrintPart::CALIBRATION->fileName(Locale::ENGLISH));
    }
}
