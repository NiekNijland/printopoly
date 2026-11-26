<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Date;
use PhpParser\Node;
use PhpParser\Node\Arg;
use PhpParser\Node\Expr\ArrayDimFetch;
use PhpParser\Node\Expr\ArrowFunction;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\New_;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;

final class TestStateRules
{
    /** @var array<string, string> */
    public const array RULES = [
        'config-set' => 'config set through the repository: write config([\'key\' => $value])',
        'clock-set' => 'the clock pinned on the date class: write $this->travelTo() or $this->freezeTime(); only a test of the pure unit tier, which has no test clock, pins the date class',
        'wall-clock' => 'a read of the wall clock, which the test clock does not move: read now() and move it with $this->travelTo()',
        'container-binding' => 'a ready object bound into the container another way: write app()->instance(Abstract::class, $fake)',
    ];

    private const array CONFIG_FACADES = [Config::class, 'Config'];

    private const array CLOCK_CLASSES = ['Carbon', 'CarbonImmutable', 'Date', Carbon::class, Date::class, \Carbon\Carbon::class, CarbonImmutable::class];

    private const array CLOCK_SETTERS = ['settestnow', 'settestnowandtimezone'];

    private const array WALL_CLOCK_FUNCTIONS = ['time', 'microtime', 'hrtime'];

    private const array ONE_ARGUMENT_CLOCK_FUNCTIONS = ['date', 'gmdate', 'idate'];

    private const array DATE_CLASSES = ['DateTime', 'DateTimeImmutable'];

    private const array APP_FACADES = [App::class, 'App'];

    private const array BINDINGS = ['instance', 'bind', 'singleton', 'scoped', 'bindif', 'singletonif', 'extend'];

    public static function rule(Node $node, bool $hasTestClock): ?string
    {
        return match (true) {
            $node instanceof StaticCall => self::staticRule($node, $hasTestClock),
            $node instanceof MethodCall => self::methodRule($node),
            $node instanceof FuncCall => self::functionRule($node),
            $node instanceof New_ => self::newRule($node),
            default => null,
        };
    }

    private static function staticRule(StaticCall $call, bool $hasTestClock): ?string
    {
        if (! $call->class instanceof Name || ! $call->name instanceof Identifier) {
            return null;
        }

        $class = ltrim($call->class->toString(), '\\');
        $name = $call->name->toLowerString();

        if ($name === 'set' && in_array($class, self::CONFIG_FACADES, true)) {
            return 'config-set';
        }

        if ($hasTestClock && in_array($name, self::CLOCK_SETTERS, true) && in_array($class, self::CLOCK_CLASSES, true)) {
            return 'clock-set';
        }

        if (in_array($class, self::APP_FACADES, true) && in_array($name, self::BINDINGS, true) && ($name === 'instance' || self::bindsReadyObject($call))) {
            return 'container-binding';
        }

        return null;
    }

    private static function methodRule(MethodCall $call): ?string
    {
        if (! $call->name instanceof Identifier) {
            return null;
        }

        $name = $call->name->toLowerString();
        $receiver = $call->var;

        if ($name === 'set' && self::isConfigRepository($receiver)) {
            return 'config-set';
        }

        if (! in_array($name, self::BINDINGS, true)) {
            return null;
        }

        if ($receiver instanceof PropertyFetch && $receiver->var instanceof Variable && $receiver->var->name === 'this' && $receiver->name instanceof Identifier && $receiver->name->toString() === 'app') {
            return 'container-binding';
        }

        if ($name === 'instance' && $receiver instanceof Variable && $receiver->name === 'this') {
            return 'container-binding';
        }

        if ($name !== 'instance' && $receiver instanceof FuncCall && self::isFunction($receiver, 'app') && $receiver->args === [] && self::bindsReadyObject($call)) {
            return 'container-binding';
        }

        return null;
    }

    private static function functionRule(FuncCall $call): ?string
    {
        if (! $call->name instanceof Name) {
            return null;
        }

        $name = $call->name->getLast();
        $arguments = $call->isFirstClassCallable() ? [] : $call->getArgs();

        if (in_array(mb_strtolower($name), self::WALL_CLOCK_FUNCTIONS, true)) {
            return 'wall-clock';
        }

        if (in_array(mb_strtolower($name), self::ONE_ARGUMENT_CLOCK_FUNCTIONS, true) && count($arguments) === 1) {
            return 'wall-clock';
        }

        return mb_strtolower($name) === 'mktime' && $arguments === [] ? 'wall-clock' : null;
    }

    private static function newRule(New_ $new): ?string
    {
        if (! $new->class instanceof Name || ! in_array(ltrim($new->class->toString(), '\\'), self::DATE_CLASSES, true)) {
            return null;
        }

        $first = $new->getArgs()[0]->value ?? null;

        return $first === null || ($first instanceof String_ && mb_strtolower($first->value) === 'now') ? 'wall-clock' : null;
    }

    private static function isConfigRepository(Node $receiver): bool
    {
        if ($receiver instanceof FuncCall && self::isFunction($receiver, 'config') && $receiver->args === []) {
            return true;
        }

        if ($receiver instanceof FuncCall && self::isFunction($receiver, 'app') && count($receiver->args) === 1) {
            $argument = $receiver->args[0];

            return $argument instanceof Arg && $argument->value instanceof String_ && $argument->value->value === 'config';
        }

        return $receiver instanceof ArrayDimFetch && $receiver->dim instanceof String_ && $receiver->dim->value === 'config';
    }

    private static function isFunction(FuncCall $call, string $name): bool
    {
        return $call->name instanceof Name && mb_strtolower($call->name->getLast()) === $name;
    }

    private static function bindsReadyObject(MethodCall|StaticCall $call): bool
    {
        $concrete = $call->isFirstClassCallable() ? null : ($call->getArgs()[1]->value ?? null);

        return $concrete instanceof ArrowFunction && $concrete->params === [] && $concrete->expr instanceof Variable;
    }
}
