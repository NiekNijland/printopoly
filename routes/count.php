<?php

declare(strict_types=1);

use App\Http\Controllers\Analytics\Feature\CountController;
use Illuminate\Support\Facades\Route;

// The anonymous feature counter (B206) runs outside the web group: no session, no cookies, no CSRF.
Route::post('api/count', CountController::class)
    ->middleware('throttle:feature-count')
    ->name('feature.count');
