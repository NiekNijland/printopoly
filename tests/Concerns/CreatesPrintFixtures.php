<?php

declare(strict_types=1);

namespace Tests\Concerns;

use Tests\Support\PrintScenario;

trait CreatesPrintFixtures
{
    protected function setUpCreatesPrintFixtures(): void
    {
        PrintScenario::fakeChrome();
    }
}
