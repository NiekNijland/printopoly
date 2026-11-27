<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Contact;

use Illuminate\Support\Facades\Config;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Contact, with the address for reports of anything that is not allowed
 * (a hosting service needs one under the DSA, B67).
 */
final readonly class ShowController
{
    public function __invoke(): Response
    {
        return Inertia::render('contact', [
            'contactEmail' => Config::string('printopoly.contact_email'),
        ]);
    }
}
