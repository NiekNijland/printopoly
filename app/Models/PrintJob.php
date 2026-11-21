<?php

declare(strict_types=1);

namespace App\Models;

use App\Data\PrintChoicesData;
use App\Data\PrintSetChoiceData;
use App\Enums\MoneyAmount;
use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\PrintProgress;
use Carbon\CarbonImmutable;
use LogicException;
use MongoDB\Laravel\Eloquent\Model;
use Override;

/**
 * One print page's worth of work (B60, B80, B95).
 *
 * With an account the job belongs to a user and an edition and reads that
 * edition live. Without one it carries its own copy of the edition that the
 * browser uploaded, and the only way in is the secret `token` in the link. The
 * token is the route key, never the document id. Anonymous jobs, their photos
 * and their PDFs are deleted after 7 days (B62).
 *
 * `states` holds one entry per set and part, keyed `{set}_{part}` without a dot
 * so a single entry can be updated atomically while the queue works:
 * `['printer_board' => ['status' => 'done', 'cache_key' => '…', 'error' => null]]`.
 *
 * @property string $id
 * @property string $token
 * @property string|null $user_id
 * @property string|null $edition_id
 * @property array<string, mixed>|null $edition Copy of the edition for jobs without an account.
 * @property array<string, array<string, array{w: float, h: float}>>|null $photo_targets Frame size in mm of every visible photo, per set and `element#photo`, as the browser measured it from the renderers.
 * @property string $locale
 * @property string|null $ip_hash
 * @property array<string, array{status: string, cache_key: string|null, error: string|null, after?: string|null}> $states
 * @property array<string, array{skipped?: list<string>, moneyAmount?: string|null, copies?: int}>|null $choices What the print page chose per set (bug 6 of test round 3, B156).
 * @property CarbonImmutable|null $active_at Set while a run is queued or working, cleared when it ends.
 * @property CarbonImmutable|null $expires_at Set for anonymous jobs.
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
class PrintJob extends Model
{
    #[Override]
    protected $connection = 'mongodb';

    #[Override]
    protected $table = 'print_jobs';

    /** @var list<string> */
    #[Override]
    protected $fillable = [
        'token',
        'user_id',
        'edition_id',
        'edition',
        'photo_targets',
        'locale',
        'ip_hash',
        'states',
        'choices',
        'active_at',
        'expires_at',
    ];

    /** @var list<string> */
    #[Override]
    protected $hidden = [
        'ip_hash',
    ];

    public static function stateKey(PrintSet $set, PrintPart $part): string
    {
        return $set->value . '_' . $part->value;
    }

    public function publicId(): string
    {
        $key = $this->getKey();

        if (! is_string($key)) {
            throw new LogicException('A print job only has an id once it is saved.');
        }

        return $key;
    }

    #[Override]
    public function getRouteKeyName(): string
    {
        return 'token';
    }

    /**
     * A run is queued or working. A run whose worker died stops counting
     * after a while, so one crash cannot block a job forever.
     */
    public function isBusy(): bool
    {
        return $this->active_at !== null
            && $this->active_at->greaterThan(CarbonImmutable::now()->subMinutes(PrintProgress::STALE_AFTER_MINUTES));
    }

    /** The most sets the instructions count with: a class or a club, not a print run. */
    public const int MAX_COPIES = 40;

    /**
     * What the print page chose for one set; nothing chosen is nothing skipped, the default money and one set.
     */
    public function choiceFor(PrintSet $set): PrintSetChoiceData
    {
        $entry = ($this->choices ?? [])[$set->value] ?? [];
        $skipped = [];

        foreach ($entry['skipped'] ?? [] as $value) {
            $part = PrintPart::tryFrom($value);

            if ($part instanceof PrintPart && $part !== PrintPart::Board && ! in_array($part, $skipped, true)) {
                $skipped[] = $part;
            }
        }

        $copies = $entry['copies'] ?? 1;

        return new PrintSetChoiceData(
            skipped: $skipped,
            moneyAmount: MoneyAmount::tryFrom($entry['moneyAmount'] ?? ''),
            copies: max(1, min(self::MAX_COPIES, $copies)),
        );
    }

    public function choicesData(): PrintChoicesData
    {
        return new PrintChoicesData(printer: $this->choiceFor(PrintSet::Printer), home: $this->choiceFor(PrintSet::Home));
    }

    public function rememberChoice(PrintSet $set, PrintSetChoiceData $choice): void
    {
        $choices = $this->choices ?? [];
        $choices[$set->value] = [
            'skipped' => array_map(static fn (PrintPart $part): string => $part->value, $choice->skipped),
            'moneyAmount' => $choice->moneyAmount?->value,
            'copies' => max(1, min(self::MAX_COPIES, $choice->copies)),
        ];
        $this->choices = $choices;
        $this->save();
    }

    public function isAnonymous(): bool
    {
        return $this->user_id === null;
    }

    /**
     * What has been recorded for this part. `Outdated` is never stored: it
     * follows from comparing cache keys (see PrintStatusResolver).
     *
     * @return array{status: PartStatus, cache_key: string|null, error: string|null}
     */
    public function recordedState(PrintSet $set, PrintPart $part): array
    {
        $entry = ($this->states ?? [])[self::stateKey($set, $part)] ?? null;

        if ($entry === null) {
            return ['status' => PartStatus::Idle, 'cache_key' => null, 'error' => null];
        }

        return [
            'status' => PartStatus::tryFrom($entry['status']) ?? PartStatus::Idle,
            'cache_key' => $entry['cache_key'] ?? null,
            'error' => $entry['error'] ?? null,
        ];
    }

    /**
     * @return array<string, string>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'active_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
