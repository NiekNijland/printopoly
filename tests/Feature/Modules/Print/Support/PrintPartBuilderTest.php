<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\PrintFile;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\PrintPartBuilder;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintPartBuilderTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_a_part_is_rendered_checked_and_kept_and_the_next_build_reuses_it(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $builder = resolve(PrintPartBuilder::class);

        $file = $builder->build($job, PrintSet::PRINTER, PrintPart::BOARD);
        $again = $builder->build($job, PrintSet::PRINTER, PrintPart::BOARD);

        self::assertSame(PrintFile::KIND_PART, $file->kind);
        self::assertSame(['board', 'printer', 'bord-printer.pdf', 4], [$file->part, $file->set, $file->filename, $file->pages]);
        self::assertSame(1, preg_match('#^print/' . $job->publicId() . '/[0-9a-f]{12}-printer-board\.pdf$#', $file->path));
        Storage::disk('local')->assertExists($file->path);
        self::assertSame(strlen((string) Storage::disk('local')->get($file->path)), $file->bytes);
        self::assertSame($file->getKey(), $again->getKey());
        self::assertSame(1, PrintScenario::renderer()->calls);
        self::assertSame([], Storage::disk('local')->allFiles('print-work'));
        self::assertStringContainsString('print-render', PrintScenario::renderer()->htmls[0]);
    }

    public function test_a_file_of_an_anonymous_job_never_outlives_the_job(): void
    {
        config(['printopoly.print_files.retention_days' => 30]);
        $job = PrintScenario::createAnonymousJob($this);
        self::assertNotNull($job->expires_at);

        $file = resolve(PrintPartBuilder::class)->build($job, PrintSet::HOME, PrintPart::TOKENS);

        self::assertSame($job->expires_at->toIso8601String(), $file->expires_at->toIso8601String());
    }

    public function test_an_expired_or_lost_pdf_is_made_again_and_the_old_one_goes(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $builder = resolve(PrintPartBuilder::class);
        $first = $builder->build($job, PrintSet::HOME, PrintPart::TOKENS);

        Storage::disk('local')->delete($first->path);
        $second = $builder->build($job, PrintSet::HOME, PrintPart::TOKENS);
        $this->travelTo(now()->addDays(8));
        $job->expires_at = now()->addDays(7);
        $job->save();

        $third = $builder->build($job, PrintSet::HOME, PrintPart::TOKENS);

        self::assertSame(3, PrintScenario::renderer()->calls);
        self::assertSame([$third->getKey()], PrintFile::query()->where('print_job_id', $job->publicId())->pluck('id')->all());
        self::assertNotSame($second->getKey(), $third->getKey());
    }

    public function test_the_invitation_also_gets_a_png_of_the_finished_card(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        $job->locale = 'en';
        $job->save();

        $file = resolve(PrintPartBuilder::class)->build($job, PrintSet::HOME, PrintPart::INVITATION);

        self::assertSame('invitation-home.pdf', $file->filename);
        $image = PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', PrintFile::KIND_IMAGE)->firstOrFail();
        self::assertSame(['invitation', 'home', 'invitation-1080px.png', 1, $file->cache_key], [$image->part, $image->set, $image->filename, $image->pages, $image->cache_key]);
        $size = getimagesizefromstring((string) Storage::disk('local')->get($image->path));
        self::assertIsArray($size);
        self::assertSame(1080, $size[0]);
    }

    public function test_a_new_job_takes_over_an_unchanged_pdf_and_its_png_from_the_job_before_it(): void
    {
        $old = PrintScenario::createAnonymousJob($this);
        $builder = resolve(PrintPartBuilder::class);
        $oldFile = $builder->build($old, PrintSet::HOME, PrintPart::INVITATION);
        $new = PrintScenario::createAnonymousJob($this);
        $new->previous_job_id = $old->publicId();
        $new->save();

        $file = $builder->build($new, PrintSet::HOME, PrintPart::INVITATION);

        self::assertSame(1, PrintScenario::renderer()->calls);
        self::assertSame([$oldFile->cache_key, $oldFile->filename, $oldFile->pages, $oldFile->bytes], [$file->cache_key, $file->filename, $file->pages, $file->bytes]);
        self::assertStringStartsWith('print/' . $new->publicId() . '/', $file->path);
        Storage::disk('local')->assertExists($file->path);
        self::assertSame(1, PrintFile::query()->where('print_job_id', $new->publicId())->where('kind', PrintFile::KIND_IMAGE)->count());
    }

    public function test_an_expired_or_lost_pdf_of_the_job_before_is_rendered_anew(): void
    {
        $old = PrintScenario::createAnonymousJob($this);
        $builder = resolve(PrintPartBuilder::class);
        $oldBoard = $builder->build($old, PrintSet::HOME, PrintPart::TOKENS);
        $oldMoney = $builder->build($old, PrintSet::HOME, PrintPart::BOX_LID);
        $oldBoard->expires_at = now()->subMinute();
        $oldBoard->save();
        Storage::disk('local')->delete($oldMoney->path);
        $new = PrintScenario::createAnonymousJob($this);
        $new->previous_job_id = $old->publicId();
        $new->save();

        $builder->build($new, PrintSet::HOME, PrintPart::TOKENS);
        $builder->build($new, PrintSet::HOME, PrintPart::BOX_LID);

        self::assertSame(4, PrintScenario::renderer()->calls);
    }

    public function test_a_crash_of_chrome_keeps_nothing_and_cleans_the_work_folder(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::renderer()->mode = 'crash';

        try {
            resolve(PrintPartBuilder::class)->build($job, PrintSet::PRINTER, PrintPart::BOARD);
            self::fail('The build should fail.');
        } catch (RuntimeException $runtimeException) {
            self::assertSame('Chrome crashed.', $runtimeException->getMessage());
        }

        self::assertSame([], Storage::disk('local')->allFiles('print-work'));
        self::assertSame(0, PrintFile::query()->count());
    }

    public function test_a_pdf_with_the_wrong_number_of_pages_is_refused(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::renderer()->mode = 'wrong_count';

        $this->expectException(PrintFailedException::class);

        try {
            resolve(PrintPartBuilder::class)->build($job, PrintSet::HOME, PrintPart::TOKENS);
        } finally {
            self::assertSame(0, PrintFile::query()->count());
            self::assertSame([], Storage::disk('local')->allFiles('print/' . $job->publicId()));
        }
    }

    public function test_a_render_url_is_the_signed_path_on_the_render_origin(): void
    {
        self::assertSame('http://127.0.0.1/print/render/crop?signature=abc', PrintPartBuilder::renderUrl('/print/render/crop?signature=abc', 'http://127.0.0.1'));
        self::assertSame('http://127.0.0.1/print/x', PrintPartBuilder::renderUrl('print/x', 'http://127.0.0.1'));
    }
}
