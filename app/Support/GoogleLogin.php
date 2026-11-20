<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Logging in is optional (B78). Without Google credentials the app still boots
 * and works; the login button and routes simply stay unavailable.
 */
final class GoogleLogin
{
    public static function isConfigured(): bool
    {
        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');

        return is_string($clientId) && $clientId !== ''
            && is_string($clientSecret) && $clientSecret !== '';
    }
}
