<?php

declare(strict_types=1);

namespace App\Photos;

use finfo;
use Imagick;
use ImagickException;
use Intervention\Image\Drivers\Imagick\Driver;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;
use Throwable;

/**
 * Validates an upload and turns it into a preview and a print source (B61,
 * B69). The file type comes from the content, never from the name or the
 * client's claim. The pixel count is read from the header (a ping) before
 * anything is decoded. Every file is decoded and encoded again, which drops
 * EXIF and location, and the picture is turned upright first.
 */
final readonly class PhotoProcessor
{
    /** @var list<string> */
    private const array ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

    private ImageManager $images;

    public function __construct()
    {
        $this->images = new ImageManager(new Driver());
    }

    /**
     * @throws PhotoRejected
     */
    public function process(string $path): ProcessedPhoto
    {
        $this->assertSize($path);
        $this->assertType($path);
        $this->assertPixels($path);

        try {
            $image = $this->images->decodePath($path)->orient();
            $originalWidth = $image->width();
            $originalHeight = $image->height();

            $printEdge = config()->integer('printopoly.photos.print_edge');
            $print = (clone $image)->scaleDown($printEdge, $printEdge);
            $printWidth = $print->width();
            $printHeight = $print->height();

            $previewEdge = config()->integer('printopoly.photos.preview_edge');
            $preview = $image->scaleDown($previewEdge, $previewEdge);

            return new ProcessedPhoto(
                preview: (string) $preview->encode(new WebpEncoder(config()->integer('printopoly.photos.preview_quality'), strip: true)),
                printSource: (string) $print->encode(new JpegEncoder(config()->integer('printopoly.photos.print_quality'), strip: true)),
                printWidth: $printWidth,
                printHeight: $printHeight,
                originalWidth: $originalWidth,
                originalHeight: $originalHeight,
            );
        } catch (Throwable) {
            throw PhotoRejected::unreadable();
        }
    }

    private function assertSize(string $path): void
    {
        $limit = config()->integer('printopoly.limits.photo_max_megabytes');
        $size = filesize($path);

        if ($size === false || $size > $limit * 1024 * 1024) {
            throw PhotoRejected::tooLarge($limit);
        }
    }

    private function assertType(string $path): void
    {
        $type = new finfo(FILEINFO_MIME_TYPE)->file($path);

        // Some libmagic versions do not know HEIC yet and report the container.
        if ($type === 'application/octet-stream' && $this->hasHeifSignature($path)) {
            return;
        }

        if ($type === false || ! in_array($type, self::ALLOWED_TYPES, true)) {
            throw PhotoRejected::wrongType();
        }
    }

    private function hasHeifSignature(string $path): bool
    {
        $head = file_get_contents($path, length: 16);

        return is_string($head)
            && substr($head, 4, 4) === 'ftyp'
            && in_array(substr($head, 8, 4), ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'], true);
    }

    private function assertPixels(string $path): void
    {
        $limit = config()->integer('printopoly.limits.photo_max_megapixels');

        try {
            $probe = new Imagick();
            $probe->pingImage($path);
            $pixels = $probe->getImageWidth() * $probe->getImageHeight();
            $probe->clear();
        } catch (ImagickException) {
            throw PhotoRejected::unreadable();
        }

        if ($pixels > $limit * 1_000_000) {
            throw PhotoRejected::tooManyPixels($limit);
        }
    }
}
