<?php

declare(strict_types=1);

namespace App\Print;

use App\Edition\ElementKind;
use App\Enums\BoardForm;
use App\Enums\MoneyAmount;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Game\StandardEdition;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use InvalidArgumentException;
use JsonException;
use stdClass;

/**
 * An edition as the print pipeline reads it: the `Edition` of
 * resources/js/lib/edition/types.ts, which is what the browser uploads for a
 * job without an account and what `EditionPayload` makes of a stored one.
 * `elements` holds only what differs from the standard data (B59), so the
 * cards that exist come from the standard edition, plus the extra cards an
 * edition added (B135).
 */
final readonly class PrintEditionData
{
    /**
     * Element fields that hold a photo placement: `background` is the photo over the board centre (B125),
     * `icon` the uploaded image of a special space (B136), whose placement sits in `icon.photo`.
     */
    private const array PHOTO_FIELDS = ['photo', 'background', 'icon'];

    /** The photo frame of a title deed in mm (B124, B218): `DEED_PHOTO` in resources/js/lib/edition/deed-photos.ts. */
    private const float DEED_PHOTO_WIDTH = 54.0;

    private const float DEED_PHOTO_HEIGHT = 16.5;

    /** The strip of a photo over the full width of a title deed, bleed included (B253): `DEED_FULL_PHOTO`. */
    private const float DEED_FULL_PHOTO_WIDTH = 69.0;

    private const float DEED_FULL_PHOTO_HEIGHT = 18.0;

    /** The height in a photo where faces usually are, a third from the top: `FACE_LINE` in lib/photos/transform.ts. */
    private const float FACE_LINE = 1 / 3;

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
        public ?MoneyAmount $moneyAmount = null,
        public bool $moneyLeftOut = false,
        public int $sets = 1,
        public BoardForm $boardForm = BoardForm::Panels,
        public int $invitations = PrintJob::DEFAULT_INVITATIONS,
    ) {
    }

    /**
     * @param array<mixed> $data
     * @param array<string, array{width: int, height: int}> $photoSizes Pixel sizes by photo ref: with them a deed
     *                                                                  that borrows the photo of its space gets the
     *                                                                  crop of its own frame, as in the browser (B239).
     *
     * @throws InvalidArgumentException
     */
    public static function fromArray(array $data, array $photoSizes = []): self
    {
        $elements = $data['elements'] ?? [];

        if ($elements instanceof stdClass) {
            $elements = (array) $elements;
        }

        throw_unless(is_array($elements), InvalidArgumentException::class, 'An edition has elements as an object.');

        $clean = [];
        foreach ($elements as $key => $element) {
            throw_unless(is_array($element), InvalidArgumentException::class, 'Every element is an object.');

            $clean[(string) $key] = $element;
        }

        return new self(
            name: is_string($data['name'] ?? null) ? $data['name'] : '',
            language: is_string($data['language'] ?? null) ? $data['language'] : null,
            theme: is_string($data['theme'] ?? null) ? $data['theme'] : null,
            boardProfile: is_array($data['boardProfile'] ?? null) ? $data['boardProfile'] : null,
            elements: self::withDeedPhotos($clean, $photoSizes),
            parts: self::parts($data['parts'] ?? null),
            currency: is_string($data['currency'] ?? null) ? $data['currency'] : null,
            moneyAmount: MoneyAmount::tryFrom(is_string($data['moneyAmount'] ?? null) ? $data['moneyAmount'] : ''),
        );
    }

    /**
     * Writes the photo of each street, station and utility onto its title deed where the deed shows it (B157): the
     * deed is cropped to its own frame, so it needs a placement of its own. A deed with its own photo keeps it, and
     * a space with `deedPhoto: false` keeps its photo off. With the pixel size of the photo the deed gets the crop
     * of its own narrow frame (B177, B218, B239), the same as `withDeedPhotos` and `deedCrop` in
     * resources/js/lib/edition/deed-photos.ts, so a stored edition prints as the editor shows it.
     *
     * @param array<string, array<mixed>> $elements
     * @param array<string, array{width: int, height: int}> $photoSizes Pixel sizes by photo ref.
     * @return array<string, array<mixed>>
     */
    public static function withDeedPhotos(array $elements, array $photoSizes = []): array
    {
        $index = 0;

        foreach (resolve(StandardEdition::class)->spaces() as $space) {
            if (! in_array($space['type'], ['street', 'station', 'utility'], true)) {
                continue;
            }

            $index++;
            $deedKey = sprintf('deed.%02d', $index);
            $deed = $elements[$deedKey] ?? [];
            $source = $elements[sprintf('space.%02d', $space['position'])] ?? [];

            if (isset($deed['photo']) || ! is_array($source['photo'] ?? null) || ($source['deedPhoto'] ?? true) === false) {
                continue;
            }

            $style = $deed['photoStyle'] ?? $source['photoStyle'] ?? null;
            $ref = $source['photo']['photoId'] ?? null;
            $deed['photo'] = self::deedCrop($source['photo'], is_string($ref) ? $photoSizes[$ref] ?? null : null, $style);

            if (! isset($deed['photoStyle']) && isset($source['photoStyle'])) {
                $deed['photoStyle'] = $source['photoStyle'];
            }

            $elements[$deedKey] = $deed;
        }

        return $elements;
    }

    /**
     * The crop of a borrowed photo on its title deed (B177, B218, B253), as `deedCrop` in deed-photos.ts. Every photo
     * fills the strip, landscape or standing. Untouched (a landscape photo in the middle at 100%, a standing photo at
     * 100%) it shows the upper part with the face line a third down the strip. A moved photo, a photo that fits (a
     * logo) and a photo of unknown size keep the crop of the space.
     *
     * @param array<mixed> $photo
     * @param array{width: int, height: int}|null $size
     * @return array<mixed>
     */
    public static function deedCrop(array $photo, ?array $size, mixed $style): array
    {
        unset($photo['borrowed']);

        if ($size === null || ($photo['fit'] ?? false) === true || $size['width'] <= 0 || $size['height'] <= 0) {
            return $photo;
        }

        $rotation = is_numeric($photo['rotation'] ?? null) ? (float) $photo['rotation'] : 0.0;
        $turned = ((int) round($rotation / 90)) % 2 !== 0;
        $width = $turned ? $size['height'] : $size['width'];
        $height = $turned ? $size['width'] : $size['height'];

        $cy = is_numeric($photo['cy'] ?? null) ? (float) $photo['cy'] : 0.5;
        $scale = is_numeric($photo['scale'] ?? null) ? (float) $photo['scale'] : 1.0;
        // A standing photo starts on its space with the face line set for that frame, so at 100% it always gets the
        // crop of the strip; a landscape photo only while it is in the middle.
        $untouched = $scale === 1.0 && ($cy === 0.5 || $height > $width);

        if (! $untouched) {
            return $photo;
        }

        $full = $style === 'full';

        return [
            ...$photo,
            'cx' => 0.5,
            'cy' => self::faceHeight(
                $width,
                $height,
                $full ? self::DEED_FULL_PHOTO_WIDTH : self::DEED_PHOTO_WIDTH,
                $full ? self::DEED_FULL_PHOTO_HEIGHT : self::DEED_PHOTO_HEIGHT,
            ),
        ];
    }

    /**
     * The height to centre a photo on so its face line lands a third from the top of the deed frame it covers at
     * 100%: `faceHeight` in lib/photos/transform.ts.
     */
    private static function faceHeight(int $width, int $height, float $frameWidth, float $frameHeight): float
    {
        $shown = min(1.0, ($frameHeight / $frameWidth) * ($width / $height));

        return self::FACE_LINE + $shown / 6;
    }

    /**
     * The edition as one set prints it: the amount of play money is the choice for that set on the print page,
     * else the choice of the edition, else the default of the set (B156). With more than one set the cards and the
     * money hold every set, each with its own set mark (B242). The print shop gets the board as panels or whole
     * (B243). The number of invitations only changes the texts, never the PDF (B244).
     */
    public function forSet(
        PrintSet $set,
        ?MoneyAmount $chosen,
        bool $moneyLeftOut = false,
        int $sets = 1,
        BoardForm $boardForm = BoardForm::Panels,
        int $invitations = PrintJob::DEFAULT_INVITATIONS,
    ): self {
        return $this->copy(
            moneyAmount: $chosen ?? $this->moneyAmount ?? MoneyAmount::defaultFor($set),
            moneyLeftOut: $moneyLeftOut,
            sets: max(1, $sets),
            boardForm: $set === PrintSet::Printer ? $boardForm : BoardForm::Panels,
            invitations: max(1, $invitations),
        );
    }

    /**
     * The parts that carry a set mark when there is more than one set (B242): the backs of the cards and the deeds,
     * and the banknotes. Their PDF holds every set, one after the other.
     */
    public static function hasSetMarks(PrintPart $part): bool
    {
        return in_array($part, [PrintPart::Cards, PrintPart::Money], true);
    }

    /**
     * The same edition for one set: what one set takes, for the counts per set.
     */
    public function oneSet(): self
    {
        return $this->copy(sets: 1);
    }

    /**
     * The amount of play money this edition prints in a set.
     */
    public function moneyAmountFor(PrintSet $set): MoneyAmount
    {
        return $this->moneyAmount ?? MoneyAmount::defaultFor($set);
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

        return $this->copy(elements: $elements, targetsDeclared: true);
    }

    /**
     * A copy with some fields changed. `moneyAmount: false` drops the amount.
     *
     * @param array<string, array<mixed>>|null $elements
     */
    private function copy(
        ?array $elements = null,
        ?bool $targetsDeclared = null,
        MoneyAmount|false|null $moneyAmount = null,
        ?bool $moneyLeftOut = null,
        ?int $sets = null,
        ?BoardForm $boardForm = null,
        ?int $invitations = null,
    ): self {
        return new self(
            name: $this->name,
            language: $this->language,
            theme: $this->theme,
            boardProfile: $this->boardProfile,
            elements: $elements ?? $this->elements,
            parts: $this->parts,
            currency: $this->currency,
            targetsDeclared: $targetsDeclared ?? $this->targetsDeclared,
            moneyAmount: $moneyAmount === false ? null : ($moneyAmount ?? $this->moneyAmount),
            moneyLeftOut: $moneyLeftOut ?? $this->moneyLeftOut,
            sets: $sets ?? $this->sets,
            boardForm: $boardForm ?? $this->boardForm,
            invitations: $invitations ?? $this->invitations,
        );
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

        throw_unless(is_array($data), InvalidArgumentException::class, 'The edition is not an object.');

        return self::fromArray($data);
    }

    /**
     * Only the elements that are drawn on this part.
     */
    public function onlyFor(PrintPart $part): self
    {
        // Only the money and the booklet (which says how much money is in the box) change with the amount.
        $keepsAmount = in_array($part, [PrintPart::Money, PrintPart::RulesBooklet], true);

        // Only the booklet says whether the money is in the box (bug 34 of ronde 4): taking the money out of the set
        // leaves the other parts as they are.
        // Only the cards and the money hold more than one set (B242), and only the board has a form (B243).
        return $this->copy(
            elements: $this->elementsFor($part),
            moneyAmount: $keepsAmount ? null : false,
            moneyLeftOut: $part === PrintPart::RulesBooklet && $this->moneyLeftOut,
            sets: self::hasSetMarks($part) ? $this->sets : 1,
            boardForm: $part === PrintPart::Board ? $this->boardForm : BoardForm::Panels,
        );
    }

    /**
     * The elements drawn on a part. The cards part also gets the name and the own amounts of every space: a title
     * deed carries the name of its space (a renamed street prints renamed on its deed) and its price and rents
     * (B132), and nothing else of the space. The same holds for the rules booklet, whose price list, salary and tax
     * follow the edition (round 4, bugs 2 and 3); the invitation owns the whole board (ronde 3, bug 5).
     *
     * @return array<string, array<mixed>>
     */
    private function elementsFor(PrintPart $part): array
    {
        $elements = array_filter($this->elements, $part->ownsElement(...), ARRAY_FILTER_USE_KEY);

        // The test sheet shows the start corner and the first space as they print (R5-26), with their own name,
        // amounts and photo: a print shop judges colour and sharpness on it before a large order (B253, Ingrid).
        if ($part === PrintPart::Calibration) {
            foreach (['space.00', 'space.01'] as $key) {
                $space = $this->elements[$key] ?? [];
                $kept = array_intersect_key($space, array_flip(['name', 'amounts', 'photo', 'photoStyle']));

                if ($kept !== []) {
                    $elements[$key] = $kept;
                }
            }

            return $elements;
        }

        // The booklet's price list carries the space names too.
        if (! in_array($part, [PrintPart::Cards, PrintPart::RulesBooklet], true)) {
            return $elements;
        }

        // The booklet counts the cards in the box, the added ones too (B254, Sara and Aisha: it said 16 for 17).
        if ($part === PrintPart::RulesBooklet) {
            foreach ($this->extraCardKeys() as $key) {
                $elements[$key] = ['added' => true];
            }
        }

        foreach ($this->elements as $key => $element) {
            $named = str_starts_with($key, 'space.');

            if ($named && is_string($element['name'] ?? null)) {
                $elements[$key] = ['name' => $element['name']];
            }

            if ($named && is_array($element['amounts'] ?? null)) {
                $elements[$key] = [...$elements[$key] ?? [], 'amounts' => $element['amounts']];
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
     * Title deeds and the two decks, from the standard edition (B100): an
     * edition only stores overrides. The "cards" part always holds all of
     * them; whether it is in the set is chosen on the print page (B198).
     */
    public function cardCount(): int
    {
        $standard = resolve(StandardEdition::class);
        $deeds = $standard->components()['titleDeeds'];
        $decks = count($standard->deck('chance')) + count($standard->deck('chest')) + count($this->extraCardKeys());

        return $deeds + $decks + ($this->hasHouseRules() ? 1 : 0);
    }

    /**
     * The extra Chance and Community Chest cards the edition added after the standard 16 (B135), in key order.
     *
     * @return list<string>
     */
    public function extraCardKeys(): array
    {
        $standard = resolve(StandardEdition::class);
        $keys = array_values(array_filter(
            array_keys($this->elements),
            fn (string $key): bool => ElementKind::isExtraCard($key, $standard) && ($this->elements[$key]['added'] ?? false) === true,
        ));
        sort($keys);

        return $keys;
    }

    /**
     * The house rules card prints with the cards, as one more card, when it has a rule on it (B210): the editor
     * always shows it (B198), so the old switch `parts.houseRules` no longer counts.
     */
    public function hasHouseRules(): bool
    {
        // An empty card is left out of the set (bug 20 of test round 3), like `hasHouseRulesCard` in composition.ts.
        $text = $this->elements['house_rules']['text'] ?? null;

        return is_string($text) && trim($text) !== '';
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
            // Money taken out of the set: the booklet says it comes from your own game (bug 34 of ronde 4).
            'parts' => (object) ($this->moneyLeftOut ? [...$this->parts, 'money' => false] : $this->parts),
            'moneyAmount' => $this->moneyAmount?->value,
            // Every set in one PDF, each with its own mark (B242), and the board in one piece (B243).
            'sets' => $this->sets,
            'boardForm' => $this->boardForm->value,
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
            'moneyAmount' => $this->moneyAmount?->value,
            'elements' => $this->elements,
            ...($this->moneyLeftOut ? ['moneyLeftOut' => true] : []),
            // Only when not the default, so a PDF made before B242 and B243 stays current.
            ...($this->sets > 1 ? ['sets' => $this->sets] : []),
            ...($this->boardForm === BoardForm::Whole ? ['boardForm' => $this->boardForm->value] : []),
        ];
    }

    /**
     * The extra print items (B123) are off unless the edition says so: they came after the first editions.
     */
    private function isExtraOn(PrintPart $part): bool
    {
        return match ($part) {
            PrintPart::RulesBooklet => ($this->parts['rulesBooklet'] ?? false) === true,
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
