<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Printopoly limits
|--------------------------------------------------------------------------
|
| Fixed limits against abuse (B70, B82). They are the same for everybody;
| there are no per-user settings.
|
*/

return [

    'limits' => [
        'photo_max_megabytes' => (int) env('PRINTOPOLY_MAX_PHOTO_MB', 25),
        'photo_max_megapixels' => (int) env('PRINTOPOLY_MAX_PHOTO_MEGAPIXELS', 60),
        'account_storage_megabytes' => (int) env('PRINTOPOLY_MAX_ACCOUNT_STORAGE_MB', 1024),
        'editions_per_account' => (int) env('PRINTOPOLY_MAX_EDITIONS_PER_ACCOUNT', 20),
        'print_jobs_per_user' => (int) env('PRINTOPOLY_MAX_PRINT_JOBS_PER_USER', 1),
    ],

    'print_files' => [
        'retention_days' => (int) env('PRINTOPOLY_PRINT_FILE_RETENTION_DAYS', 7),
    ],

];
