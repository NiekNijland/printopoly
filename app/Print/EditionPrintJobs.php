<?php

declare(strict_types=1);

namespace App\Print;

use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Content\Enums\Locale;
use Illuminate\Support\Str;

/**
 * One print job per stored edition of a user, so the PDFs that are made stay together (B95).
 * Creating the job makes nothing: PDFs are only made when the user clicks. The job keeps the language of the
 * site the user prints from, for the instructions and the file names (B184).
 */
final class EditionPrintJobs
{
    public function forEdition(User $user, Edition $edition, Locale $site): PrintJob
    {
        $job = PrintJob::query()
            ->where('user_id', $user->publicId())
            ->where('edition_id', $edition->edition_id)
            ->first();

        if ($job instanceof PrintJob) {
            if ($job->locale !== $site->value && ! $job->isBusy()) {
                $job->locale = $site->value;
                $job->save();
            }

            return $job;
        }

        $job = new PrintJob([
            'token' => Str::random(40),
            'user_id' => $user->publicId(),
            'edition_id' => $edition->edition_id,
            'edition' => null,
            'locale' => $site->value,
        ]);
        $job->save();

        return $job;
    }
}
