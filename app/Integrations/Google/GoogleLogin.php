<?php

declare(strict_types=1);

namespace App\Integrations\Google;

use Illuminate\Support\Facades\Config;

/**
 * Logging in is optional (B78). Without Google credentials the app still boots
 * and works; the login button and routes simply stay unavailable.
 */
final class GoogleLogin
{
    public static function isConfigured(): bool
    {
        $google = Config::array('services.google');
        $clientId = $google['client_id'] ?? null;
        $clientSecret = $google['client_secret'] ?? null;

        return is_string($clientId) && $clientId !== ''
            && is_string($clientSecret) && $clientSecret !== '';
    }
}
