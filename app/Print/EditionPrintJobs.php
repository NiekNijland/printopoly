<?php

declare(strict_types=1);

namespace App\Print;

use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * One print job per stored edition of a user, so the PDFs that are made stay together (B95).
 * Creating the job makes nothing: PDFs are only made when the user clicks.
 */
final class EditionPrintJobs
{
    public function forEdition(User $user, Edition $edition): PrintJob
    {
        $job = PrintJob::query()
            ->where('user_id', $user->publicId())
            ->where('edition_id', $edition->edition_id)
            ->first();

        if ($job instanceof PrintJob) {
            return $job;
        }

        $job = new PrintJob([
            'token' => Str::random(40),
            'user_id' => $user->publicId(),
            'edition_id' => $edition->edition_id,
            'edition' => null,
            'locale' => $edition->language,
        ]);
        $job->save();

        return $job;
    }
}
