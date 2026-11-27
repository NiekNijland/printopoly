<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\FinalReadonlyGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class FinalReadonlyArchitectureTest extends TestCase
{
    private const array FOLDERS = ['Controllers', 'Actions'];

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function classesThatAreNotFinalReadonly(): iterable
    {
        yield 'a final controller' => ['app/Http/Controllers/Editions/Edition/ShowController.php', 'final class ShowController {}'];
        yield 'a readonly controller' => ['app/Http/Controllers/Editions/Edition/ShowController.php', 'readonly class ShowController {}'];
        yield 'an open controller' => ['app/Http/Controllers/Editions/Edition/ShowController.php', 'class ShowController {}'];
        yield 'a final controller with an attribute' => ['app/Http/Controllers/Editions/Edition/ShowController.php', "#[\\Deprecated]\nfinal class ShowController {}"];
        yield 'a final action' => ['app/Modules/Editions/Actions/DeleteEdition.php', 'final class DeleteEdition {}'];
        yield 'a final action of a subdomain' => ['app/Modules/Editions/Actions/Assets/CopyAssets.php', 'final class CopyAssets {}'];
        yield 'a final action of today' => ['app/Actions/Account/RecordActivity.php', 'final class RecordActivity {}'];
    }

    #[DataProvider('classesThatAreNotFinalReadonly')]
    public function test_it_detects_a_controller_or_an_action_that_is_not_final_readonly(string $path, string $class): void
    {
        [$findings, $explained] = $this->shapeOf([$path => "<?php\nnamespace App;\n" . $class . "\n"]);

        self::assertSame([$path], $findings);
        self::assertStringContainsString('is not `final readonly`: declare it `final readonly class`', implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function classesThatPass(): iterable
    {
        yield 'a final readonly controller and action' => [['app/Http/Controllers/Editions/Edition/ShowController.php' => 'final readonly class ShowController {}', 'app/Modules/Editions/Actions/DeleteEdition.php' => 'final readonly class DeleteEdition {}']];
        yield 'the modifiers in the other order' => [['app/Modules/Editions/Actions/DeleteEdition.php' => 'readonly final class DeleteEdition {}']];
        yield 'the abstract base controller' => [['app/Http/Controllers/Controller.php' => 'abstract class Controller {}']];
        yield 'an interface and a trait in an actions folder' => [['app/Modules/Editions/Actions/Deletes.php' => 'interface Deletes {}', 'app/Modules/Editions/Actions/Logs.php' => 'trait Logs {}']];
        yield 'a final class outside the folders' => [['app/Modules/Editions/Services/EditionService.php' => 'final class EditionService {}', 'app/Support/ActionsMap.php' => 'final class ActionsMap {}']];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('classesThatPass')]
    public function test_it_accepts_final_readonly_classes_and_the_classes_the_rule_does_not_cover(array $files): void
    {
        self::assertSame([], $this->shapeOf(array_map(static fn (string $class): string => "<?php\nnamespace App;\n" . $class . "\n", $files))[0]);
    }

        public function test_it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
        {
        self::assertSame(['app/Modules/Editions/Actions/DeleteEdition.php'], $this->shapeOf(['app/Modules/Editions/Actions/DeleteEdition.php' => "<?php\nfinal class DeleteEdition {}\n"], '.checkout-')[0]);
    }

        public function test_it_keeps_every_controller_and_action_final_readonly_or_on_the_counted_list(): void
        {
        $guard = new FinalReadonlyGuard(new PhpFileInspector(), $this->root(), 'app', self::FOLDERS);

        self::assertSame([], $guard->explain($guard->findings()));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function shapeOf(array $files, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create($files, $prefix);

        try {
            $guard = new FinalReadonlyGuard(new PhpFileInspector(), $root, 'app', self::FOLDERS);
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
