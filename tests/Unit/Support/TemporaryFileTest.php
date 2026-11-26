<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\TemporaryFile;
use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\TestCase;

final class TemporaryFileTest extends TestCase
{
    public function test_it_makes_a_new_empty_file_only_this_process_reads(): void
    {
        $first = TemporaryFile::create('printopoly-test-');
        $second = TemporaryFile::create('printopoly-test-');

        self::assertNotNull($first);
        self::assertNotNull($second);
        self::assertNotSame($first, $second);
        self::assertStringStartsWith(sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'printopoly-test-', $first);
        self::assertFileExists($first);
        self::assertSame(0, filesize($first));
        self::assertSame(0600, fileperms($first) & 0777);

        new Filesystem()->delete([$first, $second]);
    }

    public function test_a_folder_that_takes_no_file_gives_null(): void
    {
        self::assertNull(TemporaryFile::create('missing-folder/printopoly-test-'));
    }
}
