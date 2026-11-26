<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * A controller refuses nothing itself: no `authorize()` (the controller trait, the gate, a policy response), no call of the
 * gate facade (`allows`, `denies`, `check`, `inspect`, ...), no `can()` or `cannot()` on a user, no `abort()`,
 * `abort_if()` or `abort_unless()` (any status: a missing record is the 404 of the route binding, a bad input the 422 of
 * the form request, a limit the 429 of the throttle), and no hand-built 401 or 403 exception. The permission sits on the
 * route (`can:`), the rule about a record in its policy, the rule about the input in the form request.
 * Blind spots, named in the guide: a refusal inside a helper of another class the controller calls, and a gate that the
 * controller receives as a parameter.
 */
final readonly class ControllerAuthorizationGuard
{
    private const string MESSAGE = 'an action checks or refuses access itself: put the permission on the route (can:), the rule about a record in its policy, the rule about the input in the form request';

    private const array REFUSING_EXCEPTIONS = ['AuthorizationException', 'AccessDeniedHttpException', 'UnauthorizedHttpException'];

    /**
     * @param string $folder the controller folder, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $folder,
    ) {
    }

    /**
     * @return list<string> `path: line N: message` per refusal, relative to the root
     */
    public function violations(): array
    {
        return FolderScan::over($this->inspector, $this->root, [$this->folder], fn (string $path, string $source): array => $this->inSource($source));
    }

    /**
     * @return list<string> `line N: message` per refusal in the source
     */
    public function inSource(string $source): array
    {
        $lines = [];

        foreach ($this->inspector->calls($source) as $call) {
            $function = $call['kind'] === 'function' ? mb_strtolower(ltrim($call['written'], '\\')) : '';
            $onGate = $call['kind'] === 'static' && basename(str_replace('\\', '/', $call['class'] ?? '')) === 'Gate';

            if (in_array($call['kind'], ['method', 'nullsafe', 'static'], true) && in_array($call['name'], ['authorize', 'authorizeforuser', 'can', 'cannot', 'cant'], true)) {
                $lines[] = $call['line'];
            } elseif ($onGate || in_array($function, ['abort', 'abort_if', 'abort_unless'], true)) {
                $lines[] = $call['line'];
            }
        }

        foreach (PhpCallReader::instantiations($source) as $instantiation) {
            $class = basename(str_replace('\\', '/', $instantiation['class']));

            if (in_array($class, self::REFUSING_EXCEPTIONS, true) || ($class === 'HttpException' && in_array(trim($instantiation['arguments'][0] ?? '', '() '), ['401', '403'], true))) {
                $lines[] = $instantiation['line'];
            }
        }

        sort($lines);

        return array_map(static fn (int $line): string => 'line ' . $line . ': ' . self::MESSAGE, $lines);
    }
}
