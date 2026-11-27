<?php

declare(strict_types=1);

namespace App\Modules\Print\ValueObjects;

use App\Modules\Content\Enums\Locale;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;

/**
 * An edition as the print pipeline reads it: the `Edition` of
 * resources/js/lib/render/edition-types.ts, which is what the browser uploads for a
 * job without an account and what `EditionPayload` makes of a stored one.
 * `elements` holds only what differs from the standard data (B59), so the
 * cards that exist come from the standard edition, plus the extra cards an
 * edition added (B135).
 */
final readonly class PrintEdition
{
    /**
     * @param array<string, array<mixed>> $elements
     * @param int $standardCardCount The title deeds and the cards of both decks of the standard edition.
     * @param list<string> $extraCardCandidates The keys of the elements that are cards past a standard deck, sorted.
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
        public int $standardCardCount,
        public array $extraCardCandidates,
        public int $invitations,
        public array $parts = [],
        public ?string $currency = null,
        public bool $targetsDeclared = false,
        public ?MoneyAmount $moneyAmount = null,
        public bool $moneyLeftOut = false,
        public int $sets = 1,
        public BoardForm $boardForm = BoardForm::PANELS,
    ) {
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
        BoardForm $boardForm = BoardForm::PANELS,
        ?int $invitations = null,
    ): self {
        return $this->copy(
            moneyAmount: $chosen ?? $this->moneyAmount ?? MoneyAmount::defaultFor($set),
            moneyLeftOut: $moneyLeftOut,
            sets: max(1, $sets),
            boardForm: $set === PrintSet::PRINTER ? $boardForm : BoardForm::PANELS,
            invitations: max(1, $invitations ?? $this->invitations),
        );
    }

    /**
     * The parts that carry a set mark when there is more than one set (B242): the backs of the cards and the deeds,
     * and the banknotes. Their PDF holds every set, one after the other.
     */
    public static function hasSetMarks(PrintPart $part): bool
    {
        return in_array($part, [PrintPart::CARDS, PrintPart::MONEY], true);
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
     * (resources/js/lib/render/print-photo-targets.ts).
     *
     * @param array<mixed> $targets
     */
    public function withTargets(array $targets): self
    {
        return $this->copy(elements: new EditionPhotos($this->elements)->withTargets($targets), targetsDeclared: true);
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
            standardCardCount: $this->standardCardCount,
            extraCardCandidates: $this->extraCardCandidates,
            invitations: $invitations ?? $this->invitations,
            parts: $this->parts,
            currency: $this->currency,
            targetsDeclared: $targetsDeclared ?? $this->targetsDeclared,
            moneyAmount: $moneyAmount === false ? null : ($moneyAmount ?? $this->moneyAmount),
            moneyLeftOut: $moneyLeftOut ?? $this->moneyLeftOut,
            sets: $sets ?? $this->sets,
            boardForm: $boardForm ?? $this->boardForm,
        );
    }

    /**
     * Only the elements that are drawn on this part.
     */
    public function onlyFor(PrintPart $part): self
    {
        // Only the money and the booklet (which says how much money is in the box) change with the amount.
        $keepsAmount = in_array($part, [PrintPart::MONEY, PrintPart::RULES_BOOKLET], true);

        // Only the booklet says whether the money is in the box (bug 34 of ronde 4): taking the money out of the set
        // leaves the other parts as they are.
        // Only the cards and the money hold more than one set (B242), and only the board has a form (B243).
        return $this->copy(
            elements: $this->elementsFor($part),
            moneyAmount: $keepsAmount ? null : false,
            moneyLeftOut: $part === PrintPart::RULES_BOOKLET && $this->moneyLeftOut,
            sets: self::hasSetMarks($part) ? $this->sets : 1,
            boardForm: $part === PrintPart::BOARD ? $this->boardForm : BoardForm::PANELS,
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
        if ($part === PrintPart::CALIBRATION) {
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
        if (! in_array($part, [PrintPart::CARDS, PrintPart::RULES_BOOKLET], true)) {
            return $elements;
        }

        // The booklet counts the cards in the box, the added ones too (B254, Sara and Aisha: it said 16 for 17).
        if ($part === PrintPart::RULES_BOOKLET) {
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
            if ($named && $part === PrintPart::CARDS && is_array($element['icon'] ?? null)) {
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
            fn (PrintPart $part): bool => $part === PrintPart::BOARD || ($part === PrintPart::CARDS && $this->hasHouseRules()) || $this->isOn(match ($part) {
                PrintPart::CARDS => ['deeds', 'cards'],
                PrintPart::MONEY => ['money'],
                PrintPart::TOKENS => ['pawns'],
                PrintPart::BOX_LID => ['boxLid'],
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
        return $this->standardCardCount + count($this->extraCardKeys()) + ($this->hasHouseRules() ? 1 : 0);
    }

    /**
     * The extra Chance and Community Chest cards the edition added after the standard 16 (B135), in key order.
     *
     * @return list<string>
     */
    public function extraCardKeys(): array
    {
        return array_values(array_filter(
            $this->extraCardCandidates,
            fn (string $key): bool => ($this->elements[$key]['added'] ?? false) === true,
        ));
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
     * Every photo placement in the edition: the `photo` of an element and the
     * photo layers on it, in element key order.
     *
     * @return list<PhotoPlacement>
     */
    public function placements(): array
    {
        return new EditionPhotos($this->elements)->placements($this->targetsDeclared);
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
            'elements' => (object) new EditionPhotos($this->elements)->withSources($sources),
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
            ...($this->boardForm === BoardForm::WHOLE ? ['boardForm' => $this->boardForm->value] : []),
        ];
    }

    /**
     * The extra print items (B123) are off unless the edition says so: they came after the first editions.
     */
    private function isExtraOn(PrintPart $part): bool
    {
        return match ($part) {
            PrintPart::RULES_BOOKLET => ($this->parts['rulesBooklet'] ?? false) === true,
            PrintPart::INVITATION => ($this->parts['invitation'] ?? false) === true,
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
}
