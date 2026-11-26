<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use LogicException;

/**
 * The edits the thin tests make to a copy of a real CI file. Every edit is checked to change something, so an example whose text
 * left the real file throws instead of silently testing the unchanged file.
 */
final class CiExamples
{
    public static function change(string $source, string $from, string $to): string
    {
        throw_unless(str_contains($source, $from), LogicException::class, 'The example does not hold the text it should change: ' . $from);

        return str_replace($from, $to, $source);
    }

    /**
     * Changes the first `$from` that comes after `$marker`: one job of a workflow, where the same line sits in several jobs.
     */
    public static function changeAfter(string $source, string $marker, string $from, string $to): string
    {
        $at = strpos($source, $marker);
        $in = $at === false ? false : strpos($source, $from, $at);

        throw_if($in === false, LogicException::class, 'The example does not hold the text it should change after ' . $marker . ': ' . $from);

        return substr($source, 0, $in) . $to . substr($source, $in + strlen($from));
    }

    /**
     * Changes a line of one job of a workflow, the job found by its key at the indentation of `jobs:`.
     */
    public static function inJob(string $workflow, string $job, string $from, string $to): string
    {
        return self::changeAfter($workflow, "\n  " . $job . ":\n", $from, $to);
    }

    public static function withoutJob(string $workflow, string $job): string
    {
        $at = strpos($workflow, "\n  " . $job . ":\n");

        throw_if($at === false, LogicException::class, 'The workflow has no job ' . $job);

        $next = preg_match('/\n  [a-z-]+:\n/', $workflow, $match, PREG_OFFSET_CAPTURE, $at + 3) === 1 ? $match[0][1] : strlen($workflow);

        return substr($workflow, 0, $at) . substr($workflow, $next);
    }

    /**
     * A value of the config block of scripts/kit-config.sh (`NAME="value"`).
     */
    public static function kitValue(string $kitConfig, string $name): string
    {
        throw_if(preg_match('/^' . preg_quote($name, '/') . '="([^"]*)"/m', $kitConfig, $match) !== 1, LogicException::class, 'kit-config.sh sets no ' . $name);

        return $match[1];
    }
}
