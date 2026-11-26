<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use PhpParser\Node;
use PhpParser\Node\Expr\Array_;
use PhpParser\Node\Expr\ConstFetch;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\New_;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;

final class TestIsolationRules
{
    /** @var array<string, string> */
    public const array RULES = [
        'wait' => 'a real wait: the base set-up fakes Sleep, so wait through the Sleep class and assert it, or move the clock with $this->travel()',
        'stray-switch' => 'a switch of the stray-request or stray-process flag outside the base set-up: fake the requests and processes the test expects; only the base set-up turns the flags on',
        'network' => 'a request that leaves the process: send it through the Http client and fake it with Http::fake([...])',
        'fake-all' => 'a fake of every event, job or command, which silences every listener: name the classes the test asserts, fake([X::class])',
    ];

    private const array WAITS = ['sleep', 'usleep', 'time_nanosleep', 'time_sleep_until'];

    private const array ALWAYS_BANNED_SWITCHES = ['allowstrayrequests', 'allowstrayprocesses'];

    private const array PREVENT_SWITCHES = ['preventstrayrequests', 'preventstrayprocesses'];

    private const array SOCKET_FUNCTIONS = ['curl_init', 'curl_exec', 'curl_multi_exec', 'fsockopen', 'pfsockopen', 'stream_socket_client', 'socket_connect'];

    private const array URL_READERS = ['file_get_contents', 'fopen', 'file', 'copy', 'get_headers', 'readfile'];

    private const array CLIENTS = [Client::class];

    private const array FAKEABLE = [Event::class, Queue::class, Bus::class, 'Event', 'Queue', 'Bus'];

    public static function rule(Node $node, bool $inBaseSetUp): ?string
    {
        return match (true) {
            $node instanceof FuncCall => self::functionRule($node),
            $node instanceof StaticCall => self::switchRule($node, $inBaseSetUp) ?? self::fakeRule($node),
            $node instanceof MethodCall, $node instanceof NullsafeMethodCall => self::switchRule($node, $inBaseSetUp),
            $node instanceof New_ => $node->class instanceof Name && in_array(ltrim($node->class->toString(), '\\'), self::CLIENTS, true) ? 'network' : null,
            default => null,
        };
    }

    private static function functionRule(FuncCall $call): ?string
    {
        if (! $call->name instanceof Name) {
            return null;
        }

        $name = mb_strtolower($call->name->getLast());

        if (in_array($name, self::WAITS, true)) {
            return 'wait';
        }

        if (in_array($name, self::SOCKET_FUNCTIONS, true)) {
            return 'network';
        }

        $first = $call->isFirstClassCallable() ? null : ($call->getArgs()[0]->value ?? null);

        return in_array($name, self::URL_READERS, true) && $first instanceof String_ && preg_match('#^(https?|ftp)://#i', $first->value) === 1 ? 'network' : null;
    }

    private static function switchRule(StaticCall|MethodCall|NullsafeMethodCall $call, bool $inBaseSetUp): ?string
    {
        if (! $call->name instanceof Identifier) {
            return null;
        }

        $name = $call->name->toLowerString();

        if (in_array($name, self::ALWAYS_BANNED_SWITCHES, true)) {
            return 'stray-switch';
        }

        if (! in_array($name, self::PREVENT_SWITCHES, true)) {
            return null;
        }

        $first = $call->isFirstClassCallable() ? null : ($call->getArgs()[0]->value ?? null);
        $turnsOff = $first instanceof ConstFetch && $first->name->toLowerString() === 'false';

        return ! $inBaseSetUp || $turnsOff ? 'stray-switch' : null;
    }

    private static function fakeRule(StaticCall $call): ?string
    {
        if (! $call->class instanceof Name || ! $call->name instanceof Identifier || ! in_array(ltrim($call->class->toString(), '\\'), self::FAKEABLE, true)) {
            return null;
        }

        $arguments = $call->isFirstClassCallable() ? [] : $call->getArgs();

        return match ($call->name->toLowerString()) {
            'fake' => self::isEmptyList($arguments[0]->value ?? null) ? 'fake-all' : null,
            'fakefor' => self::isEmptyList($arguments[1]->value ?? null) ? 'fake-all' : null,
            'fakeexcept', 'fakeexceptfor' => 'fake-all',
            default => null,
        };
    }

    private static function isEmptyList(?Node $argument): bool
    {
        return ! $argument instanceof Node || ($argument instanceof Array_ && $argument->items === []);
    }
}
