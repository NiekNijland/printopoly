<?php

declare(strict_types=1);

namespace App\Modules\Print\Services;

use App\Models\PrintJob;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class RenderFileService
{
    /** @var array<string, string> */
    private const array TYPES = [
        'js' => 'text/javascript',
        'css' => 'text/css',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'json' => 'application/json',
    ];

    /**
     * @return array{file: string, type: string} the absolute path of a file of the build and its content type
     *
     * @throws NotFoundHttpException
     */
    public function asset(string $path): array
    {
        throw_if(preg_match('#^build/[A-Za-z0-9._/-]+$#', $path) !== 1 || str_contains($path, '..'), NotFoundHttpException::class);

        $root = realpath(public_path('build'));
        $file = realpath(public_path($path));

        throw_if($root === false || $file === false || ! str_starts_with($file, $root . DIRECTORY_SEPARATOR) || ! is_file($file), NotFoundHttpException::class);

        $type = self::TYPES[mb_strtolower(pathinfo($file, PATHINFO_EXTENSION))] ?? throw new NotFoundHttpException();

        return ['file' => $file, 'type' => $type];
    }

    /**
     * @return string the path of the cropped photo in the job's work folder, on the disk of the print files
     *
     * @throws NotFoundHttpException
     */
    public function crop(PrintJob $printJob, string $folder, string $name): string
    {
        throw_if(preg_match('/^[a-z_-]{3,40}$/', $folder) !== 1 || preg_match('/^[a-f0-9]{40}\.(jpg|png)$/', $name) !== 1, NotFoundHttpException::class);

        $path = 'print-work/' . $printJob->publicId() . '/' . $folder . '/' . $name;
        $disk = Storage::disk(Config::string('printopoly.storage.disk'));

        throw_unless($disk->exists($path), NotFoundHttpException::class);

        return $path;
    }
}
