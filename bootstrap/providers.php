<?php

declare(strict_types=1);

use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;
use Bugsnag\BugsnagLaravel\BugsnagServiceProvider;

return [
    BugsnagServiceProvider::class,
    AppServiceProvider::class,
    HorizonServiceProvider::class,
];
