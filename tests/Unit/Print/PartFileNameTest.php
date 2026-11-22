<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class PartFileNameTest extends TestCase
{
    /**
     * R5-15: the order sheet said "Pawns (…-04-tokens.pdf)", and Emma wondered whether tokens were something else.
     */
    #[Test]
    public function it_names_the_pawns_file_after_the_pawns(): void
    {
        self::assertSame('pawns', PrintPart::Tokens->fileName(Locale::English));
        self::assertSame('pionnen', PrintPart::Tokens->fileName(Locale::Dutch));
        self::assertSame('test-sheet', PrintPart::Calibration->fileName(Locale::English));
    }
}
