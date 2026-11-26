<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\BoardProfileParser;
use App\Modules\Editions\Support\EditionSettingsParser;
use App\Modules\Editions\Support\StandardEdition;
use PHPUnit\Framework\TestCase;

final class EditionSettingsParserTest extends TestCase
{
    public function test_only_the_settings_that_are_there_come_back(): void
    {
        $errors = [];

        self::assertSame([], $this->parser()->parse(['elements' => [], 'other' => 1], $errors));
        self::assertSame(['name' => '', 'currency' => 'play', 'moneyAmount' => null], $this->parser()->parse(['name' => '', 'currency' => 'play', 'moneyAmount' => null], $errors));
        self::assertSame([], $errors);
    }

    public function test_the_parts_after_the_first_editions_default_to_off(): void
    {
        $errors = [];
        $parts = ['board' => true, 'deeds' => false, 'cards' => false, 'money' => false, 'pawns' => false, 'boxLid' => false, 'houseRules' => false];

        self::assertSame(['parts' => [...$parts, 'rulesBooklet' => false, 'invitation' => true]], $this->parser()->parse(['parts' => [...$parts, 'invitation' => true]], $errors));
        self::assertSame([], $errors);
    }

    public function test_a_wrong_setting_is_named_and_left_out(): void
    {
        $errors = [];

        self::assertSame(['theme' => 'riso'], $this->parser()->parse(['theme' => 'riso', 'currency' => 'EUR', 'printSelection' => ['set' => 'shop']], $errors));
        self::assertSame(['currency: unknown currency'], $errors);
    }

    private function parser(): EditionSettingsParser
    {
        return new EditionSettingsParser(StandardEdition::load(), new BoardProfileParser());
    }
}
