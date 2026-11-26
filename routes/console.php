<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Every task runs on one server, and a run that never finished frees the next one after the minutes it names.

Schedule::command('horizon:snapshot')->everyFiveMinutes()->onOneServer()->withoutOverlapping(5);

// Print files and anonymous jobs go away after 7 days (B62, B80).
Schedule::command('printopoly:cleanup')->dailyAt('03:30')->onOneServer()->withoutOverlapping(60);

// Warn accounts that were not used for 23 months and delete them after 24 (B120).
Schedule::command('printopoly:inactive-accounts')->dailyAt('04:00')->onOneServer()->withoutOverlapping(60);

// Collection boxes of "Samen maken" go 30 days after their last activity (B123).
Schedule::command('printopoly:cleanup-boxes')->dailyAt('03:45')->onOneServer()->withoutOverlapping(60);
