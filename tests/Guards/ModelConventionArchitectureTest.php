<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\ModelConventionGuard;
use Tests\Support\SourceSandbox;

final class ModelConventionArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Models;\nuse MongoDB\\Laravel\\Eloquent\\Model;\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function olderSpellings(): iterable
    {
        yield 'a casts property' => [self::HEAD . "class Box extends Model { protected \$casts = ['a' => 'integer']; }\n", 'a casts property: declare the casts in the casts() method'];
        yield 'a fillable property' => [self::HEAD . "class Box extends Model { protected \$fillable = ['a']; }\n", 'a fillable property: list what is fillable in the class attribute #[Fillable([...])]'];
        yield 'a public fillable property' => [self::HEAD . "class Box extends Model { public \$fillable = ['a']; }\n", 'a fillable property'];
        yield 'a guarded property' => [self::HEAD . "class Box extends Model { protected \$guarded = []; }\n", 'a guarded property'];
        yield 'the unguarded attribute' => [self::HEAD . "#[\\Illuminate\\Database\\Eloquent\\Attributes\\Unguarded]\nclass Box extends Model {}\n", 'a guarded or unguarded attribute'];
        yield 'the guarded attribute beside another' => [self::HEAD . "#[Table(name: 'boxes'), Guarded(['a'])]\nclass Box extends Model {}\n", 'a guarded or unguarded attribute'];
        yield 'a table property' => [self::HEAD . "class Box extends Model { protected \$table = 'boxes'; }\n", 'a table property: name the collection with the class attribute #[Table(name: ...)]'];
        yield 'a typed connection property' => [self::HEAD . "class Box extends Model { protected ?string \$connection = 'mongodb'; }\n", 'a connection property'];
        yield 'a hidden property' => [self::HEAD . "class Box extends Model { protected \$hidden = ['secret']; }\n", 'a hidden property'];
        yield 'a mutable date cast' => [self::HEAD . "class Box extends Model { protected function casts(): array { return ['expires_at' => 'datetime']; } }\n", "a mutable date cast: cast a date to 'immutable_datetime'"];
        yield 'a mutable date cast with a format' => [self::HEAD . "class Box extends Model { protected function casts(): array { return ['day' => 'date:Y-m-d']; } }\n", 'a mutable date cast'];
        yield 'a get accessor' => [self::HEAD . "class Box extends Model { public function getNameAttribute(): string { return 'a'; } }\n", 'a get...Attribute accessor'];
        yield 'a set mutator' => [self::HEAD . "class Box extends Model { public function setNameAttribute(string \$v): void {} }\n", 'a set...Attribute mutator'];
        yield 'an Attribute constructor' => [self::HEAD . "class Box extends Model { protected function name(): Attribute { return new Attribute(get: fn () => 'a'); } }\n", 'an Attribute constructor'];
        yield 'a boot method' => [self::HEAD . "class Box extends Model { protected static function boot(): void { parent::boot(); } }\n", 'a boot method: write the hook as booted()'];
    }

    #[DataProvider('olderSpellings')]
    public function test_it_detects_a_model_written_in_an_older_spelling(string $source, string $reason): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

        public function test_it_accepts_the_class_attributes_the_casts_method_and_booted(): void
        {
        $source = self::HEAD . "#[Connection('mongodb')]\n#[Fillable(['a', 'guarded_at'])]\n#[Hidden(['secret'])]\n#[Table(name: 'boxes')]\nclass Box extends Model\n{\n    protected function casts(): array { return ['expires_at' => 'immutable_datetime', 'day' => 'immutable_date']; }\n    protected static function booted(): void {}\n    protected function name(): Attribute { return Attribute::make(get: fn () => 'a'); }\n}\n";

        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

        public function test_it_reads_a_tree_under_a_dot_directory(): void
        {
        $root = SourceSandbox::create(['app/Models/Box.php' => self::HEAD . "class Box extends Model { protected \$table = 'boxes'; }\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame(['app/Models/Box.php: a table property: name the collection with the class attribute #[Table(name: ...)]'], $violations);
    }

        public function test_it_finds_every_model_of_the_real_tree_in_the_one_spelling(): void
        {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): ModelConventionGuard
    {
        return new ModelConventionGuard(new CallInspector(), $root, 'app/Models');
    }
}
