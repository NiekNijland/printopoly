<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintEditionData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Assert;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;
use ZipArchive;

/**
 * The print pipeline scenario: an edition with every part and one photo, a fake Chrome on a fake disk, its requests.
 */
final class PrintScenario
{
    public const string PHOTO_REF = 'photo-ref-0001';

    public static function fakeChrome(): FakePdfRenderer
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
        RealBinary::allow('pdfinfo', 'pdftoppm');

        $renderer = new FakePdfRenderer(PrintEditionData::fromArray(self::editionArray()));
        app()->instance(PdfRenderer::class, $renderer);

        return $renderer;
    }

    public static function renderer(): FakePdfRenderer
    {
        $renderer = resolve(PdfRenderer::class);
        Assert::assertInstanceOf(FakePdfRenderer::class, $renderer);

        return $renderer;
    }

    /**
     * An edition the way the browser holds it, with every part on and one photo on the first board
     * space. `target` is what the renderer geometry will say about the frame (mm, with bleed).
     *
     * @param array<string, mixed>|null $spacePhoto
     * @return array<string, mixed>
     */
    public static function editionArray(string $name = 'Zaterdagclub', ?array $spacePhoto = null, string $id = 'e1'): array
    {
        return Editions::payload($id, [
            'name' => $name,
            'parts' => ['board' => true, 'deeds' => true, 'cards' => true, 'money' => true, 'pawns' => true, 'boxLid' => true, 'houseRules' => false],
            'elements' => [
                'space.01' => [
                    'name' => 'Molenweg',
                    'photo' => $spacePhoto ?? ['photoId' => self::PHOTO_REF, 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false, 'target' => ['w' => 46, 'h' => 76]],
                ],
                'deed.01' => ['name' => 'Molenweg'],
                'card.chance.01' => ['text' => 'Ga naar start'],
                'box_lid' => ['name' => 'Zaterdagclub'],
            ],
        ]);
    }

    /**
     * @param array<string, mixed> $photo
     * @return array<string, mixed>
     */
    public static function editionWithBoardPhoto(array $photo): array
    {
        return self::editionArray(spacePhoto: $photo);
    }

    public static function photoUpload(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('foto.jpg', TestImages::jpeg(800, 600));
    }

    /**
     * An anonymous job with the standard edition and its one photo.
     */
    public static function createAnonymousJob(TestCase $test): PrintJob
    {
        $response = self::postAnonymousJob($test);
        $response->assertCreated();

        return PrintJob::query()->where('token', $response->json('token'))->firstOrFail();
    }

    /**
     * @param array<string, mixed>|null $edition
     * @param array<string, UploadedFile>|null $photos
     * @return TestResponse<Response>
     */
    public static function postAnonymousJob(TestCase $test, ?array $edition = null, ?array $photos = null): TestResponse
    {
        return $test->post('/api/print-jobs', [
            'edition' => json_encode($edition ?? self::editionArray(), JSON_THROW_ON_ERROR),
            'photos' => $photos ?? [self::PHOTO_REF => self::photoUpload()],
        ], ['Accept' => 'application/json']);
    }

    /**
     * An edition of a logged-in user, with its photo uploaded.
     */
    public static function createEditionFor(TestCase $test, User $user, ?string $id = null): Edition
    {
        return self::createEditionWithId($test, $user, $id ?? 'e-' . bin2hex(random_bytes(6)));
    }

    /**
     * Stored without the edition validator: the photo placement carries a `target` the model does not know yet.
     */
    public static function createEditionWithId(TestCase $test, User $user, string $id, bool $withPhoto = true): Edition
    {
        $payload = self::editionArray(id: $id);
        $edition = new Edition([
            'user_id' => $user->publicId(),
            'edition_id' => $id,
            'schema_version' => 1,
            'name' => $payload['name'],
            'language' => $payload['language'],
            'currency' => $payload['currency'],
            'theme' => $payload['theme'],
            'board_profile' => $payload['boardProfile'],
            'parts' => $payload['parts'],
            'elements' => $payload['elements'],
            'revision' => 1,
            'created_at_ms' => 1_000,
            'updated_at_ms' => 1_000,
        ]);
        $edition->save();

        if (! $withPhoto) {
            return $edition;
        }

        $test->actingAs($user)
            ->post('/api/editions/' . $id . '/assets', ['ref' => self::PHOTO_REF, 'photo' => self::photoUpload()], ['Accept' => 'application/json'])
            ->assertCreated();

        return $edition;
    }

    /**
     * @param list<string> $parts
     * @return TestResponse<Response>
     */
    public static function generate(TestCase $test, PrintJob $job, string $set = 'printer', array $parts = ['board']): TestResponse
    {
        return $test->postJson('/api/print/' . $job->token . '/generate', ['set' => $set, 'parts' => $parts]);
    }

    /**
     * @param TestResponse<Response> $response
     */
    public static function jsonString(TestResponse $response, string $key): string
    {
        $value = $response->json($key);

        return is_string($value) ? $value : '';
    }

    /**
     * @param TestResponse<Response> $response
     * @return list<array<string, mixed>>
     */
    public static function jsonRows(TestResponse $response, string $key): array
    {
        $rows = [];
        $value = $response->json($key);

        foreach (is_array($value) ? $value : [] as $row) {
            if (is_array($row)) {
                $rows[] = array_combine(array_map(strval(...), array_keys($row)), $row);
            }
        }

        return $rows;
    }

    /**
     * The print job of an edition of a user, made through the API.
     */
    public static function printJobFor(TestCase $test, User $user, Edition $edition): PrintJob
    {
        $response = $test->actingAs($user)->postJson('/api/editions/' . $edition->edition_id . '/print-job');

        return PrintJob::query()->where('token', self::jsonString($response, 'token'))->firstOrFail();
    }

    /**
     * The row of one part in the status of a job, as the page gets it.
     *
     * @return array<string, mixed>
     */
    public static function partRow(TestCase $test, PrintJob $job, PrintSet $set, PrintPart $part): array
    {
        $status = $test->getJson('/api/print/' . $job->token . '/status')->assertOk();

        foreach (self::jsonRows($status, 'parts') as $row) {
            if ($row['set'] === $set->value && $row['part'] === $part->value) {
                return $row;
            }
        }

        Assert::fail('No row for ' . $set->value . ' ' . $part->value);
    }

    /**
     * @phpstan-impure
     */
    public static function partStatus(TestCase $test, PrintJob $job, PrintSet $set, PrintPart $part): string
    {
        $status = self::partRow($test, $job, $set, $part)['status'];

        return is_string($status) ? $status : '';
    }

    /**
     * @param TestResponse<Response> $response
     * @return list<string>
     */
    public static function zipNames(TestResponse $response): array
    {
        $path = (string) tempnam(sys_get_temp_dir(), 'zip-test-');
        file_put_contents($path, $response->streamedContent());
        $zip = new ZipArchive();
        Assert::assertTrue($zip->open($path));
        $names = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[] = (string) $zip->getNameIndex($i);
        }

        $zip->close();
        File::delete($path);

        return $names;
    }
}
