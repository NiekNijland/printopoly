<?php

declare(strict_types=1);

namespace App\Enums;

use App\Modules\Content\Enums\Locale;

/**
 * The two routes to paper (B71): the print shop and the home printer.
 */
enum PrintSet: string
{
    case Printer = 'printer';
    case Home = 'home';

    public function zipName(Locale $locale): string
    {
        return match ($locale) {
            Locale::Dutch => match ($this) {
                self::Printer => 'Drukkerij-set',
                self::Home => 'Thuisprint-set',
            },
            Locale::English => match ($this) {
                self::Printer => 'Print-shop-set',
                self::Home => 'Home-print-set',
            },
        };
    }
}
