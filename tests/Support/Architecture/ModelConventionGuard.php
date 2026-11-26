<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * A model declares its casts, its fillable list, its table, its connection, its hidden fields, its accessors and its boot hook one way: the casts()
 * method with the immutable date casts, the class attributes #[Fillable], #[Table], #[Connection] and #[Hidden], the Attribute-returning accessor and
 * booted(); never the older spellings, and mass assignment stays guarded (no $guarded, #[Guarded] or #[Unguarded]).
 */
final readonly class ModelConventionGuard
{
    private const array CONVENTIONS = [
        'a casts property' => ['/(?:protected|public|private)\s+(?:\??\w+\s+)?\$casts\s*=/', 'declare the casts in the casts() method'],
        'a guarded property' => ['/(?:protected|public|private)\s+(?:\??\w+\s+)?\$guarded\s*=/', 'list what is fillable in #[Fillable([...])] and never guard the rest'],
        'a guarded or unguarded attribute' => ['/(?<![\w$])(?:Guarded|Unguarded)\s*[(\],]/', 'list what is fillable in #[Fillable([...])]: mass assignment stays guarded'],
        'a fillable property' => ['/(?:protected|public|private)\s+(?:\??\w+\s+)?\$fillable\s*=/', 'list what is fillable in the class attribute #[Fillable([...])]'],
        'a table property' => ['/(?:protected|public|private)\s+(?:\??\w+\s+)?\$table\s*=/', 'name the collection with the class attribute #[Table(name: ...)]'],
        'a connection property' => ['/(?:protected|public|private)\s+(?:\??\w+\s+)?\$connection\s*=/', 'name the connection with the class attribute #[Connection(...)]'],
        'a hidden property' => ['/(?:protected|public|private)\s+(?:\??\w+\s+)?\$hidden\s*=/', 'list the hidden fields in the class attribute #[Hidden([...])]'],
        'a mutable date cast' => ["/=>\s*'(?:datetime|date)(?::[^']*)?'/", "cast a date to 'immutable_datetime' or 'immutable_date'"],
        'a get...Attribute accessor' => ['/function\s+get[A-Z]\w*Attribute\s*\(/', 'write the accessor as a method that returns an Attribute'],
        'a set...Attribute mutator' => ['/function\s+set[A-Z]\w*Attribute\s*\(/', 'write the mutator as a method that returns an Attribute'],
        'an Attribute constructor' => ['/new\s+Attribute\s*\(/', 'write Attribute::make(get: ..., set: ...)'],
        'a boot method' => ['/static\s+function\s+boot\s*\(/', 'write the hook as booted(), which does not need a call to the parent'],
    ];

    public function __construct(
        private CallInspector $inspector,
        private string $root,
        private string $folder,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        return FolderScan::over($this->inspector, $this->root, [$this->folder], fn (string $path, string $source): array => $this->inSource($source));
    }

    /**
     * @return list<string>
     */
    public function inSource(string $source): array
    {
        $messages = [];

        foreach (self::CONVENTIONS as $convention => [$pattern, $replacement]) {
            if (preg_match($pattern, $source) === 1) {
                $messages[] = $convention . ': ' . $replacement;
            }
        }

        return $messages;
    }
}
