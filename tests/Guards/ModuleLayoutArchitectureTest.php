<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\Architecture\ModuleLayoutGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class ModuleLayoutArchitectureTest extends TestCase
{
    private const string GUIDE = 'docs/guards/layout.md';

    /**
     * @return iterable<string, array{string, string, string}>
     */
    public static function classesOutsideTheTables(): iterable
    {
        yield 'a file in the root of a module' => ['app/Modules/Editions/Loose.php', 'place app/Modules/Editions/Loose.php', 'no row of the tables in docs/guards/layout.md holds a class here'];
        yield 'a folder the module table does not name' => ['app/Modules/Editions/Helpers/Thing.php', 'place app/Modules/Editions/Helpers/Thing.php', 'place'];
        yield 'a model folder inside a module' => ['app/Modules/Editions/Models/Edition.php', 'place app/Modules/Editions/Models/Edition.php', 'place'];
        yield 'two folders of subdomain' => ['app/Modules/Print/Actions/Runs/Deep/StartRun.php', 'place app/Modules/Print/Actions/Runs/Deep/StartRun.php', 'place'];
        yield 'a module that is not on the list' => ['app/Modules/Orders/Actions/CancelOrder.php', 'place app/Modules/Orders/Actions/CancelOrder.php', 'of a listed module'];
        yield 'a module named in lower case' => ['app/Modules/editions/Actions/DeleteEdition.php', 'place app/Modules/editions/Actions/DeleteEdition.php', 'place'];
        yield 'an adapter of a system that is not on the list' => ['app/Integrations/Stripe/StripeClient.php', 'place app/Integrations/Stripe/StripeClient.php', 'of a listed system'];
        yield 'an adapter two folders deep' => ['app/Integrations/Chrome/Pdf/Render/Driver.php', 'place app/Integrations/Chrome/Pdf/Render/Driver.php', 'place'];
        yield 'a flat domain folder of today' => ['app/Print/PrintLayout.php', 'place app/Print/PrintLayout.php', 'place'];
        yield 'a class directly in app' => ['app/Helper.php', 'place app/Helper.php', 'place'];
        yield 'a controller in the controller root' => ['app/Http/Controllers/ShowHomeController.php', 'place app/Http/Controllers/ShowHomeController.php', 'place'];
        yield 'a controller one folder deep' => ['app/Http/Controllers/Editions/ShowEditionController.php', 'place app/Http/Controllers/Editions/ShowEditionController.php', 'place'];
        yield 'a model in a subfolder' => ['app/Models/Print/PrintJob.php', 'place app/Models/Print/PrintJob.php', 'place'];
        yield 'a job without its suffix' => ['app/Modules/Print/Jobs/GeneratePrint.php', 'name app/Modules/Print/Jobs/GeneratePrint.php', 'follow the Name column (Naam) of its row'];
        yield 'a service named with the suffix of another folder' => ['app/Modules/Print/Services/RefreshTextsJob.php', 'name app/Modules/Print/Services/RefreshTextsJob.php', 'the folder is right and the name is not'];
        yield 'an action with the suffix the table forbids' => ['app/Modules/Editions/Actions/DeleteEditionAction.php', 'name app/Modules/Editions/Actions/DeleteEditionAction.php', 'name'];
        yield 'a notification in the mail folder' => ['app/Modules/Accounts/Mail/WarningNotification.php', 'name app/Modules/Accounts/Mail/WarningNotification.php', 'name'];
        yield 'a policy without its suffix' => ['app/Policies/Edition.php', 'name app/Policies/Edition.php', 'name'];
        yield 'a provider without its suffix' => ['app/Providers/Horizon.php', 'name app/Providers/Horizon.php', 'name'];
        yield 'a controller without its suffix' => ['app/Http/Controllers/Editions/Edition/Show.php', 'name app/Http/Controllers/Editions/Edition/Show.php', 'name'];
        yield 'a form request without its suffix' => ['app/Http/Requests/Editions/StoreEdition.php', 'name app/Http/Requests/Editions/StoreEdition.php', 'name'];
    }

    #[Test]
    #[DataProvider('classesOutsideTheTables')]
    public function it_fails_a_class_outside_the_tables_of_the_guide_or_with_the_wrong_name(string $file, string $finding, string $words): void
    {
        [$findings, $explained] = $this->layoutOf([$file]);

        self::assertSame([$finding], $findings);
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    /**
     * @return iterable<string, array{list<string>}>
     */
    public static function classesInsideTheTables(): iterable
    {
        yield 'a class in every module folder, with the suffix of its folder' => [[
            'app/Modules/Editions/Actions/DeleteEdition.php',
            'app/Modules/Editions/Services/EditionService.php',
            'app/Modules/Print/Services/ChromeClient.php',
            'app/Modules/Print/Jobs/GeneratePrintJob.php',
            'app/Modules/Print/Events/PrintStatusUpdatedEvent.php',
            'app/Modules/Accounts/Mail/InactiveAccountWarningMail.php',
            'app/Modules/Accounts/Notifications/WarningNotification.php',
            'app/Modules/Print/Commands/CleanupPrintFilesCommand.php',
            'app/Modules/Photos/Exceptions/PhotoRejectedException.php',
            'app/Modules/Content/Data/SeoData.php',
        ]];
        yield 'a listener, which says what it does' => [['app/Modules/Editions/Listeners/CopyEditionAssets.php']];
        yield 'folders with no suffix' => [['app/Modules/Photos/ValueObjects/PhotoCrop.php', 'app/Modules/Print/Support/Imposition.php', 'app/Modules/Print/Enums/PrintPart.php', 'app/Modules/Print/Contracts/PdfRenderer.php', 'app/Modules/Analytics/Facades/Features.php']];
        yield 'one folder of subdomain' => [['app/Modules/Print/Actions/Runs/StartPrintRun.php']];
        yield 'a name that only contains the forbidden suffix' => [['app/Modules/Editions/Actions/ActionPlan.php']];
        yield 'an adapter of a listed system, flat and one folder deep' => [['app/Integrations/Chrome/ChromePdfRenderer.php', 'app/Integrations/Poppler/Contracts/PdfInspector.php']];
        yield 'the framework layer' => [[
            'app/Http/Controllers/Controller.php',
            'app/Http/Controllers/Editions/Edition/ShowController.php',
            'app/Http/Middleware/SetLocale.php',
            'app/Http/Requests/Editions/StoreEditionRequest.php',
            'app/Models/Edition.php',
            'app/Policies/EditionPolicy.php',
            'app/Providers/AppServiceProvider.php',
            'app/Support/MailConfig.php',
        ]];
    }

    /**
     * @param list<string> $files
     */
    #[Test]
    #[DataProvider('classesInsideTheTables')]
    public function it_accepts_the_places_and_names_of_the_tables(array $files): void
    {
        self::assertSame([], $this->layoutOf($files)[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function guidesWithoutTheTables(): iterable
    {
        $guide = self::file(self::GUIDE);

        yield 'no table of module folders' => [str_replace('| Map | Bevat | Naam |', '| Folder | Holds | Name |', $guide)];
        yield 'no table of layers' => [str_replace('| Laag | Bevat | Naam |', '| Layer | Holds | Name |', $guide)];
        yield 'no module root' => [str_replace('`app/Modules/<Domain>`', '`app/Modules`', $guide)];
        yield 'no modules' => [(string) preg_replace('/(\| `app\/Modules\/<Domain>` \|[^|]*\|)[^\n]*/', '$1 |', $guide)];
    }

    #[Test]
    #[DataProvider('guidesWithoutTheTables')]
    public function it_fails_a_guide_that_lost_a_table_it_reads(string $guide): void
    {
        [$findings, $explained] = $this->layoutOf(['app/Models/Edition.php'], $guide);

        self::assertSame(['guide ' . self::GUIDE], $findings);
        self::assertStringContainsString('the guard is generated from them', implode("\n", $explained));
    }

    #[Test]
    public function it_pins_the_modules_adapters_layers_and_folders_of_the_guide(): void
    {
        $table = new ModuleLayoutGuard(new PhpFileInspector(), self::root(), 'app', self::GUIDE)->table();

        self::assertSame('app/Modules', $table->moduleRoot);
        self::assertSame(['Editions', 'Print', 'Boxes', 'Photos', 'Accounts', 'Content', 'Analytics'], $table->modules);
        self::assertSame('app/Integrations', $table->adapterRoot);
        self::assertSame(['Chrome', 'Poppler', 'Ssr', 'Google'], $table->adapters);
        self::assertSame(['app/Http/Controllers', 'app/Http/Controllers/<Area>/<Noun>', 'app/Http/Middleware', 'app/Http/Requests/<Area>', 'app/Models', 'app/Policies', 'app/Providers', 'app/Support'], array_keys($table->layers));
        self::assertSame(['Actions', 'Services', 'Data', 'ValueObjects', 'Support', 'Enums', 'Events', 'Listeners', 'Jobs', 'Commands', 'Mail', 'Notifications', 'Exceptions', 'Contracts', 'Facades'], array_keys($table->folders));
        self::assertSame(['Action', null], [$table->folders['Actions']['forbidden'], $table->folders['Actions']['exact']]);
        self::assertSame('Controller', $table->layers['app/Http/Controllers']['exact']);
    }

    #[Test]
    public function it_names_the_file_relative_to_a_root_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([self::GUIDE => self::file(self::GUIDE), 'app/Modules/Print/Loose.php' => "<?php\n", 'app/Models/Edition.php' => "<?php\n"], prefix: '.checkout-');

        try {
            $findings = new ModuleLayoutGuard(new PhpFileInspector(), $root, 'app', self::GUIDE)->findings();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame(['place app/Modules/Print/Loose.php'], $findings);
    }

    #[Test]
    public function it_keeps_every_class_of_app_where_the_tables_put_it_or_on_the_counted_list(): void
    {
        $guard = new ModuleLayoutGuard(new PhpFileInspector(), self::root(), 'app', self::GUIDE);

        self::assertSame([], new CountedList(self::root(), 'lists/layout.txt')->violations($guard->findings(), $guard->explain(...)));
    }

    /**
     * @param list<string> $files
     * @return array{list<string>, list<string>}
     */
    private function layoutOf(array $files, ?string $guide = null): array
    {
        $root = SourceSandbox::create([self::GUIDE => $guide ?? self::file(self::GUIDE), ...array_fill_keys($files, "<?php\n")]);

        try {
            $guard = new ModuleLayoutGuard(new PhpFileInspector(), $root, 'app', self::GUIDE);
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private static function file(string $path): string
    {
        return (string) file_get_contents(self::root() . '/' . $path);
    }

    private static function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
