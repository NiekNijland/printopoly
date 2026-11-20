<?php

declare(strict_types=1);

// Package defaults are merged in by the service provider. Bugsnag only sends
// events when BUGSNAG_API_KEY is set and the release stage is listed below.
// Edition content never goes to Bugsnag (B68).
return [

    'logger_notify_level' => env('BUGSNAG_LOGGER_LEVEL', 'error'),

    'notify_release_stages' => array_values(array_filter(array_map(
        trim(...),
        explode(',', (string) env('BUGSNAG_NOTIFY_RELEASE_STAGES', 'production')),
    ), static fn (string $stage): bool => $stage !== '')),

    'redacted_keys' => array_values(array_filter(array_map(
        trim(...),
        explode(',', (string) env(
            'BUGSNAG_REDACTED_KEYS',
            '_token,token,access_token,id_token,refresh_token,client_secret,code,state,password',
        )),
    ), static fn (string $key): bool => $key !== '')),

];
