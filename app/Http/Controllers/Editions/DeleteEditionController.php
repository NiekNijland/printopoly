<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions;

use App\Actions\Editions\DeleteEdition;
use App\Http\Controllers\Controller;
use App\Models\Edition;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

final class DeleteEditionController extends Controller
{
    public function __invoke(Edition $edition, DeleteEdition $delete): Response
    {
        Gate::authorize('delete', $edition);

        $delete->handle($edition);

        return response()->noContent();
    }
}
