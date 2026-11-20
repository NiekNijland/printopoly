<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use App\Print\PdfRenderer;
use App\Print\PrintEditionData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\FakePdfRenderer;
use Tests\Support\TestImages;
use Tests\TestCase;

/**
 * Shared set-up for the print pipeline tests: an edition with every part on
 * and one photo on the first board space, a fake Chrome and a fake disk.
 *
 * @mixin TestCase
 */
trait CreatesPrintFixtures
{
    use MakesEditions;

    protected const string PHOTO_REF = 'photo-ref-0001';

    protected FakePdfRenderer $renderer;

    protected function setUpCreatesPrintFixtures(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);

        $this->renderer = new FakePdfRenderer(PrintEditionData::fromArray($this->editionArray()));
        app()->instance(PdfRenderer::class, $this->renderer);
    }

    /**
     * An edition the way the browser holds it, with every part on and one photo on the first board
     * space. `target` is what the renderer geometry will say about the frame (mm, with bleed).
     *
     * @param array<string, mixed>|null $spacePhoto
     * @return array<string, mixed>
     */
    protected function editionArray(string $name = 'Zaterdagclub', ?array $spacePhoto = null, string $id = 'e1'): array
    {
        return $this->editionPayload($id, [
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
    protected function editionWithBoardPhoto(array $photo): array
    {
        return $this->editionArray(spacePhoto: $photo);
    }

    protected function photoUpload(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('foto.jpg', TestImages::jpeg(800, 600));
    }

    /**
     * An anonymous job with the standard edition and its one photo.
     */
    protected function createAnonymousJob(): PrintJob
    {
        $response = $this->postAnonymousJob();
        $response->assertCreated();

        return PrintJob::query()->where('token', $response->json('token'))->firstOrFail();
    }

    /**
     * @param array<string, mixed>|null $edition
     * @param array<string, UploadedFile>|null $photos
     * @return TestResponse<Response>
     */
    protected function postAnonymousJob(?array $edition = null, ?array $photos = null): TestResponse
    {
        return $this->post('/api/print-jobs', [
            'edition' => json_encode($edition ?? $this->editionArray(), JSON_THROW_ON_ERROR),
            'photos' => $photos ?? [self::PHOTO_REF => $this->photoUpload()],
        ], ['Accept' => 'application/json']);
    }

    /**
     * An edition of a logged-in user, with its photo uploaded.
     */
    protected function createEditionFor(User $user, ?string $id = null): Edition
    {
        return $this->createEditionWithId($user, $id ?? 'e-' . bin2hex(random_bytes(6)));
    }

    /**
     * Stored without the edition validator: the photo placement carries a `target` the model does not know yet.
     */
    protected function createEditionWithId(User $user, string $id, bool $withPhoto = true): Edition
    {
        $payload = $this->editionArray(id: $id);
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

        $this->actingAs($user)
            ->post('/api/editions/' . $id . '/assets', ['ref' => self::PHOTO_REF, 'photo' => $this->photoUpload()], ['Accept' => 'application/json'])
            ->assertCreated();

        return $edition;
    }

    protected function createUser(string $email = 'niek@example.test'): User
    {
        $user = new User(['name' => 'Niek', 'email' => $email, 'google_id' => 'g-' . $email, 'locale' => 'nl']);
        $user->save();

        return $user;
    }

    /**
     * @param list<string> $parts
     * @return TestResponse<Response>
     */
    protected function generate(PrintJob $job, string $set = 'printer', array $parts = ['board']): TestResponse
    {
        return $this->postJson('/api/print/' . $job->token . '/generate', ['set' => $set, 'parts' => $parts]);
    }

    /**
     * @param TestResponse<Response> $response
     */
    protected function jsonString(TestResponse $response, string $key): string
    {
        $value = $response->json($key);

        return is_string($value) ? $value : '';
    }

    /**
     * @param TestResponse<Response> $response
     * @return list<array<string, mixed>>
     */
    protected function jsonRows(TestResponse $response, string $key): array
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
    protected function printJobFor(User $user, Edition $edition): PrintJob
    {
        $response = $this->actingAs($user)->postJson('/api/editions/' . $edition->edition_id . '/print-job');

        return PrintJob::query()->where('token', $this->jsonString($response, 'token'))->firstOrFail();
    }

    /**
     * The row of one part in the status of a job, as the page gets it.
     *
     * @return array<string, mixed>
     */
    protected function partRow(PrintJob $job, PrintSet $set, PrintPart $part): array
    {
        $status = $this->getJson('/api/print/' . $job->token . '/status')->assertOk();

        foreach ($this->jsonRows($status, 'parts') as $row) {
            if ($row['set'] === $set->value && $row['part'] === $part->value) {
                return $row;
            }
        }

        self::fail('No row for ' . $set->value . ' ' . $part->value);
    }

    /**
     * @phpstan-impure
     */
    protected function partStatus(PrintJob $job, PrintSet $set, PrintPart $part): string
    {
        $status = $this->partRow($job, $set, $part)['status'];

        return is_string($status) ? $status : '';
    }
}
