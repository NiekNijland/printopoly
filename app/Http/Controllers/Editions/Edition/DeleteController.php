<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Models\Edition;
use App\Modules\Editions\Actions\DeleteEdition;
use Illuminate\Http\Response;

final readonly class DeleteController
{
    public function __invoke(Edition $edition, DeleteEdition $delete): Response
    {
        $delete->handle($edition);

        return response()->noContent();
    }
}
