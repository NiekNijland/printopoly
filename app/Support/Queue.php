<?php

declare(strict_types=1);

namespace App\Support;

enum Queue: string
{
    case DEFAULT = 'default';
    case PDF = 'pdf';
}
