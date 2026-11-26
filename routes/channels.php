<?php

declare(strict_types=1);

use App\Models\PrintJob;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Gate;

// The status of a print job of a logged-in user (B69, B95). The policy decides;
// a job without an account has a public channel whose name is its secret token
// and needs no authorisation (see App\Modules\Print\Support\PrintChannel).
Broadcast::channel('print-job.{token}', static function (User $user, string $token): bool {
    $job = PrintJob::query()->where('token', $token)->first();

    return $job instanceof PrintJob && Gate::forUser($user)->allows('view', $job);
});
