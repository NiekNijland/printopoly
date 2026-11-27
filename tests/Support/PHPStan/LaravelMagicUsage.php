<?php

declare(strict_types=1);

namespace Tests\Support\PHPStan;

use Override;
use ReflectionMethod;
use ReflectionProperty;
use ShipMonk\PHPStan\DeadCode\Provider\ReflectionBasedMemberUsageProvider;
use ShipMonk\PHPStan\DeadCode\Provider\VirtualUsageData;
use Spatie\LaravelData\Data;

/**
 * Tells the dead-code detector about methods Laravel calls by name.
 * Extend it when a new kind of magic call turns up.
 */
final class LaravelMagicUsage extends ReflectionBasedMemberUsageProvider
{
    #[Override]
    protected function shouldMarkMethodAsUsed(ReflectionMethod $method): ?VirtualUsageData
    {
        $name = $method->getName();
        $file = (string) $method->getFileName();

        // The container builds services and queued jobs, and dispatch() builds events and jobs.
        if ($name === '__construct' && str_contains($file, '/app/') && ! str_contains($file, '/app/Models/')) {
            return VirtualUsageData::withNote('Built by the container or by dispatch().');
        }

        if (str_contains($file, '/tests/Concerns/') && preg_match('/^(setUp|tearDown)[A-Z]/', $name) === 1) {
            return VirtualUsageData::withNote('Laravel runs test trait hooks by name.');
        }

        return null;
    }

    #[Override]
    protected function shouldMarkPropertyAsRead(ReflectionProperty $property): ?VirtualUsageData
    {
        if ($property->isPublic() && $property->getDeclaringClass()->isSubclassOf(Data::class)) {
            return VirtualUsageData::withNote('A Data object is read when it is serialized to JSON or to Inertia props.');
        }

        return null;
    }
}
