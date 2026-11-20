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

    // Where people reach the owner and where reports of anything that is not
    // allowed go (B67). The placeholder stays until Niek fills in the address.
    'contact_email' => env('PRINTOPOLY_CONTACT_EMAIL', 'hallo@printopoly.nl'),

    // What the browser needs at runtime. The release artifact is built without the production .env, so
    // nothing here may come from a VITE_ variable. Only public values: the Reverb app key is public by
    // design, the secret never appears (App\Support\PublicConfig).
    'public' => [
        'reverb' => [
            'key' => env('REVERB_APP_KEY'),
            'host' => env('REVERB_HOST'),
            'port' => env('REVERB_PORT'),
            'scheme' => env('REVERB_SCHEME'),
        ],
        'bugsnag' => [
            // The key of the browser project, which is not the one of the server.
            'apiKey' => env('BUGSNAG_BROWSER_API_KEY', env('VITE_BUGSNAG_API_KEY')),
            'releaseStage' => env('BUGSNAG_RELEASE_STAGE'),
        ],
    ],

    'limits' => [
        'photo_max_megabytes' => (int) env('PRINTOPOLY_MAX_PHOTO_MB', 25),
        'photo_max_megapixels' => (int) env('PRINTOPOLY_MAX_PHOTO_MEGAPIXELS', 60),
        'account_storage_megabytes' => (int) env('PRINTOPOLY_MAX_ACCOUNT_STORAGE_MB', 1024),
        'editions_per_account' => (int) env('PRINTOPOLY_MAX_EDITIONS_PER_ACCOUNT', 20),
        'print_jobs_per_user' => (int) env('PRINTOPOLY_MAX_PRINT_JOBS_PER_USER', 1),
        // Jobs without an account (B80): active jobs per IP address, photos per job, edition JSON size.
        'anonymous_jobs_per_ip' => (int) env('PRINTOPOLY_MAX_ANONYMOUS_JOBS_PER_IP', 3),
        'anonymous_photos_per_job' => (int) env('PRINTOPOLY_MAX_ANONYMOUS_PHOTOS_PER_JOB', 60),
        'edition_json_kilobytes' => (int) env('PRINTOPOLY_MAX_EDITION_JSON_KB', 2048),
    ],

    'print_files' => [
        'retention_days' => (int) env('PRINTOPOLY_PRINT_FILE_RETENTION_DAYS', 7),
    ],

    // Uploads, print sources, crops and PDFs. A disk name from config/filesystems.php:
    // local in development, R2 later (B68). Nothing on it is public: downloads go
    // through policies or temporary links.
    'storage' => [
        'disk' => env('PRINTOPOLY_DISK', 'local'),
    ],

    // Derived images (B61).
    'photos' => [
        'preview_edge' => 1600,
        'preview_quality' => 82,
        'print_edge' => 8000,
        'print_quality' => 90,
        'max_dpi' => 300,
    ],

    'print' => [
        // Part of the cache key (B62): a deploy with another renderer makes
        // saved PDFs outdated.
        // Empty means: derive it from the deployed frontend build (App\Print\PrintRelease). Set it
        // to pin the key, as the tests do.
        'release' => env('PRINTOPOLY_RELEASE'),
        // Where Chrome reaches this app while it renders (assets and crops are
        // fetched from here). Inside Sail the app listens on port 80.
        'render_base_url' => env('PRINTOPOLY_RENDER_BASE_URL', 'http://127.0.0.1'),
        'ready_timeout_ms' => (int) env('PRINTOPOLY_READY_TIMEOUT_MS', 120000),
        'bleed_mm' => 3.0,
        // PDF check (B12, B63).
        'size_tolerance_mm' => 0.2,
        // Pages are this much shorter than the sheet, so Chrome adds no blank page (B63).
        'page_height_shave_mm' => 0.05,
        // Same numbers as DEFAULT_BOARD_PROFILE in resources/js/lib/print/board.ts.
        'profile' => [
            'id' => 'modern-square',
            'outer' => 500.0,
            'corner' => 70.0,
            'box_lid' => ['w' => 267.0, 'h' => 267.0],
        ],
    ],

    // Accounts that are not used (B120): a warning mail after `warn_after_months`, deletion after
    // `delete_after_months` of inactivity and at least `grace_days` after the warning. The privacy
    // statement promises exactly this. Activity is written at most once per `activity_throttle_minutes`.
    'inactivity' => [
        'warn_after_months' => 23,
        'delete_after_months' => 24,
        'grace_days' => 30,
        'activity_throttle_minutes' => 60,
    ],

];
