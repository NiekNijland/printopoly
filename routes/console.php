<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

Schedule::command('horizon:snapshot')->everyFiveMinutes();

// Print files and anonymous jobs go away after 7 days (B62, B80).
Schedule::command('printopoly:cleanup')->dailyAt('03:30');

// Warn accounts that were not used for 23 months and delete them after 24 (B120).
Schedule::command('printopoly:inactive-accounts')->dailyAt('04:00');
