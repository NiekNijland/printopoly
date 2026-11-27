<?php

declare(strict_types=1);

namespace App\Modules\Print\Enums;

use App\Modules\Content\Enums\Locale;

/**
 * The two routes to paper (B71): the print shop and the home printer.
 */
enum PrintSet: string
{
    case PRINTER = 'printer';
    case HOME = 'home';

    public function zipName(Locale $locale): string
    {
        return match ($locale) {
            Locale::DUTCH => match ($this) {
                self::PRINTER => 'Drukkerij-set',
                self::HOME => 'Thuisprint-set',
            },
            Locale::ENGLISH => match ($this) {
                self::PRINTER => 'Print-shop-set',
                self::HOME => 'Home-print-set',
            },
        };
    }
}
