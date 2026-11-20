<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

Schedule::command('horizon:snapshot')->everyFiveMinutes();

// Print files and anonymous jobs go away after 7 days (B62, B80).
Schedule::command('printopoly:cleanup')->dailyAt('03:30');
