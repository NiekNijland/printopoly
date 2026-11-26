<?php

declare(strict_types=1);

namespace Tests\Concerns;

use Illuminate\Support\Facades\Storage;

trait UsesLocalBoxDisk
{
    protected function setUpUsesLocalBoxDisk(): void
    {
        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
    }
}
