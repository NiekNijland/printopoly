<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\GuideRuleExamples;
use Tests\Support\Architecture\GuideRulesGuard;
use Tests\Support\Architecture\GuideSetGuard;
use Tests\Support\SourceSandbox;

final class GuideRulesArchitectureTest extends TestCase
{
    private const array RULES = [
        'architecture-presets' => ['php', 'security'],
        'assertion-spelling' => ['this-assert', 'static-assert', 'assert-equals', 'no-op-assert'],
        'backend-patterns' => [],
        'banned-test-calls' => ['config-set', 'clock-set', 'wall-clock', 'container-binding', 'wait', 'stray-switch', 'network', 'fake-all', 'real-path', 'named-status', 'project-double'],
        'class-shape' => ['final-readonly', 'action-name', 'action-entry', 'enum-backing', 'enum-cases', 'enum-folder', 'data-name'],
        'closed-classes' => ['closed-concrete-parent', 'closed-stale-tag'],
        'controller-names' => ['controller-verb', 'controller-verb-used'],
        'file-size' => ['file-size'],
        'frontend' => ['settled-rules', 'type-escapes', 'size', 'one-way', 'file-names', 'page-props', 'doors', 'navigation', 'tests'],
        'guard-shape' => ['guard-test-parts', 'guard-literal-path', 'guard-name'],
        'guides' => ['documented-path', 'guard-list', 'one-pattern-guard', 'one-pattern-example', 'lands-with', 'rubric-table', 'guide-tense', 'guide-rules'],
        'hermetic-base' => ['missing', 'bypasses-base'],
        'layout' => ['layout-place', 'layout-name', 'one-module-per-domain'],
        'method-size' => ['method-size', 'controller-action-size'],
        'project-files' => ['phpunit-strict', 'local-stack', 'env-example'],
        'pure-layers' => ['pure-layers', 'data-factories'],
        'queries' => ['query-streams', 'query-per-pass', 'quota-slot'],
        'single-use-traits' => ['single-use-traits'],
        'test-classes' => ['extra-class', 'outside-support'],
        'test-declarations' => ['test-attribute', 'test-annotation', 'test-name', 'test-void', 'provider-annotation', 'group-annotation'],
        'test-fixtures' => ['fixture'],
        'test-helpers' => ['helper-function', 'helper-trait', 'helper-on-base'],
        'test-locations' => ['belongs-in', 'no-folder'],
        'test-reflection' => ['reflection'],
        'test-tiers' => ['boots'],
        'thin-controllers' => ['thin-controllers'],
        'translations' => ['translation-languages', 'translation-defined', 'translation-unused', 'translation-validation'],
    ];

    /**
     * @return iterable<string, array{list<string>, string, string}>
     */
    public static function rulesAndGuidesThatDisagree(): iterable
    {
        $guide = "Een job declareert `uniqueId()`. Eén sleutel per record.\n";

        yield 'a rule without a row' => [['unique-job-key', 'queue-name'], $guide, 'rule queue-name has no row'];
        yield 'a row without a rule' => [[], $guide, 'row unique-job-key has no rule in the guard'];
        yield 'words the guide lost' => [['unique-job-key'], "Een job declareert een sleutel.\n", 'the guides no longer say "een job declareert `uniqueId()"'];
        yield 'half of the words' => [['unique-job-key'], "Een job declareert `uniqueId()`.\n", 'the guides no longer say "één sleutel per record"'];
    }

    /**
     * @param list<string> $ruleIds
     */
    #[DataProvider('rulesAndGuidesThatDisagree')]
    public function test_it_fails_a_guide_that_lost_the_words_of_a_rule_and_a_rule_and_a_row_that_do_not_match(array $ruleIds, string $guide, string $reason): void
    {
        $violations = $this->violationsOf(GuideRuleExamples::ROWS, ['AGENTS.md' => $guide], $ruleIds);

        self::assertNotSame([], $violations);
        self::assertStringContainsString($reason, implode("\n", $violations));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function tablesThatAreNotOneRowPerRule(): iterable
    {
        yield 'a row inside a fenced block' => ["| Rule id | The guide must say | Instead |\n| --- | --- | --- |\n```\n| unique-job-key | `uniqueId()` | declareer uniqueId() |\n```\n", 'rule unique-job-key has no row'];
        yield 'a row inside an indented block' => ["| Rule id | The guide must say | Instead |\n| --- | --- | --- |\n\n    | unique-job-key | `uniqueId()` | declareer uniqueId() |\n", 'rule unique-job-key has no row'];
        yield 'a rule id that appears twice' => [GuideRuleExamples::ROWS . "| unique-job-key | `een sleutel` | declareer een sleutel |\n", 'row unique-job-key appears twice'];
        yield 'a row without words' => ["| Rule id | The guide must say | Instead |\n| --- | --- | --- |\n| unique-job-key | | declareer uniqueId() |\n", 'row unique-job-key names no words'];
        yield 'a rows file that is gone' => ['', 'does not exist'];
    }

    #[DataProvider('tablesThatAreNotOneRowPerRule')]
    public function test_it_reads_a_table_row_only_outside_a_code_block_and_only_once(string $rows, string $reason): void
    {
        $violations = $this->violationsOf($rows, ['AGENTS.md' => "Een job declareert `uniqueId()`. Eén sleutel per record.\n"], ['unique-job-key']);

        self::assertStringContainsString($reason, implode("\n", $violations));
    }

    public function test_it_accepts_words_spread_over_two_guides_other_spacing_and_case_and_an_escaped_bar(): void
    {
        $rows = GuideRuleExamples::ROWS . "| `bar-rule` | gescheiden door `\\|` | schrijf het teken |\nTekst, en | geen | rij | van vijf | cellen\n";
        $guides = [
            'AGENTS.md' => "EEN JOB declareert\n`uniqueId()`.\n",
            'docs/review-rubric.md' => "Hij houdt één   sleutel per\nrecord, gescheiden door `|`.\n",
        ];

        self::assertSame([], $this->violationsOf($rows, $guides, ['unique-job-key', 'bar-rule']));
    }

    public function test_it_keeps_the_words_of_every_rule_in_the_guides(): void
    {
        $root = dirname(__DIR__, 2);
        $guides = new GuideSetGuard($root, 'AGENTS.md', ['Guard', 'Rijen', 'Beslist'], 'docs/guards', ['app', 'resources', 'tests'], 'AGENTS.md', ['docs/review-rubric.md'], 'scripts/ci-ratchets.sh', 'guide-future-tense')->guides();
        $files = glob($root . '/docs/guards/*.md');
        $rowsFiles = array_map(static fn (string $file): string => basename($file, '.md'), $files === false ? [] : $files);
        $violations = [];

        self::assertSame(array_keys(self::RULES), $rowsFiles);

        foreach (self::RULES as $guard => $ruleIds) {
            $detector = new GuideRulesGuard($root . '/docs/guards/' . $guard . '.md', array_map(static fn (string $guide): string => $root . '/' . $guide, $guides), $ruleIds);
            $violations = [...$violations, ...$detector->violations()];
        }

        self::assertSame([], $violations);
    }

    /**
     * @param array<string, string> $guides
     * @param list<string> $ruleIds
     * @return list<string>
     */
    private function violationsOf(string $rows, array $guides, array $ruleIds): array
    {
        $root = SourceSandbox::create([...($rows === '' ? [] : ['docs/guards/rules.md' => $rows]), ...$guides]);

        try {
            return new GuideRulesGuard($root . '/docs/guards/rules.md', array_map(static fn (string $guide): string => $root . '/' . $guide, array_keys($guides)), $ruleIds)->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
