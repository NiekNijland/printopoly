<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\ElementFieldParser;
use App\Modules\Editions\Support\LayerParser;
use App\Modules\Editions\Support\PhotoParser;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ElementFieldParserTest extends TestCase
{
    /**
     * @return iterable<string, array{string, mixed, string|null}>
     */
    public static function fields(): iterable
    {
        yield 'a name within its limit' => ['name', 'abc', null];
        yield 'a name past its limit' => ['name', 'abcd', 'must be a string of at most 3 characters'];
        yield 'a text within its limit' => ['text', 'abcde', null];
        yield 'a text past its limit' => ['text', 'abcdef', 'must be a string of at most 5 characters'];
        yield 'a purpose' => ['purpose', str_repeat('x', 60), null];
        yield 'a colour' => ['color', '#0a0B0c', null];
        yield 'a colour with a name' => ['color', 'red', 'must be a colour like #FFFDF7'];
        yield 'a pattern' => ['pattern', 'waves', null];
        yield 'a flag' => ['logoTilt', false, null];
        yield 'a flag as text' => ['titleBand', 'false', 'must be a boolean'];
        yield 'a title style' => ['titleStyle', 'plain', null];
        yield 'a photo aspect at its edge' => ['photoAspect', 0.05, null];
        yield 'a photo aspect past its edge' => ['photoAspect', 20.5, 'must be a number between 0.05 and 20'];
        yield 'a title offset as text' => ['titleOffset', '0', 'must be a number from -1 to 1'];
        yield 'a title scale at its edge' => ['titleScale', 1, null];
    }

    #[DataProvider('fields')]
    public function test_a_field_passes_or_names_its_rule(string $field, mixed $value, ?string $message): void
    {
        $errors = [];

        $parsed = new ElementFieldParser(new PhotoParser(), new LayerParser(new PhotoParser()))->parse($field, $value, 'at', $errors, ['name' => 3, 'text' => 5]);

        self::assertSame($message === null ? $value : null, $parsed);
        self::assertSame($message === null ? [] : ["at: {$message}"], $errors);
    }

    public function test_a_photo_a_background_and_layers_go_to_their_parsers(): void
    {
        $errors = [];
        $parser = new ElementFieldParser(new PhotoParser(), new LayerParser(new PhotoParser()));

        self::assertNull($parser->parse('photo', 'x', 'at', $errors, ['name' => 1, 'text' => 1]));
        self::assertNull($parser->parse('background', 'x', 'at', $errors, ['name' => 1, 'text' => 1]));
        self::assertSame([], $parser->parse('layers', [], 'at', $errors, ['name' => 1, 'text' => 1]));
        self::assertSame(['at: photo must be an object', 'at: photo must be an object'], $errors);
    }
}
