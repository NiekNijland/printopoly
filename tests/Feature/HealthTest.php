<?php

declare(strict_types=1);

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class HealthTest extends TestCase
{
    #[Test]
    public function the_health_route_answers(): void
    {
        $this->get('/up')->assertOk();
    }
}
