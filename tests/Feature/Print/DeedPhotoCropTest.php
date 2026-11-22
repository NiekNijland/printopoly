<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Print\PrintJobContext;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * A stored edition comes to the print job without the deed photos the browser adds; the server writes them and,
 * with the size of the uploaded photo, gives each the crop of the deed's own frame (B239).
 */
final class DeedPhotoCropTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    #[Test]
    public function a_stored_edition_prints_its_deed_photo_with_the_crop_the_editor_shows(): void
    {
        $user = $this->createUser();
        // Space 1 has an untouched landscape photo of 800 by 600 pixels.
        $edition = $this->createEditionFor($user);
        $job = $this->printJobFor($user, $edition);

        $photo = app(PrintJobContext::class)->edition($job)->elements['deed.01']['photo'] ?? null;

        self::assertIsArray($photo);
        self::assertEqualsWithDelta(0.401235, $photo['cy'], 0.000001);
    }

    #[Test]
    public function an_anonymous_job_without_deed_photos_gets_the_same_crop(): void
    {
        $job = $this->createAnonymousJob();

        $photo = app(PrintJobContext::class)->edition($job)->elements['deed.01']['photo'] ?? null;

        self::assertIsArray($photo);
        self::assertEqualsWithDelta(0.401235, $photo['cy'], 0.000001);
    }
}
