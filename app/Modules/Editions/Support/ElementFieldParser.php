<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;
use Closure;

final readonly class ElementFieldParser
{
    public function __construct(private PhotoParser $photos, private LayerParser $layers)
    {
    }

    /**
     * @param list<string> $errors
     * @param array{name: int, text: int} $limits
     */
    public function parse(string $field, mixed $value, string $at, array &$errors, array $limits): mixed
    {
        if ($field === 'photo' || $field === 'background') {
            return $this->photos->parse($value, $at, $errors);
        }

        $rule = $this->rule($field, $limits);

        if ($rule === null) {
            return $this->layers->parse($value, $at, $errors);
        }

        if ($rule[0]($value)) {
            return $value;
        }

        $errors[] = "{$at}: {$rule[1]}";

        return null;
    }

    /**
     * @param array{name: int, text: int} $limits
     * @return array{Closure(mixed): bool, string}|null
     */
    private function rule(string $field, array $limits): ?array
    {
        return match ($field) {
            'name', 'town', 'subtitle' => $this->text($limits['name']),
            'purpose' => $this->text(EditionValidator::MAX_PURPOSE_LENGTH),
            'text' => $this->text($limits['text']),
            'color' => [static fn (mixed $value): bool => is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1, 'must be a colour like #FFFDF7'],
            'pattern' => [static fn (mixed $value): bool => is_string($value) && in_array($value, ElementKind::PATTERNS, true), 'must be one of the built-in patterns'],
            'hidden', 'photoFrame', 'titleHidden', 'titleBand', 'logoTilt' => [is_bool(...), 'must be a boolean'],
            'photoStyle' => [static fn (mixed $value): bool => $value === 'framed' || $value === 'full', 'must be "framed" or "full"'],
            'titleStyle' => [static fn (mixed $value): bool => is_string($value) && in_array($value, ElementKind::TITLE_STYLES, true), 'must be one of ' . implode(', ', ElementKind::TITLE_STYLES)],
            'centerPlace' => [static fn (mixed $value): bool => $value === 'bottomLeft' || $value === 'middle', 'must be "bottomLeft" or "middle"'],
            'centerMode' => [static fn (mixed $value): bool => is_string($value) && in_array($value, ['name', 'photo', 'logo'], true), 'must be "name", "photo" or "logo"'],
            'photoAspect' => $this->number(EditionValidator::MIN_ASPECT, EditionValidator::MAX_ASPECT, 'must be a number between ' . EditionValidator::MIN_ASPECT . ' and ' . EditionValidator::MAX_ASPECT),
            'titleOffset' => $this->number(-1, 1, 'must be a number from -1 to 1'),
            'titleScale' => $this->number(EditionValidator::MIN_TITLE_SCALE, 1, 'must be a number from ' . EditionValidator::MIN_TITLE_SCALE . ' to 1'),
            default => null,
        };
    }

    /**
     * @return array{Closure(mixed): bool, string}
     */
    private function text(int $max): array
    {
        return [static fn (mixed $value): bool => JsonValue::isString($value, $max), "must be a string of at most {$max} characters"];
    }

    /**
     * @return array{Closure(mixed): bool, string}
     */
    private function number(int|float $min, int|float $max, string $message): array
    {
        return [static fn (mixed $value): bool => JsonValue::isNumber($value) && $value >= $min && $value <= $max, $message];
    }
}
