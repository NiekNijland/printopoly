<?php

declare(strict_types=1);

namespace Tests\Support;

use Imagick;
use ImagickPixel;

/**
 * Small real images for the photo tests.
 */
final class TestImages
{
    /**
     * @param 1|2|3|4|5|6|7|8|null $orientation EXIF orientation
     * @param string|null $make Camera make, to see whether EXIF survives
     */
    public static function jpeg(int $width, int $height, ?int $orientation = null, ?string $make = null): string
    {
        $image = new Imagick();
        $image->newImage($width, $height, new ImagickPixel('#c8321f'));
        $image->setImageFormat('jpeg');

        if ($orientation !== null || $make !== null) {
            $image->profileImage('exif', self::exif($orientation, $make));

            if ($orientation !== null) {
                // ImageMagick writes this value over the tag when it saves.
                $image->setImageOrientation($orientation);
            }
        }

        return $image->getImageBlob();
    }

    public static function png(int $width, int $height): string
    {
        $image = new Imagick();
        $image->newImage($width, $height, new ImagickPixel('rgba(0, 114, 187, 0.5)'));
        $image->setImageFormat('png');

        return $image->getImageBlob();
    }

    /**
     * A JPEG whose left half is red and right half blue, to see which way a crop or turn went.
     */
    public static function splitJpeg(int $width, int $height): string
    {
        $image = new Imagick();
        $image->newImage($width, $height, new ImagickPixel('#ff0000'));

        $blue = new Imagick();
        $blue->newImage(intdiv($width, 2), $height, new ImagickPixel('#0000ff'));

        $image->compositeImage($blue, Imagick::COMPOSITE_OVER, intdiv($width, 2), 0);
        $image->setImageFormat('jpeg');

        return $image->getImageBlob();
    }

    /**
     * A big-endian EXIF block with the camera make (tag 0x010F) and the
     * orientation (tag 0x0112), in tag order.
     */
    private static function exif(?int $orientation, ?string $make): string
    {
        $entries = [];
        $count = ($make !== null ? 1 : 0) + ($orientation !== null ? 1 : 0);
        // TIFF header (8) + entry count (2) + entries (12 each) + next IFD offset (4).
        $stringOffset = 8 + 2 + $count * 12 + 4;
        $text = '';

        if ($make !== null) {
            $text = $make . "\x00";
            $entries[] = pack('nnNN', 0x010F, 2, mb_strlen($text, encoding: '8bit'), $stringOffset);
        }

        if ($orientation !== null) {
            $entries[] = pack('nnNnn', 0x0112, 3, 1, $orientation, 0);
        }

        return "Exif\x00\x00MM\x00\x2A\x00\x00\x00\x08" . pack('n', $count) . implode('', $entries) . "\x00\x00\x00\x00" . $text;
    }
}
