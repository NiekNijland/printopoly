<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use PhpParser\Node;
use PhpParser\Node\ArrayItem;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\Array_;
use PhpParser\Node\Expr\BinaryOp\Concat;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Return_;
use PhpParser\NodeFinder;

final readonly class ValidationMessageGuard
{
    private const string RULE_FACTORY = Rule::class;

    private const array WITHOUT_MESSAGE = ['bail', 'exclude', 'exclude_if', 'exclude_unless', 'exclude_with', 'exclude_without', 'nullable', 'sometimes'];

    /**
     * @param list<string> $folders the source folders, relative to the root
     * @param string $messages the validation texts of the default language, relative to the root
     */
    public function __construct(
        private string $root,
        private array $folders,
        private string $messages,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        if (! is_file($this->root . '/' . $this->messages)) {
            return ['the file ' . $this->messages . ' does not exist: without it a visitor in the default language sees the key of every validation rule. Add it with a text per rule'];
        }

        $inspector = new PhpFileInspector();
        $sources = [];

        foreach ($this->folders as $folder) {
            foreach ($inspector->phpFiles($this->root . '/' . $folder) as $file) {
                $sources[Str::after($file, $this->root . '/')] = (string) file_get_contents($file);
            }
        }

        $file = $this->root . '/' . $this->messages;
        $messages = (static fn (): mixed => require $file)();

        return $this->inSources($sources, is_array($messages) ? $messages : []);
    }

    /**
     * @param array<string, string> $sources the PHP source of each file by its path
     * @param array<array-key, mixed> $messages the validation texts by rule
     * @return list<string>
     */
    public function inSources(array $sources, array $messages): array
    {
        $violations = [];

        foreach ($sources as $path => $source) {
            foreach ($this->rulesIn(PhpSource::parse($source)) as $rule) {
                if (! $this->isText($messages[$rule] ?? null)) {
                    $violations[] = $path . ': the validation rule `' . $rule . '` has no text in ' . $this->messages . ': a visitor sees the key validation.' . $rule . '. Add the text';
                }
            }
        }

        return array_values(array_unique($violations));
    }

    /**
     * @param list<Node> $statements
     * @return list<string>
     */
    private function rulesIn(array $statements): array
    {
        $finder = new NodeFinder();
        $rules = [];

        foreach ($finder->findInstanceOf($statements, ClassMethod::class) as $method) {
            if ($method->name->toString() !== 'rules') {
                continue;
            }

            foreach ($finder->findInstanceOf($method->stmts ?? [], Return_::class) as $return) {
                if (! $return->expr instanceof Array_) {
                    continue;
                }

                foreach ($return->expr->items as $field) {
                    $entries = $field->value instanceof Array_ ? array_map(static fn (ArrayItem $item): Expr => $item->value, $field->value->items) : [$field->value];

                    foreach ($entries as $entry) {
                        array_push($rules, ...$this->namesOf($entry));
                    }
                }
            }
        }

        return array_values(array_diff(array_unique($rules), self::WITHOUT_MESSAGE));
    }

    /**
     * @return list<string>
     */
    private function namesOf(Expr $entry): array
    {
        while ($entry instanceof Concat) {
            $entry = $entry->left;
        }

        if ($entry instanceof StaticCall && $entry->class instanceof Name && $entry->class->toString() === self::RULE_FACTORY && $entry->name instanceof Identifier) {
            return [Str::snake($entry->name->toString())];
        }

        if (! $entry instanceof String_) {
            return [];
        }

        $parts = preg_match('/^(not_)?regex:/', $entry->value) === 1 ? [$entry->value] : explode('|', $entry->value);

        return array_values(array_filter(array_map(static fn (string $part): string => Str::snake(Str::before(trim($part), ':')), $parts), static fn (string $name): bool => $name !== ''));
    }

    private function isText(mixed $message): bool
    {
        if (is_array($message)) {
            return $message !== [] && array_all($message, static fn (mixed $text): bool => is_string($text) && trim($text) !== '');
        }

        return is_string($message) && trim($message) !== '';
    }
}
