<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\Architecture\FileSizeGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class FileSizeArchitectureTest extends TestCase
{
    private const string GUIDE = 'docs/guards/file-size.md';

    private const array FOLDERS = ['app', 'bootstrap', 'config', 'database', 'routes', 'resources', 'tests'];

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function filesOverTheLimit(): iterable
    {
        yield 'a class of 401 lines' => [self::classOf(401), 'has 401 lines, over the limit of 400'];
        yield 'a class far over' => [self::classOf(900), 'has 900 lines'];
        yield 'a test over the limit' => [str_replace('final class Big', 'final class BigTest extends TestCase', self::classOf(450)), 'has 450 lines'];
        yield 'a file that returns an array and holds more than data' => ["<?php\n\n\$x = 1;\n\nreturn [\n" . str_repeat("    'key' => 'value',\n", 500) . "];\n", 'split it by behavior'];
        yield 'a file that returns a call' => ["<?php\n\nreturn collect([\n" . str_repeat("    'key' => 'value',\n", 500) . "]);\n", 'has 504 lines'];
    }

    #[DataProvider('filesOverTheLimit')]
    public function test_it_detects_a_php_file_over_the_limit_of_the_guide_and_says_how_to_split_it(string $source, string $words): void
    {
        [$findings, $explained] = $this->sizeOf(['app/Big.php' => $source]);

        self::assertSame(['app/Big.php'], $findings);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function filesWithinTheLimit(): iterable
    {
        yield 'exactly 400 lines' => [self::classOf(400)];
        yield 'a short file' => [self::classOf(20)];
        yield 'a data file over the limit' => ["<?php\n\nreturn [\n" . str_repeat("    'key' => 'value',\n", 900) . "];\n"];
        yield 'a data file with a strict-types declaration' => ["<?php\n\ndeclare(strict_types=1);\n\nreturn [\n" . str_repeat("    'key' => 'value',\n", 600) . "];\n"];
    }

    #[DataProvider('filesWithinTheLimit')]
    public function test_it_accepts_a_file_within_the_limit_and_a_file_that_only_returns_data(string $source): void
    {
        self::assertSame([], $this->sizeOf(['app/Big.php' => $source])[0]);
    }

        public function test_it_names_the_file_relative_to_a_root_under_a_dot_directory_in_every_folder(): void
        {
        $files = [];

        foreach (self::FOLDERS as $folder) {
            $files[$folder . '/Big.php'] = self::classOf(450);
            $files[$folder . '/Small.php'] = self::classOf(10);
        }

        self::assertSame(['app/Big.php', 'bootstrap/Big.php', 'config/Big.php', 'database/Big.php', 'resources/Big.php', 'routes/Big.php', 'tests/Big.php'], $this->sizeOf($files, prefix: '.checkout-')[0]);
    }

        public function test_it_fails_a_guide_that_lost_the_sentence_with_the_limit(): void
        {
        [$findings, $explained] = $this->sizeOf(['app/Big.php' => self::classOf(10)], "# Guard: file-size\n\nEen bestand is kort.\n");

        self::assertSame(['guide ' . self::GUIDE], $findings);
        self::assertStringContainsString('no longer holds the sentence the guard reads', implode("\n", $explained));
    }

        public function test_it_keeps_every_php_file_within_the_limit_or_on_the_counted_list(): void
        {
        $guard = new FileSizeGuard(new PhpFileInspector(), $this->root(), self::FOLDERS, self::GUIDE);

        self::assertSame(400, $guard->limit());
        self::assertSame([], new CountedList($this->root(), 'lists/file-size.txt')->violations($guard->findings(), $guard->explain(...)));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function sizeOf(array $files, ?string $guide = null, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create([self::GUIDE => $guide ?? (string) file_get_contents($this->root() . '/' . self::GUIDE), ...$files], $prefix);
        $folders = array_values(array_filter(self::FOLDERS, static fn (string $folder): bool => is_dir($root . '/' . $folder)));

        try {
            $guard = new FileSizeGuard(new PhpFileInspector(), $root, $folders, self::GUIDE);
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private static function classOf(int $lines): string
    {
        return "<?php\n\nfinal class Big\n{\n" . str_repeat("    public int \$line = 1;\n", $lines - 5) . "}\n";
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
