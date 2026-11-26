<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Enums;

enum BoxCapability: string
{
    case LINK = 'box-link';
    case OWNER = 'box-owner';
    case SHARE_IMAGE = 'share-image';
}
