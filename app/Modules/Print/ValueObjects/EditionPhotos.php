<?php

declare(strict_types=1);

namespace App\Modules\Print\ValueObjects;

use App\Modules\Photos\ValueObjects\PhotoPlacement;

/**
 * The photos on the elements of an edition: the placement in each photo field and in each photo layer.
 */
final readonly class EditionPhotos
{
    /**
     * Element fields that hold a photo placement: `background` is the photo over the board centre (B125),
     * `icon` the uploaded image of a special space (B136), whose placement sits in `icon.photo`.
     */
    private const array PHOTO_FIELDS = ['photo', 'background', 'icon'];

    /**
     * @param array<string, array<mixed>> $elements
     */
    public function __construct(private array $elements)
    {
    }

    /**
     * The elements with the frame size of each visible photo written into its placement; a photo without a valid
     * target loses the target it had.
     *
     * @param array<mixed> $targets
     * @return array<string, array<mixed>>
     */
    public function withTargets(array $targets): array
    {
        $elements = $this->elements;

        foreach ($elements as $key => $element) {
            foreach (self::PHOTO_FIELDS as $field) {
                $photo = $this->photoAt($element, $field);
                $target = $targets[$key . '#' . $field] ?? null;

                if ($photo === null) {
                    continue;
                }

                if (is_array($target) && is_numeric($target['w'] ?? null) && is_numeric($target['h'] ?? null)) {
                    $width = (float) $target['w'];
                    $height = (float) $target['h'];

                    if ($width > 0 && $width <= 2000 && $height > 0 && $height <= 2000) {
                        $elements[$key] = $this->withPhoto($elements[$key], $field, [...$photo, 'target' => ['w' => $width, 'h' => $height]]);

                        continue;
                    }
                }

                unset($photo['target']);
                $elements[$key] = $this->withPhoto($elements[$key], $field, $photo);
            }
        }

        return $elements;
    }

    /**
     * Every placement in element key order. Once the browser declared the targets, a photo without one is left out.
     *
     * @return list<PhotoPlacement>
     */
    public function placements(bool $targetsDeclared): array
    {
        $elements = $this->elements;
        ksort($elements);

        $placements = [];
        foreach ($elements as $key => $element) {
            foreach (self::PHOTO_FIELDS as $field) {
                $photo = $this->photoAt($element, $field);

                if ($photo !== null) {
                    $placement = PhotoPlacement::fromArray($key . '#' . $field, $photo);

                    if ($placement instanceof PhotoPlacement && (! $targetsDeclared || $placement->targetWidthMm !== null)) {
                        $placements[] = $placement;
                    }
                }
            }

            foreach ($this->layers($element) as $layer) {
                $layerPhoto = $layer['photo'] ?? null;
                $id = $layer['id'] ?? null;

                if (($layer['kind'] ?? null) === 'photo' && is_array($layerPhoto) && is_string($id)) {
                    $placement = PhotoPlacement::fromArray($key . '#layer:' . $id, $layerPhoto, $layer);

                    if ($placement instanceof PhotoPlacement) {
                        $placements[] = $placement;
                    }
                }
            }
        }

        return $placements;
    }

    /**
     * The elements with the URL of each cropped photo written into its placement as `src`.
     *
     * @param array<string, string> $sources Placement key (`element#photo`) to URL.
     * @return array<string, array<mixed>>
     */
    public function withSources(array $sources): array
    {
        $elements = $this->elements;

        foreach ($elements as $key => $element) {
            foreach (self::PHOTO_FIELDS as $field) {
                $photo = $this->photoAt($element, $field);

                if ($photo !== null && isset($sources[$key . '#' . $field])) {
                    $elements[$key] = $this->withPhoto($elements[$key], $field, [...$photo, 'src' => $sources[$key . '#' . $field]]);
                }
            }

            $layers = $this->layers($element);

            foreach ($layers as $index => $layer) {
                $id = $layer['id'] ?? null;
                $layerPhoto = $layer['photo'] ?? null;

                if (is_array($layerPhoto) && is_string($id) && isset($sources[$key . '#layer:' . $id])) {
                    $layers[$index]['photo'] = [...$layerPhoto, 'src' => $sources[$key . '#layer:' . $id]];
                }
            }

            if ($layers !== []) {
                $elements[$key]['layers'] = $layers;
            }
        }

        return $elements;
    }

    /**
     * The placement in a photo field: the field itself, or `icon.photo` for an uploaded icon (B136).
     *
     * @param array<mixed> $element
     * @return array<mixed>|null
     */
    private function photoAt(array $element, string $field): ?array
    {
        $value = $element[$field] ?? null;

        if ($field === 'icon') {
            $value = is_array($value) ? $value['photo'] ?? null : null;
        }

        return is_array($value) ? $value : null;
    }

    /**
     * @param array<mixed> $element
     * @param array<mixed> $photo
     * @return array<mixed>
     */
    private function withPhoto(array $element, string $field, array $photo): array
    {
        if ($field === 'icon') {
            $icon = is_array($element['icon'] ?? null) ? $element['icon'] : [];
            $element['icon'] = [...$icon, 'photo' => $photo];

            return $element;
        }

        $element[$field] = $photo;

        return $element;
    }

    /**
     * @param array<mixed> $element
     * @return array<int, array<mixed>>
     */
    private function layers(array $element): array
    {
        $layers = [];

        foreach (is_array($element['layers'] ?? null) ? $element['layers'] : [] as $index => $layer) {
            if (is_array($layer) && is_int($index)) {
                $layers[$index] = $layer;
            }
        }

        return $layers;
    }
}
