<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class ValidationMessagesTest extends TestCase
{
    public function test_a_refused_field_is_explained_in_dutch(): void
    {
        $this->postJson(route('print-jobs.store'), [], ['Accept-Language' => 'nl'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['edition' => 'Het veld edition is verplicht.']);
    }

    public function test_every_dutch_validation_text_is_found_by_the_translator(): void
    {
        $messages = require lang_path('nl/validation.php');

        self::assertIsArray($messages);

        foreach (array_keys(array_diff_key($messages, ['custom' => true, 'attributes' => true])) as $rule) {
            self::assertNotSame('validation.' . $rule, __('validation.' . $rule, [], 'nl'));
        }
    }
}
