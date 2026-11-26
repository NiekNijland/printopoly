<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\Architecture\ModuleOverlapGuard;
use Tests\Support\SourceSandbox;

final class OneModulePerDomainArchitectureTest extends TestCase
{
    private const string GUIDE = 'docs/guards/layout.md';

    /**
     * @return iterable<string, array{list<string>, list<string>}>
     */
    public static function domainsThatDifferByAPluralOrAPrefix(): iterable
    {
        yield 'a prefix' => [['Products', 'ProductPrices', 'ProductImages'], ['ProductImages overlaps Products', 'ProductPrices overlaps Products']];
        yield 'a plural' => [['Edition', 'Editions'], ['Editions overlaps Edition']];
        yield 'a prefix of a singular' => [['Stock', 'StockLevels'], ['StockLevels overlaps Stock']];
        yield 'a prefix of a plural' => [['Users', 'UserRoles'], ['UserRoles overlaps Users']];
        yield 'an es plural' => [['Box', 'Boxes'], ['Boxes overlaps Box']];
        yield 'a y that becomes ies' => [['Category', 'Categories'], ['Categories overlaps Category']];
    }

    /**
     * @param list<string> $domains
     * @param list<string> $findings
     */
    #[Test]
    #[DataProvider('domainsThatDifferByAPluralOrAPrefix')]
    public function it_detects_two_domains_that_differ_only_by_a_plural_or_a_prefix(array $domains, array $findings): void
    {
        $guard = new ModuleOverlapGuard($this->root(), 'app', self::GUIDE);

        self::assertSame($findings, $guard->inDomains($domains));
        self::assertStringContainsString('one module per domain. Fold', implode("\n", $guard->explain($findings)));
    }

    /**
     * @return iterable<string, array{list<string>}>
     */
    public static function differentDomains(): iterable
    {
        yield 'a word that only starts the same' => [['Rate', 'Ratings', 'Returns', 'TaxReturns', 'Stock', 'Stockists']];
        yield 'the modules of this project' => [['Editions', 'Print', 'Boxes', 'Photos', 'Accounts', 'Content', 'Analytics']];
        yield 'one module' => [['Print']];
    }

    /**
     * @param list<string> $domains
     */
    #[Test]
    #[DataProvider('differentDomains')]
    public function it_accepts_different_domains_and_the_near_misses_of_a_shared_start(array $domains): void
    {
        self::assertSame([], new ModuleOverlapGuard($this->root(), 'app', self::GUIDE)->inDomains($domains));
    }

    #[Test]
    public function it_reads_the_listed_modules_the_module_folders_and_the_flat_folders_of_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            self::GUIDE => (string) file_get_contents($this->root() . '/' . self::GUIDE),
            'app/Modules/Box/Actions/CloseBox.php' => "<?php\n",
            'app/Photo/PhotoCrop.php' => "<?php\n",
            'app/Actions/DeleteEdition.php' => "<?php\n",
            'app/Http/Middleware/SetLocale.php' => "<?php\n",
        ], prefix: '.checkout-');

        try {
            $guard = new ModuleOverlapGuard($root, 'app', self::GUIDE);
            $domains = $guard->domains();
            $findings = $guard->findings();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame(['Accounts', 'Analytics', 'Box', 'Boxes', 'Content', 'Editions', 'Photo', 'Photos', 'Print'], $domains);
        self::assertSame(['Boxes overlaps Box', 'Photos overlaps Photo'], $findings);
    }

    #[Test]
    public function it_has_one_module_per_domain_or_the_overlap_is_on_the_counted_list(): void
    {
        $guard = new ModuleOverlapGuard($this->root(), 'app', self::GUIDE);

        self::assertSame([], new CountedList($this->root(), 'lists/module-overlap.txt')->violations($guard->findings(), $guard->explain(...)));
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
