<?php

declare(strict_types=1);

namespace App\Print;

use App\Data\ChannelData;
use App\Models\PrintJob;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;

/**
 * The Reverb channel of a print job (B95). With an account it is private and
 * the channel callback in routes/channels.php checks ownership. Without one
 * there is no session to authorise, so the unguessable token in the name is
 * the secret, like in the download link. Events carry no file paths.
 */
final class PrintChannel
{
    public static function data(PrintJob $job): ChannelData
    {
        return $job->isAnonymous()
            ? new ChannelData('print-anon.' . $job->token, false)
            : new ChannelData('print-job.' . $job->token, true);
    }

    public static function channel(PrintJob $job): Channel
    {
        return $job->isAnonymous()
            ? new Channel('print-anon.' . $job->token)
            : new PrivateChannel('print-job.' . $job->token);
    }
}
