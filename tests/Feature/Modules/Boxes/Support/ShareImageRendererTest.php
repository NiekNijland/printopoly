<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Support;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use App\Modules\Boxes\Support\ShareImageRenderer;
use App\Modules\Print\Exceptions\PrintFailedException;
use Illuminate\Support\Facades\Process;
use Illuminate\Validation\ValidationException;
use Tests\Support\Editions;
use Tests\Support\RealBinary;
use Tests\Support\RecordingPdfRenderer;
use Tests\Support\TestImages;
use Tests\TestCase;

final class ShareImageRendererTest extends TestCase
{
    public function test_it_keeps_only_real_photos_the_edition_uses(): void
    {
        $jpeg = 'data:image/jpeg;base64,' . base64_encode(TestImages::jpeg(40, 30));
        $png = 'data:image/png;base64,' . base64_encode(TestImages::png(20, 10));

        $clean = resolve(ShareImageRenderer::class)->clean($this->edition(), [
            ['id' => 'molen', 'src' => $jpeg],
            ['id' => 'stel', 'src' => $png],
            ['id' => 'molen', 'src' => $jpeg],
            ['id' => 'vreemd', 'src' => $jpeg],
            ['id' => 'kaart', 'src' => 'https://molenweg/foto.jpg'],
            ['id' => 'kaart', 'src' => 'data:image/png;base64,' . base64_encode(TestImages::jpeg(40, 30))],
            ['id' => 'kaart', 'src' => 'data:image/jpeg;base64,' . base64_encode("\xFF\xD8\xFFkapot")],
            ['id' => 'kaart', 'src' => 'data:image/jpeg;base64,==='],
            ['id' => 'met spatie', 'src' => $jpeg],
            ['src' => $jpeg],
            ['id' => 'kaart'],
            'molen',
        ]);

        self::assertSame([
            ['id' => 'molen', 'src' => $jpeg, 'width' => 40, 'height' => 30],
            ['id' => 'stel', 'src' => $png, 'width' => 20, 'height' => 10],
        ], $clean['photos']);
        self::assertSame('Zaterdagclub', $clean['edition']['name']);
    }

    public function test_a_photo_over_the_size_limit_is_left_out(): void
    {
        $big = 'data:image/jpeg;base64,' . str_repeat('A', intdiv(ShareImageRenderer::MAX_PHOTO_BYTES * 4, 3) + 8);

        $clean = resolve(ShareImageRenderer::class)->clean($this->edition(), [['id' => 'molen', 'src' => $big]]);

        self::assertSame([], $clean['photos']);
    }

    public function test_an_edition_that_breaks_the_rules_is_refused(): void
    {
        $this->expectException(ValidationException::class);

        resolve(ShareImageRenderer::class)->clean(Editions::payload('e1', ['language' => 'klingon', 'theme' => 'neon', 'boardProfile' => 'rond']));
    }

    public function test_it_renders_a_square_png_of_1080_pixels_from_a_page_of_1080_css_pixels(): void
    {
        $recorder = new RecordingPdfRenderer();
        app()->instance(PdfRenderer::class, $recorder);
        RealBinary::allow('pdftoppm');
        $renderer = resolve(ShareImageRenderer::class);

        $png = $renderer->render($renderer->clean($this->edition()));

        $size = getimagesizefromstring($png);
        self::assertIsArray($size);
        self::assertSame([ShareImageRenderer::PIXELS, ShareImageRenderer::PIXELS, IMAGETYPE_PNG], [$size[0], $size[1], $size[2]]);
        self::assertCount(1, $recorder->calls);
        [$html, $width, $height, $waits] = $recorder->calls[0];
        self::assertEqualsWithDelta(285.75, $width, 0.001);
        self::assertEqualsWithDelta(285.75, $height, 0.001);
        self::assertTrue($waits);
        self::assertStringContainsString('data-part="share"', $html);
        self::assertStringContainsString('default-src &#039;none&#039;', $html);
    }

    public function test_a_failing_pdftoppm_is_a_print_failure_with_its_cause(): void
    {
        app()->instance(PdfRenderer::class, new RecordingPdfRenderer());
        Process::fake(["'pdftoppm' *" => Process::result('', 'Syntax Error: kapotte pagina', 1)]);
        $renderer = resolve(ShareImageRenderer::class);

        $this->expectException(PrintFailedException::class);
        $this->expectExceptionMessage('pdftoppm could not make the picture: Syntax Error: kapotte pagina');

        $renderer->render($renderer->clean($this->edition()));
    }

    /**
     * @return array<string, mixed>
     */
    private function edition(): array
    {
        $placement = static fn (string $id): array => ['photoId' => $id, 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

        return Editions::payload('e1', ['elements' => [
            'space.01' => ['name' => 'Molenweg', 'photo' => $placement('molen')],
            'board_center' => ['name' => 'Lisa en Thomas', 'photo' => $placement('stel')],
            'card.chance.01' => ['photo' => $placement('kaart')],
        ]]);
    }
}
