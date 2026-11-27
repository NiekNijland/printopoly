<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

/**
 * @phpstan-type Photo array{photoId: string, cx: int|float, cy: int|float, scale: int|float, rotation: int|float, grayscale: bool, fit?: true}
 */
final readonly class PhotoParser
{
    /**
     * @param list<string> $errors
     * @return Photo|null
     */
    public function parse(mixed $value, string $at, array &$errors): ?array
    {
        if (! JsonValue::isObject($value)) {
            $errors[] = "{$at}: photo must be an object";

            return null;
        }

        $photoId = $value['photoId'] ?? null;
        $cx = $value['cx'] ?? null;
        $cy = $value['cy'] ?? null;
        $scale = $value['scale'] ?? null;
        $rotation = $value['rotation'] ?? null;
        $grayscale = $value['grayscale'] ?? null;
        $fit = $value['fit'] ?? null;
        $valid = true;

        if ($fit !== null && ! is_bool($fit)) {
            $errors[] = "{$at}: fit must be a boolean";
            $valid = false;
        }

        if (! is_string($photoId) || $photoId === '' || strlen($photoId) > 128) {
            $errors[] = "{$at}: photoId must be a non-empty string";
            $valid = false;
        }

        if (! JsonValue::isNumber($cx) || $cx < 0 || $cx > 1 || ! JsonValue::isNumber($cy) || $cy < 0 || $cy > 1) {
            $errors[] = "{$at}: cx and cy must be between 0 and 1";
            $valid = false;
        }

        if (! JsonValue::isNumber($scale) || $scale <= 0) {
            $errors[] = "{$at}: scale must be greater than 0";
            $valid = false;
        }

        if (! JsonValue::isNumber($rotation)) {
            $errors[] = "{$at}: rotation must be a number";
            $valid = false;
        }

        if (! is_bool($grayscale)) {
            $errors[] = "{$at}: grayscale must be a boolean";
            $valid = false;
        }

        if (! $valid) {
            return null;
        }

        $photo = [
            'photoId' => $photoId,
            'cx' => $cx,
            'cy' => $cy,
            'scale' => $scale,
            'rotation' => $rotation,
            'grayscale' => $grayscale,
        ];

        return $fit === true ? [...$photo, 'fit' => true] : $photo;
    }
}
