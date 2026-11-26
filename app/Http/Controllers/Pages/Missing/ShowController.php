<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Missing;

use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * An unknown URL: the 404 page of the language in the path (B66).
 */
final readonly class ShowController
{
    public function __invoke(): never
    {
        throw new NotFoundHttpException();
    }
}
