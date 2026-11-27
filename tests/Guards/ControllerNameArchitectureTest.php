<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ControllerNameGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class ControllerNameArchitectureTest extends TestCase
{
    private const string GUIDE = 'docs/guards/controller-names.md';

    private const string FOLDER = 'app/Http/Controllers';

    private const string VERBS = "| Werkwoord | Betekenis |\n| --- | --- |\n| `Show` | toont |\n| `Store` | slaat op |\n| `Download` | levert een bestand |\n";

    /**
     * @return iterable<string, array{array<string, string>, list<string>, string, 3?: string}>
     */
    public static function controllersThatBreakTheRule(): iterable
    {
        yield 'a verb that is not on the list' => [self::controllers(['Editions/Edition/PublishController']), ['verb app/Http/Controllers/Editions/Edition/PublishController.php'], 'not named after a verb of the table'];
        yield 'a verb with a noun in the final place' => [self::controllers(['Editions/Edition/ShowEditionController']), ['verb app/Http/Controllers/Editions/Edition/ShowEditionController.php'], 'rename it to one'];
        yield 'a controller of today that starts with no listed verb' => [self::controllers(['Editions/PublishEditionController']), ['verb app/Http/Controllers/Editions/PublishEditionController.php'], 'verb'];
        yield 'a verb that only starts like a listed verb' => [self::controllers(['ShowcaseController']), ['verb app/Http/Controllers/ShowcaseController.php'], 'verb'];
        yield 'a controller without the suffix' => [self::controllers(['Editions/Edition/Show']), ['suffix app/Http/Controllers/Editions/Edition/Show.php'], 'a controller is named `<Verb>Controller`'];
        yield 'a listed verb no controller carries' => [self::controllers(['Editions/Edition/ShowController']), ['stale Rename'], 'no controller carries it: remove the row', self::VERBS . "| `Rename` | geeft een nieuwe naam |\n"];
        yield 'a guide without the table of verbs' => [self::controllers(['Editions/Edition/ShowController']), ['guide ' . self::GUIDE], 'holds no table of verbs', "# Guard\n\nShow, Store.\n"];
    }

    /**
     * @param array<string, string> $files
     * @param list<string> $findings
     */
    #[DataProvider('controllersThatBreakTheRule')]
    public function test_it_detects_a_controller_not_named_after_a_listed_verb_and_a_verb_no_controller_carries(array $files, array $findings, string $words, string $verbs = self::VERBS): void
    {
        $files[self::FOLDER . '/Pages/Home/ShowController.php'] = self::controller('ShowController');
        $files[self::FOLDER . '/Print/Zip/DownloadController.php'] = self::controller('DownloadController');
        $files[self::FOLDER . '/Print/StorePrintJobController.php'] = self::controller('StorePrintJobController');
        [$found, $explained] = $this->namesOf($files, $verbs);

        self::assertSame($findings, $found);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function controllersThatPass(): iterable
    {
        yield 'every listed verb in its final place' => [self::controllers(['Editions/Edition/ShowController', 'Editions/Edition/StoreController', 'Print/Zip/DownloadController'])];
        yield 'controllers of today that start with a listed verb' => [self::controllers(['Editions/ShowEditionController', 'Print/StorePrintJobController', 'DownloadZipController'])];
        yield 'the abstract base controller beside them' => [[self::FOLDER . '/Controller.php' => "<?php\nabstract class Controller {}\n", ...self::controllers(['Editions/Edition/ShowController', 'Editions/Edition/StoreController', 'Print/Zip/DownloadController'])]];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('controllersThatPass')]
    public function test_it_accepts_a_listed_verb_in_the_final_place_and_the_leading_verb_of_a_controller_that_is_not_moved_yet(array $files): void
    {
        self::assertSame([], $this->namesOf($files, self::VERBS)[0]);
    }

    public function test_it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
    {
        self::assertSame(['stale Download', 'stale Store', 'verb app/Http/Controllers/Editions/Edition/PublishController.php'], $this->namesOf(self::controllers(['Editions/Edition/ShowController', 'Editions/Edition/PublishController']), self::VERBS, '.checkout-')[0]);
    }

    public function test_it_pins_the_verbs_of_the_guide_and_names_every_controller_after_one(): void
    {
        $guard = new ControllerNameGuard(new PhpFileInspector(), $this->root(), self::FOLDER, self::GUIDE);
        $findings = $guard->findings();

        self::assertSame(['Close', 'Count', 'Create', 'Delete', 'Download', 'Duplicate', 'Handle', 'Import', 'List', 'Logout', 'Patch', 'Redirect', 'Rename', 'Renew', 'Replace', 'Resolve', 'Show', 'Start', 'Store', 'Update'], $guard->verbs());
        self::assertSame([], $findings, implode("\n", $guard->explain($findings)));
    }

    /**
     * @param list<string> $names
     * @return array<string, string>
     */
    private static function controllers(array $names): array
    {
        $files = [];

        foreach ($names as $name) {
            $files[self::FOLDER . '/' . $name . '.php'] = self::controller(basename($name));
        }

        return $files;
    }

    private static function controller(string $class): string
    {
        return "<?php\nnamespace App\\Http\\Controllers;\nfinal readonly class {$class} { public function __invoke(): void {} }\n";
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function namesOf(array $files, string $verbs, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create([self::GUIDE => $verbs, ...$files], $prefix);

        try {
            $guard = new ControllerNameGuard(new PhpFileInspector(), $root, self::FOLDER, self::GUIDE);
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
