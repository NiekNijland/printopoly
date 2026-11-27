<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Actions;

use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Actions\CreateAnonymousPrintJob;
use App\Modules\Print\Support\PrintEditionReader;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class CreateAnonymousPrintJobTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_job_without_a_photo_its_edition_places_is_refused(): void
    {
        $json = json_encode(PrintScenario::editionArray(), JSON_THROW_ON_ERROR);
        $edition = resolve(PrintEditionReader::class)->fromJson($json);

        $this->expectException(ValidationException::class);

        resolve(CreateAnonymousPrintJob::class)->handle($edition, $json, null, [], false, null, '', '10.0.0.1');
    }

    public function test_a_partial_job_waits_for_its_photos_and_takes_the_language_of_the_site(): void
    {
        $json = json_encode(PrintScenario::editionArray(), JSON_THROW_ON_ERROR);
        $edition = resolve(PrintEditionReader::class)->fromJson($json);

        $job = resolve(CreateAnonymousPrintJob::class)->handle($edition, $json, null, [], true, Locale::English, '', '10.0.0.1');

        self::assertSame('en', $job->locale);
        self::assertNull($job->user_id);
        self::assertSame(40, mb_strlen($job->token));
    }

    public function test_only_an_earlier_job_without_account_is_remembered(): void
    {
        $json = json_encode(PrintScenario::editionArray(), JSON_THROW_ON_ERROR);
        $edition = resolve(PrintEditionReader::class)->fromJson($json);

        $previous = PrintJob::factory()->createOne(['token' => 'print-token-earlier']);
        $owned = PrintJob::factory()->createOne(['token' => 'print-token-owned', 'user_id' => 'u1']);
        $create = resolve(CreateAnonymousPrintJob::class);

        self::assertSame($previous->publicId(), $create->handle($edition, $json, null, [], true, null, 'print-token-earlier', '10.0.0.1')->previous_job_id);
        self::assertNull($create->handle($edition, $json, null, [], true, null, $owned->token, '10.0.0.2')->previous_job_id);
    }

    public function test_an_address_with_too_many_active_jobs_waits(): void
    {
        $json = json_encode(PrintScenario::editionArray(), JSON_THROW_ON_ERROR);
        $edition = resolve(PrintEditionReader::class)->fromJson($json);
        config(['printopoly.limits.anonymous_jobs_per_ip' => 1]);
        $first = resolve(CreateAnonymousPrintJob::class)->handle($edition, $json, null, [], true, null, '', '10.0.0.1');
        $first->active_at = now();
        $first->save();

        $this->expectException(TooManyRequestsHttpException::class);

        resolve(CreateAnonymousPrintJob::class)->handle($edition, $json, null, [], true, null, '', '10.0.0.1');
    }
}
