<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Photos\Actions;

use App\Models\Asset;
use App\Models\User;
use App\Modules\Photos\Actions\StoreEditionPhoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\Support\TestImages;
use Tests\TestCase;

final class StoreEditionPhotoTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_full_account_stores_no_photo(): void
    {
        config(['printopoly.limits.account_storage_megabytes' => 1]);
        $user = User::factory()->createOne();
        $edition = Editions::store($user);
        Asset::factory()->createOne(['user_id' => $user->publicId(), 'bytes' => 1024 * 1024]);

        $this->expectException(ValidationException::class);

        resolve(StoreEditionPhoto::class)->handle($user, $edition, 'photo-ref-0001', UploadedFile::fake()->createWithContent('foto.jpg', TestImages::jpeg(80, 60)));
    }

    public function test_a_photo_under_the_same_ref_replaces_the_old_one(): void
    {
        config(['printopoly.storage.disk' => 'local']);
        Storage::fake('local');
        $user = User::factory()->createOne();
        $edition = Editions::store($user);
        $store = resolve(StoreEditionPhoto::class);
        $first = $store->handle($user, $edition, 'photo-ref-0001', UploadedFile::fake()->createWithContent('foto.jpg', TestImages::jpeg(80, 60)));

        $second = $store->handle($user, $edition, 'photo-ref-0001', UploadedFile::fake()->createWithContent('foto.jpg', TestImages::jpeg(90, 60)));

        self::assertSame([$second->publicId()], Asset::query()->where('ref', 'photo-ref-0001')->get()->map(static fn (Asset $asset): string => $asset->publicId())->all());
        self::assertFalse($first->is($second));
    }

    public function test_a_file_that_is_no_photo_is_refused_on_its_content(): void
    {
        $user = User::factory()->createOne();

        $this->expectException(ValidationException::class);

        resolve(StoreEditionPhoto::class)->handle($user, Editions::store($user), 'photo-ref-0001', UploadedFile::fake()->createWithContent('foto.jpg', 'not a photo'));
    }
}
