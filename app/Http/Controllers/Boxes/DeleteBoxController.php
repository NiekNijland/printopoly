<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Boxes\BoxAccess;
use App\Boxes\BoxCleanup;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * The owner deletes the box with everything in it (B128), for good.
 */
final class DeleteBoxController extends Controller
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, BoxCleanup $cleanup): Response
    {
        $cleanup->deleteBox($access->owned($request, $boxId));

        return response()->noContent();
    }
}
