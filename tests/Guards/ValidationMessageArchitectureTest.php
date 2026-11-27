<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ValidationMessageGuard;
use Tests\Support\SourceSandbox;

final class ValidationMessageArchitectureTest extends TestCase
{
    private const string REQUEST = "<?php\nnamespace App\\Http\\Requests;\nuse Illuminate\\Validation\\Rule;\nfinal class ExampleRequest\n{\n    public function rules(): array\n    {\n        return [\n";

    private const string END = "        ];\n    }\n}\n";

    private const array MESSAGES = ['required' => 'Het veld :attribute is verplicht.', 'string' => 'Het veld :attribute moet tekst zijn.'];

    /**
     * @return iterable<string, array{string, array<string, mixed>, string}>
     */
    public static function rulesWithoutText(): iterable
    {
        yield 'a rule in a list' => [self::REQUEST . "            'name' => ['required', 'boolean'],\n" . self::END, self::MESSAGES, 'the validation rule `boolean` has no text'];
        yield 'a rule in a string with bars' => [self::REQUEST . "            'name' => 'required|string|integer',\n" . self::END, self::MESSAGES, 'the validation rule `integer` has no text'];
        yield 'a rule with a parameter' => [self::REQUEST . "            'name' => ['required', 'max:80'],\n" . self::END, self::MESSAGES, 'the validation rule `max` has no text'];
        yield 'a rule with a parameter from config' => [self::REQUEST . "            'name' => ['string', 'size:' . config('a.b')],\n" . self::END, self::MESSAGES, 'the validation rule `size` has no text'];
        yield 'a rule object of the factory' => [self::REQUEST . "            'set' => ['required', Rule::enum(Set::class)],\n" . self::END, self::MESSAGES, 'the validation rule `enum` has no text'];
        yield 'a rule object with a name of two words' => [self::REQUEST . "            'set' => [Rule::notIn(['a'])],\n" . self::END, self::MESSAGES, 'the validation rule `not_in` has no text'];
        yield 'a rule in camel case' => [self::REQUEST . "            'name' => ['requiredIf:other,1'],\n" . self::END, self::MESSAGES, 'the validation rule `required_if` has no text'];
        yield 'a rule with an empty text' => [self::REQUEST . "            'name' => ['required'],\n" . self::END, ['required' => ' '], 'the validation rule `required` has no text'];
        yield 'a rule with a text per type that has an empty one' => [self::REQUEST . "            'name' => ['min:1'],\n" . self::END, ['min' => ['string' => 'Te kort.', 'array' => '']], 'the validation rule `min` has no text'];
        yield 'a static list of rules' => ["<?php\nnamespace App\\Support;\nfinal class ChoiceInput\n{\n    public static function rules(string \$prefix = ''): array\n    {\n        return [\$prefix . 'part' => ['sometimes', 'boolean']];\n    }\n}\n", self::MESSAGES, 'app/Example.php: the validation rule `boolean` has no text'];
    }

    /**
     * @param array<string, mixed> $messages
     */
    #[DataProvider('rulesWithoutText')]
    public function test_it_detects_a_validation_rule_without_a_text_in_the_default_language(string $source, array $messages, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->guard('')->inSources(['app/Example.php' => $source], $messages)));
    }

    public function test_it_accepts_rules_with_texts_and_reads_no_field_name_argument_or_other_method(): void
    {
        $source = self::REQUEST . "            'boolean' => ['bail', 'nullable', 'required', Rule::in(['integer', 'array'])],\n            'ref' => ['string', 'regex:/^(a|integer)\$/'],\n            ...Other::rules(),\n" . self::END . "\nfinal class Other\n{\n    public function attributes(): array\n    {\n        return ['name' => 'integer'];\n    }\n}\n";
        $messages = [...self::MESSAGES, 'in' => 'Ongeldig.', 'regex' => 'Ongeldig.', 'max' => ['string' => 'Te lang.']];

        self::assertSame([], $this->guard('')->inSources(['app/Example.php' => $source, 'app/Max.php' => self::REQUEST . "            'name' => 'max:3',\n" . self::END], $messages));
    }

    public function test_it_reads_a_tree_under_a_dot_directory_and_says_when_the_texts_are_missing(): void
    {
        $root = SourceSandbox::create([
            'app/Http/Requests/ExampleRequest.php' => self::REQUEST . "            'name' => ['required', 'string', 'email'],\n" . self::END,
            'lang/nl/validation.php' => "<?php\n\nreturn " . var_export(self::MESSAGES, true) . ";\n",
        ], '.checkout-');

        try {
            self::assertSame(['app/Http/Requests/ExampleRequest.php: the validation rule `email` has no text in lang/nl/validation.php: a visitor sees the key validation.email. Add the text'], $this->guard($root)->violations());
            self::assertStringContainsString('the file lang/en/validation.php does not exist', implode("\n", new ValidationMessageGuard($root, ['app'], 'lang/en/validation.php')->violations()));
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_keeps_a_dutch_text_for_every_validation_rule_the_application_uses(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): ValidationMessageGuard
    {
        return new ValidationMessageGuard($root, ['app'], 'lang/nl/validation.php');
    }
}
