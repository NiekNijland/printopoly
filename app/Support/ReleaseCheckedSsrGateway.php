<?php

declare(strict_types=1);

namespace App\Support;

use Exception;
use Illuminate\Http\Client\StrayRequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Inertia\Ssr\HttpGateway;
use Inertia\Ssr\Response;
use Inertia\Ssr\SsrException;
use JsonException;
use Override;

/**
 * Inertia's HTTP gateway, plus the build identity check of the SSR bundle
 * contract (B66, the same idea as motormonitor's gateway).
 *
 * The client build writes public/build/ssr-release.json and the SSR bundle
 * embeds the same id and returns it with every render. During a deploy an
 * older SSR worker can still answer; its HTML belongs to other assets than
 * the ones this release serves, so such an answer is dropped and the page
 * falls back to a client-only root.
 */
class ReleaseCheckedSsrGateway extends HttpGateway
{
    private const string RELEASE_PATTERN = '/\A[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/';

    /**
     * @param array<string, mixed> $page
     */
    #[Override]
    public function dispatch(array $page, ?Request $request = null): ?Response
    {
        if (! $this->ssrIsEnabled($request ?? request())) {
            return null;
        }

        $isHot = Vite::isRunningHot();

        if (! $isHot && $this->shouldEnsureBundleExists() && ! $this->bundleExists()) {
            return null;
        }

        $release = $isHot ? null : $this->releaseId();

        if (! $isHot && $release === null) {
            return null;
        }

        $url = $isHot
            ? $this->getHotUrl('/__inertia_ssr')
            : $this->getProductionUrl('/render');

        try {
            $response = $this->pendingRequest()->post($url, $page);

            if ($response->failed()) {
                $error = $response->json();

                $this->handleSsrFailure($page, is_array($error) ? array_filter($error, is_string(...), ARRAY_FILTER_USE_KEY) : null);

                return null;
            }

            $data = $response->json();

            if (! is_array($data) || $data === []) {
                return null;
            }

            if (! $isHot && ($data['release'] ?? null) !== $release) {
                return null;
            }

            $head = $data['head'] ?? [];
            $body = $data['body'] ?? '';

            return new Response(
                implode("\n", array_filter(is_array($head) ? $head : [], is_string(...))),
                is_string($body) ? $body : '',
            );
        } catch (Exception $exception) {
            if ($exception instanceof StrayRequestException || $exception instanceof SsrException) {
                throw $exception;
            }

            $this->handleSsrFailure($page, [
                'error' => $exception->getMessage(),
                'type' => 'connection',
            ]);

            return null;
        }
    }

    private function releaseId(): ?string
    {
        $path = public_path('build/ssr-release.json');

        if (! is_file($path) || ! is_readable($path)) {
            return null;
        }

        try {
            $artifact = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        $id = is_array($artifact) ? ($artifact['id'] ?? null) : null;

        return is_string($id) && preg_match(self::RELEASE_PATTERN, $id) === 1 ? $id : null;
    }
}
