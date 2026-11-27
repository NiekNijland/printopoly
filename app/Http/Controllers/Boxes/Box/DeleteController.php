<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxCleanup;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * The owner deletes the box with everything in it (B128), for good.
 */
final readonly class DeleteController
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxCleanup $cleanup): Response
    {
        $cleanup->deleteBox($access->owned($request, $boxId));

        return response()->noContent();
    }
}
