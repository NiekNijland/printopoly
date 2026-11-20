<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * Contact, with the address for reports of anything that is not allowed
 * (a hosting service needs one under the DSA, B67).
 */
final class ShowContactController extends Controller
{
    public function __invoke(): Response
    {
        $address = config('printopoly.contact_email');

        return Inertia::render('contact', [
            'contactEmail' => is_string($address) ? $address : '',
        ]);
    }
}
