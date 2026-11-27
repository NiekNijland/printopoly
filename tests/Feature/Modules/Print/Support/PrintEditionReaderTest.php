<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Support\PrintEditionReader;
use InvalidArgumentException;
use Tests\TestCase;

final class PrintEditionReaderTest extends TestCase
{
    public function test_json_that_is_not_an_edition_is_refused(): void
    {
        foreach (['{', '"text"', '{"elements": 5}', '{"elements": {"space.01": 5}}'] as $json) {
            try {
                resolve(PrintEditionReader::class)->fromJson($json);
                self::fail('accepted ' . $json);
            } catch (InvalidArgumentException $invalidArgumentException) {
                self::assertNotSame('', $invalidArgumentException->getMessage());
            }
        }
    }

    public function test_the_fields_are_read_with_defaults_for_what_is_missing_or_of_the_wrong_type(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromJson('{"name": 5, "elements": {}, "parts": {"money": false, "board": "yes"}, "moneyAmount": "eight"}');

        self::assertSame('', $edition->name);
        self::assertNull($edition->language);
        self::assertNull($edition->theme);
        self::assertNull($edition->currency);
        self::assertNull($edition->boardProfile);
        self::assertSame([], $edition->elements);
        self::assertSame(['money' => false], $edition->parts);
        self::assertSame(MoneyAmount::Eight, $edition->moneyAmount);
        self::assertSame(1, $edition->sets);
        self::assertSame(4, $edition->invitations);
        self::assertSame(BoardForm::Panels, $edition->boardForm);
        self::assertFalse($edition->targetsDeclared);
        self::assertSame(Locale::default(), $edition->locale());
        self::assertSame(Locale::English, resolve(PrintEditionReader::class)->fromArray(['language' => 'en', 'elements' => []])->locale());
    }
}
