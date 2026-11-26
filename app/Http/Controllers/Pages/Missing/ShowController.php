<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pages\Missing;

use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class ShowController
{
    public function __invoke(): never
    {
        throw new NotFoundHttpException();
    }
}
