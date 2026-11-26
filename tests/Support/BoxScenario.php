<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Assert;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

final class BoxScenario
{
    /**
     * @param array<string, mixed> $overrides
     * @return array{id: string, url: string, ownerSecret: string, token: string}
     */
    public static function makeBox(TestCase $test, array $overrides = []): array
    {
        $response = $test->postJson('/api/boxes', [
            'editionId' => 'edition-0001',
            'editionName' => 'Zaterdagclub',
            'language' => 'nl',
            'snapshot' => ['theme' => 'classic', 'currency' => 'eur', 'elements' => ['space.01' => ['name' => 'Molenweg'], 'card.chance.01' => ['text' => 'Ga naar start'], 'space.02' => ['photo' => ['photoId' => 'x']]]],
            ...$overrides,
        ]);
        $response->assertCreated();

        $url = $response->json('url');
        Assert::assertIsString($url);

        return [
            'id' => self::text($response, 'id'),
            'url' => $url,
            'ownerSecret' => self::text($response, 'ownerSecret'),
            'token' => basename($url),
        ];
    }

    /**
     * @param TestResponse<Response> $response
     */
    public static function text(TestResponse $response, string $path): string
    {
        $value = $response->json($path);
        Assert::assertIsString($value);

        return $value;
    }

    /**
     * @param array<string, mixed> $fields
     * @return TestResponse<Response>
     */
    public static function contribute(TestCase $test, string $token, array $fields = []): TestResponse
    {
        return $test->post('/api/box/' . $token . '/contributions', [
            'elementKey' => 'space.01',
            'firstName' => 'Sanne',
            'value' => 'Kerkstraat',
            ...$fields,
        ], ['Accept' => 'application/json']);
    }

    /**
     * @param array<string, mixed> $fields
     * @return TestResponse<Response>
     */
    public static function contributeFrom(TestCase $test, int $friend, string $token, array $fields = []): TestResponse
    {
        $test->withServerVariables(['REMOTE_ADDR' => '10.0.0.' . $friend]);

        return self::contribute($test, $token, $fields);
    }

    public static function photo(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('vakantie.jpg', TestImages::jpeg(800, 600));
    }

    /**
     * @return array<string, string>
     */
    public static function owner(string $secret): array
    {
        return ['X-Box-Owner' => $secret];
    }
}
