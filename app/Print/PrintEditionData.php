<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Game\StandardEdition;
use App\Photos\PhotoPlacement;
use InvalidArgumentException;
use JsonException;
use stdClass;

/**
 * An edition as the print pipeline reads it: the `Edition` of
 * resources/js/lib/edition/types.ts, which is what the browser uploads for a
 * job without an account and what `EditionPayload` makes of a stored one.
 * `elements` holds only what differs from the standard data (B59), so the
 * cards that exist come from the standard edition, not from the keys.
 */
final readonly class PrintEditionData
{
    /**
     * Element fields that hold a photo placement: `background` is the photo over the board centre (B125),
     * `icon` the uploaded image of a special space (B136), whose placement sits in `icon.photo`.
     */
    private const array PHOTO_FIELDS = ['photo', 'background', 'icon'];

    /**
     * @param array<string, array<mixed>> $elements
     * @param array<mixed>|null $boardProfile
     * @param array<string, bool> $parts
     * @param bool $targetsDeclared The browser said which photos are visible and how large their frames are
     *                              (`withTargets`): a photo without a target is not shown and is not cropped.
     */
    public function __construct(
        public string $name,
        public ?string $language,
        public ?string $theme,
        public ?array $boardProfile,
        public array $elements,
        public array $parts = [],
        public ?string $currency = null,
        public bool $targetsDeclared = false,
    ) {
    }

    /**
     * @param array<mixed> $data
     *
     * @throws InvalidArgumentException
     */
    public static function fromArray(array $data): self
    {
        $elements = $data['elements'] ?? [];

        if ($elements instanceof stdClass) {
            $elements = (array) $elements;
        }

        if (! is_array($elements)) {
            throw new InvalidArgumentException('An edition has elements as an object.');
        }

        $clean = [];
        foreach ($elements as $key => $element) {
            if (! is_array($element)) {
                throw new InvalidArgumentException('Every element is an object.');
            }

            $clean[(string) $key] = $element;
        }

        return new self(
            name: is_string($data['name'] ?? null) ? $data['name'] : '',
            language: is_string($data['language'] ?? null) ? $data['language'] : null,
            theme: is_string($data['theme'] ?? null) ? $data['theme'] : null,
            boardProfile: is_array($data['boardProfile'] ?? null) ? $data['boardProfile'] : null,
            elements: $clean,
            parts: self::parts($data['parts'] ?? null),
            currency: is_string($data['currency'] ?? null) ? $data['currency'] : null,
        );
    }

    /**
     * Writes the frame size of each visible photo (`element#photo` to `{w, h}` in mm, with bleed) into
     * its placement. The frame size comes from the renderer geometry, which only the browser has
     * (resources/js/lib/print/photo-targets.ts).
     *
     * @param array<mixed> $targets
     */
    public function withTargets(array $targets): self
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

        return new self($this->name, $this->language, $this->theme, $this->boardProfile, $elements, $this->parts, $this->currency, true);
    }

    /**
     * @throws InvalidArgumentException
     */
    public static function fromJson(string $json): self
    {
        try {
            $data = json_decode($json, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidArgumentException('The edition is not valid JSON.');
        }

        if (! is_array($data)) {
            throw new InvalidArgumentException('The edition is not an object.');
        }

        return self::fromArray($data);
    }

    /**
     * Only the elements that are drawn on this part.
     */
    public function onlyFor(PrintPart $part): self
    {
        return new self(
            name: $this->name,
            language: $this->language,
            theme: $this->theme,
            boardProfile: $this->boardProfile,
            elements: $this->elementsFor($part),
            parts: $this->parts,
            currency: $this->currency,
            targetsDeclared: $this->targetsDeclared,
        );
    }

    /**
     * The elements drawn on a part. The cards part also gets the name of every space: a title deed carries the
     * name of its space (a renamed street prints renamed on its deed), and nothing else of the space.
     * The same holds for the rules booklet and the invitation.
     *
     * @return array<string, array<mixed>>
     */
    private function elementsFor(PrintPart $part): array
    {
        $elements = array_filter($this->elements, $part->ownsElement(...), ARRAY_FILTER_USE_KEY);

        // The booklet's price list and the invitation's little board carry the space names too, and the
        // invitation the name of the board centre.
        if (! in_array($part, [PrintPart::Cards, PrintPart::RulesBooklet, PrintPart::Invitation], true)) {
            return $elements;
        }

        foreach ($this->elements as $key => $element) {
            $named = str_starts_with($key, 'space.');

            if ($part === PrintPart::Invitation && $key === 'board_center') {
                // The little board shows the title of the centre as set: name, mode, subtitle and the photo shape.
                $elements[$key] = array_intersect_key($element, array_flip(['name', 'centerMode', 'subtitle', 'photoAspect', 'photoFrame']));

                continue;
            }

            if ($named && is_string($element['name'] ?? null)) {
                $elements[$key] = ['name' => $element['name']];
            }

            // The deed of a station or a utility and the standard back of a deck show the icon of the space (B136).
            if ($named && $part === PrintPart::Cards && is_array($element['icon'] ?? null)) {
                $elements[$key] = [...$elements[$key] ?? [], 'icon' => $element['icon']];
            }
        }

        return $elements;
    }

    public function locale(): Locale
    {
        return Locale::tryFrom($this->language ?? '') ?? Locale::default();
    }

    /**
     * The parts the edition has switched on (B99). A part that is not
     * mentioned counts as on; the board is always on. Deeds and cards both
     * end up in the "cards" print part.
     *
     * @return list<PrintPart>
     */
    public function enabledParts(): array
    {
        return array_values(array_filter(
            PrintPart::production(),
            fn (PrintPart $part): bool => $part === PrintPart::Board || ($part === PrintPart::Cards && $this->hasHouseRules()) || $this->isOn(match ($part) {
                PrintPart::Cards => ['deeds', 'cards'],
                PrintPart::Money => ['money'],
                PrintPart::Tokens => ['pawns'],
                PrintPart::BoxLid => ['boxLid'],
                default => [],
            }) || $this->isExtraOn($part),
        ));
    }

    /**
     * Title deeds and the two decks the edition has switched on. They come
     * from the standard edition (B100): an edition only stores overrides.
     */
    public function cardCount(): int
    {
        $standard = resolve(StandardEdition::class);
        $deeds = ($this->parts['deeds'] ?? true) ? $standard->components()['titleDeeds'] : 0;
        $decks = ($this->parts['cards'] ?? true) ? count($standard->deck('chance')) + count($standard->deck('chest')) : 0;

        return $deeds + $decks + ($this->hasHouseRules() ? 1 : 0);
    }

    /**
     * The house rules card is off unless the edition says so (B99), unlike the other parts: it prints with
     * the cards, as one more card.
     */
    public function hasHouseRules(): bool
    {
        return ($this->parts['houseRules'] ?? false) === true;
    }

    /**
     * The board profile for layout: the edition's own, or the default.
     *
     * @return array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float}
     */
    public function profile(): array
    {
        $outer = config()->float('printopoly.print.profile.outer');
        $corner = config()->float('printopoly.print.profile.corner');
        $lidWidth = config()->float('printopoly.print.profile.box_lid.w');
        $lidHeight = config()->float('printopoly.print.profile.box_lid.h');
        $profile = $this->boardProfile;

        if ($profile === null) {
            return ['outer' => $outer, 'corner' => $corner, 'border' => 0.0, 'panels' => 4, 'boxLidWidth' => $lidWidth, 'boxLidHeight' => $lidHeight];
        }

        $lid = is_array($profile['boxLid'] ?? null) ? $profile['boxLid'] : [];
        $profileOuter = $this->float($profile['outer'] ?? null, $outer);
        $profileCorner = $this->float($profile['corner'] ?? null, $corner);

        return [
            'outer' => $profileOuter,
            'corner' => $profileCorner,
            'border' => $this->float($profile['border'] ?? null, 0.0),
            'panels' => ($profile['panels'] ?? 4) === 2 ? 2 : 4,
            'boxLidWidth' => $this->float($lid['w'] ?? null, $lidWidth),
            'boxLidHeight' => $this->float($lid['h'] ?? null, $lidHeight),
        ];
    }

    /**
     * Every photo placement in the edition: the `photo` of an element and the
     * photo layers on it, in element key order.
     *
     * @return list<PhotoPlacement>
     */
    public function placements(): array
    {
        $elements = $this->elements;
        ksort($elements);

        $placements = [];
        foreach ($elements as $key => $element) {
            foreach (self::PHOTO_FIELDS as $field) {
                $photo = $this->photoAt($element, $field);

                if ($photo !== null) {
                    $placement = PhotoPlacement::fromArray($key . '#' . $field, $photo);

                    if ($placement instanceof PhotoPlacement && (! $this->targetsDeclared || $placement->targetWidthMm !== null)) {
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
     * The edition for the print page, with the signed URL of each cropped
     * photo written into its placement as `src`.
     *
     * @param array<string, string> $sources Placement key (`element#photo`) to URL.
     * @return array<string, mixed>
     */
    public function toPrintPayload(array $sources): array
    {
        $elements = $this->elements;

        foreach ($elements as $key => $element) {
            foreach (self::PHOTO_FIELDS as $field) {
                $photo = $this->photoAt($element, $field);

                if ($photo !== null && isset($sources[$key . '#' . $field])) {
                    $elements[$key] = $this->withPhoto($elements[$key], $field, [...$photo, 'src' => $sources[$key . '#' . $field]]);
                }
            }

            $layers = self::layers($element);

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

        return [
            'name' => $this->name,
            'language' => $this->language,
            'theme' => $this->theme,
            'currency' => $this->currency,
            'boardProfile' => $this->boardProfile,
            'parts' => (object) $this->parts,
            'elements' => (object) $elements,
        ];
    }

    /**
     * What goes into the cache key: everything that changes the picture.
     *
     * @return array<string, mixed>
     */
    public function toCacheArray(): array
    {
        return [
            'name' => $this->name,
            'language' => $this->language,
            'theme' => $this->theme,
            'currency' => $this->currency,
            'boardProfile' => $this->boardProfile,
            'parts' => $this->parts,
            'elements' => $this->elements,
        ];
    }

    /**
     * The extra print items (B123) are off unless the edition says so: they came after the first editions.
     */
    private function isExtraOn(PrintPart $part): bool
    {
        return match ($part) {
            PrintPart::RulesBooklet => ($this->parts['rulesBooklet'] ?? false) === true,
            PrintPart::FoldModels => ($this->parts['foldModels'] ?? false) === true,
            PrintPart::Dice => ($this->parts['dice'] ?? false) === true,
            PrintPart::Invitation => ($this->parts['invitation'] ?? false) === true,
            default => false,
        };
    }

    /**
     * @param list<string> $names
     */
    private function isOn(array $names): bool
    {
        return array_any($names, fn (string $name): bool => ($this->parts[$name] ?? true) !== false);
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

    /**
     * @return array<string, bool>
     */
    private static function parts(mixed $value): array
    {
        $parts = [];

        foreach (is_array($value) ? $value : [] as $key => $on) {
            if (is_bool($on)) {
                $parts[(string) $key] = $on;
            }
        }

        return $parts;
    }

    private function float(mixed $value, float $default): float
    {
        return is_numeric($value) ? (float) $value : $default;
    }
}
