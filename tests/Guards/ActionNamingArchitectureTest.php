<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ActionNamingGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class ActionNamingArchitectureTest extends TestCase
{
    private const string ACTIONS = 'app/Modules/Editions/Actions/';

    /**
     * @return iterable<string, array{string, string, list<string>, string}>
     */
    public static function actionsThatBreakTheRule(): iterable
    {
        $handle = 'public function handle(): void {}';

        yield 'an Action suffix' => ['DeleteEditionAction', $handle, ['suffix'], 'no `Action` suffix'];
        yield 'one word' => ['Delete', $handle, ['words'], 'at least two words'];
        yield 'one word in capitals' => ['DELETE', $handle, ['words'], 'a verb and a noun'];
        yield 'an execute entry' => ['DeleteEdition', 'public function execute(): void {}', ['entry'], 'one public method, `handle()`'];
        yield 'an invokable action' => ['DeleteEdition', 'public function __invoke(): void {}', ['entry'], 'rename the entry to `handle`'];
        yield 'a second public method' => ['DeleteEdition', $handle . ' public function undo(): void {}', ['entry'], 'make the other methods private'];
        yield 'a public static helper' => ['StoreEdition', $handle . ' public static function limit(): int { return 1; }', ['entry'], 'entry'];
        yield 'no method at all' => ['DeleteEdition', '', ['entry'], 'entry'];
        yield 'a suffix and no handle' => ['ImportAction', 'public function run(): void {}', ['entry', 'suffix'], 'suffix'];
    }

    /**
     * @param list<string> $rules
     */
    #[DataProvider('actionsThatBreakTheRule')]
    public function test_it_detects_an_action_with_the_wrong_name_or_entry(string $name, string $members, array $rules, string $words): void
    {
        $path = self::ACTIONS . $name . '.php';
        [$findings, $explained] = $this->namesOf([$path => self::action($name, $members)]);

        self::assertSame(array_map(static fn (string $rule): string => $rule . ' ' . $path, $rules), $findings);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{array<string, string>}>
     */
    public static function actionsThatPass(): iterable
    {
        $handle = 'public function __construct(private int $limit) {} public function handle(): void {} private function load(): void {}';

        yield 'a verb and a noun with a handle and private helpers' => [[self::ACTIONS . 'DeleteEdition.php' => self::action('DeleteEdition', $handle)]];
        yield 'an action of a subdomain' => [[self::ACTIONS . 'Assets/CopyEditionAssets.php' => self::action('CopyEditionAssets', $handle)]];
        yield 'a name that holds Action in the middle' => [[self::ACTIONS . 'RecordActionLog.php' => self::action('RecordActionLog', $handle)]];
        yield 'an interface and an abstract class in the folder' => [[self::ACTIONS . 'Deletes.php' => "<?php\ninterface Deletes { public function handle(): void; }\n", self::ACTIONS . 'BaseAction.php' => "<?php\nabstract class BaseAction {}\n"]];
        yield 'a class outside an actions folder' => [['app/Modules/Editions/Services/EditionService.php' => self::action('EditionService', 'public function find(): void {}')]];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('actionsThatPass')]
    public function test_it_accepts_an_action_named_by_a_verb_and_a_noun_with_one_handle(array $files): void
    {
        self::assertSame([], $this->namesOf($files)[0]);
    }

        public function test_it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
        {
        self::assertSame(['suffix app/Actions/Account/DeleteAccountAction.php'], $this->namesOf(['app/Actions/Account/DeleteAccountAction.php' => self::action('DeleteAccountAction', 'public function handle(): void {}')], '.checkout-')[0]);
    }

        public function test_it_keeps_every_action_named_and_shaped_or_on_the_counted_list(): void
        {
        $guard = new ActionNamingGuard(new PhpFileInspector(), $this->root(), 'app', 'Actions');

        self::assertSame([], $guard->explain($guard->findings()));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function namesOf(array $files, string $prefix = 'source-sandbox-'): array
    {
        $root = SourceSandbox::create($files, $prefix);

        try {
            $guard = new ActionNamingGuard(new PhpFileInspector(), $root, 'app', 'Actions');
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private static function action(string $name, string $members): string
    {
        return "<?php\nnamespace App\\Modules\\Editions\\Actions;\nfinal readonly class {$name} { {$members} }\n";
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
