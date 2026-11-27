<?php

declare(strict_types=1);

namespace App\Modules\Accounts\Enums;

enum Permission: string
{
    case KEEP_EDITIONS = 'keep-editions';
    case MANAGE_ACCOUNT = 'manage-account';
    case SIGN_IN_WITH_GOOGLE = 'sign-in-with-google';
}
