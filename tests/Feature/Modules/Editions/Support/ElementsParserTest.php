<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\ElementsParser;
use Tests\TestCase;

final class ElementsParserTest extends TestCase
{
    public function test_all_elements_are_migrated_and_parsed_and_one_wrong_one_refuses_them_all(): void
    {
        $errors = [];
        $parser = resolve(ElementsParser::class);

        self::assertSame(['space.01' => ['name' => 'A'], 'words.bank' => ['name' => 'Pot']], $parser->all(['space.01' => ['name' => 'A'], 'bank' => ['name' => 'Pot'], 'dice' => []], $errors));
        self::assertSame([], $parser->all([], $errors));
        self::assertNull($parser->all(['space.01' => ['name' => 'A'], 'space.02' => ['name' => 5]], $errors));
        self::assertSame(['elements.space.02.name: must be a string of at most 120 characters'], $errors);
    }

    public function test_changes_keep_null_for_a_known_key_only(): void
    {
        $errors = [];
        $parser = resolve(ElementsParser::class);

        self::assertSame(['space.02' => ['name' => 'B'], 'words.bank' => null], $parser->changes(['bank' => null, 'space.02' => ['name' => 'B']], $errors));
        self::assertNull($parser->changes(['space.99' => null], $errors));
        self::assertSame(['elements.space.99: unknown element key'], $errors);
    }

    public function test_the_elements_are_an_object_of_at_most_two_hundred_keys(): void
    {
        $errors = [];
        $parser = resolve(ElementsParser::class);
        $many = array_fill_keys(array_map(static fn (int $i): string => "pawn.{$i}", range(1, 201)), null);

        self::assertNull($parser->all(null, $errors));
        self::assertNull($parser->changes($many, $errors));
        self::assertSame(['elements: must be an object', 'elements: too many elements'], $errors);
    }
}
