<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Arg;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\NodeFinder;

final readonly class EnvExampleGuard
{
    /**
     * @param string $stockConfigs a glob of the folders that hold the configs the packages ship, relative to the root
     */
    public function __construct(
        private string $root,
        private string $configFolder,
        private string $example,
        private string $stockConfigs,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        if (! is_file($this->root . '/' . $this->example)) {
            return ['the file ' . $this->example . ' does not exist: it lists every setting the configs read'];
        }

        $configs = [];
        $stock = [];

        foreach (new PhpFileInspector()->phpFiles($this->root . '/' . $this->configFolder) as $file) {
            $name = basename($file);
            $configs[$this->configFolder . '/' . $name] = (string) file_get_contents($file);
            $shipped = glob($this->root . '/' . $this->stockConfigs . '/' . $name);

            foreach (is_array($shipped) ? $shipped : [] as $original) {
                $stock[$this->configFolder . '/' . $name][] = (string) file_get_contents($original);
            }
        }

        return $this->inProject($configs, $stock, (string) file_get_contents($this->root . '/' . $this->example));
    }

    /**
     * @param array<string, string> $configs the source of each config file by its path
     * @param array<string, list<string>> $stock the source of the configs a package ships, by the path of the project's copy
     * @return list<string>
     */
    public function inProject(array $configs, array $stock, string $example): array
    {
        preg_match_all('/^(?:#\s*)?([A-Z][A-Z0-9_]*)=/m', $example, $matches);
        $listed = array_flip($matches[1]);
        $violations = [];

        foreach ($configs as $path => $source) {
            $shipped = array_merge([], ...array_map($this->keysIn(...), $stock[$path] ?? []));

            foreach (array_diff($this->keysIn($source), $shipped) as $key) {
                if (! isset($listed[$key])) {
                    $violations[] = $path . ' reads ' . $key . ', which ' . $this->example . ' does not list: a new setup misses the setting. Add `' . $key . '=` with its value for development';
                }
            }
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    private function keysIn(string $source): array
    {
        $keys = [];

        foreach (new NodeFinder()->findInstanceOf(PhpSource::parse($source), FuncCall::class) as $call) {
            $first = $call->args[0] ?? null;
            $argument = $first instanceof Arg ? $first->value : null;

            if ($call->name instanceof Name && $call->name->toLowerString() === 'env' && $argument instanceof String_) {
                $keys[] = $argument->value;
            }
        }

        return array_values(array_unique($keys));
    }
}
