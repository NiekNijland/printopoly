<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Foundation\Testing\WithCachedConfig;
use Illuminate\Foundation\Testing\WithCachedRoutes;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Trait_;

final readonly class TestTierGuard
{
    public const string MESSAGE = 'a unit test that boots the application: extend PHPUnit\Framework\TestCase and build the class under test yourself, or move the test to the feature tier';

    private const array BOOTING_ROOTS = [
        TestCase::class,
        RefreshDatabase::class,
        LazilyRefreshDatabase::class,
        DatabaseTransactions::class,
        DatabaseMigrations::class,
        DatabaseTruncation::class,
        WithCachedConfig::class,
        WithCachedRoutes::class,
        'Orchestra\Testbench\TestCase',
    ];

    /**
     * @param string $tests the test folder, relative to the root
     * @param string $unit the folder of the unit tier, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $tests,
        private string $unit,
    ) {
    }

    /**
     * @return list<string> `<path> boots <type>` per booting type a unit test file names, sorted
     */
    public function violations(): array
    {
        $booting = $this->bootingTypes();
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->unit) as $file) {
            foreach (array_intersect($this->inspector->referencedNames($file), $booting) as $type) {
                $found[] = mb_substr($file, mb_strlen($this->root) + 1) . ' boots ' . $type;
            }
        }

        sort($found, SORT_STRING);

        return $found;
    }

    public static function explain(string $finding): string
    {
        return $finding . ': ' . self::MESSAGE;
    }

    /**
     * @return list<string> the framework's booting bases and traits, and every type of the test folder that reaches one
     */
    private function bootingTypes(): array
    {
        $related = [];
        $booting = self::BOOTING_ROOTS;

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            foreach ($this->inspector->declaredTypes($file) as $type => $names) {
                $related[$type] = $names;
            }

            foreach ($this->inspector->declarations($file) as $declaration) {
                if ($declaration instanceof Trait_ && $declaration->namespacedName instanceof Name && $declaration->getMethod('setUp' . $declaration->name?->toString()) instanceof ClassMethod) {
                    $booting[] = $declaration->namespacedName->toString();
                }
            }
        }

        do {
            $grew = false;

            foreach ($related as $type => $names) {
                if (! in_array($type, $booting, true) && array_intersect($names, $booting) !== []) {
                    $booting[] = $type;
                    $grew = true;
                }
            }
        } while ($grew);

        return $booting;
    }
}
