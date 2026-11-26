<?php

declare(strict_types=1);

namespace App\Models;

use App\Data\PrintChoicesData;
use App\Data\PrintSetChoiceData;
use App\Enums\BoardForm;
use App\Enums\MoneyAmount;
use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\PrintProgress;
use Carbon\CarbonImmutable;
use Database\Factories\PrintJobFactory;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
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
 * @property string|null $previous_job_id The job this browser made for an earlier version of the edition: PDFs that did not change are taken over from it (UX 3 of test round 4).
 * @property array<string, array{status: string, cache_key?: string|null, error?: string|null, after?: string|null}> $states
 * @property array<string, array{skipped?: list<string>, moneyAmount?: string|null, copies?: int, boardForm?: string, invitations?: int}>|null $choices What the print page chose per set (bug 6 of test round 3, B156, B243, B244).
 * @property CarbonImmutable|null $active_at Set while a run is queued or working, cleared when it ends.
 * @property CarbonImmutable|null $expires_at Set for anonymous jobs.
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Connection('mongodb')]
#[Fillable([
    'token',
    'user_id',
    'edition_id',
    'edition',
    'photo_targets',
    'locale',
    'ip_hash',
    'previous_job_id',
    'states',
    'choices',
    'active_at',
    'expires_at',
])]
#[Hidden([
    'ip_hash',
])]
#[RouteKey('token')]
#[Table(name: 'print_jobs')]
class PrintJob extends Model
{
    /** @use HasFactory<PrintJobFactory> */
    use HasFactory;

    public static function stateKey(PrintSet $set, PrintPart $part): string
    {
        return $set->value . '_' . $part->value;
    }

    public function publicId(): string
    {
        $key = $this->getKey();

        throw_unless(is_string($key), LogicException::class, 'A print job only has an id once it is saved.');

        return $key;
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

    /** Invitations without a choice: one A4 sheet of four at home (B244). */
    public const int DEFAULT_INVITATIONS = 4;

    /** The most invitations the page counts with: a street or a school, not a mailing. */
    public const int MAX_INVITATIONS = 500;

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
        $invitations = $entry['invitations'] ?? self::DEFAULT_INVITATIONS;

        return new PrintSetChoiceData(
            skipped: $skipped,
            moneyAmount: MoneyAmount::tryFrom($entry['moneyAmount'] ?? ''),
            copies: max(1, min(self::MAX_COPIES, $copies)),
            boardForm: BoardForm::tryFrom($entry['boardForm'] ?? '') ?? BoardForm::Panels,
            invitations: max(1, min(self::MAX_INVITATIONS, $invitations)),
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
            'boardForm' => $choice->boardForm->value,
            'invitations' => max(1, min(self::MAX_INVITATIONS, $choice->invitations)),
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
