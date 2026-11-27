<?php

declare(strict_types=1);

namespace App\Http\Requests\Analytics;

use App\Modules\Analytics\Enums\FeatureEvent;
use Illuminate\Foundation\Http\FormRequest;

final class CountFeatureRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['event' => ['nullable']];
    }

    public function event(): ?FeatureEvent
    {
        $value = $this->safe()->input('event');
        $event = is_string($value) ? FeatureEvent::tryFrom($value) : null;

        return $event instanceof FeatureEvent && in_array($event, FeatureEvent::fromBrowser(), true) ? $event : null;
    }
}
