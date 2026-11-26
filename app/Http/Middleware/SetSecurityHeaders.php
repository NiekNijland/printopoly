<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The security headers motormonitor sends, and a Content-Security-Policy in report-only form: the browser reports
 * what the policy would block and blocks nothing, so the policy can be tightened before it is enforced. It names
 * what the pages load: their own scripts, styles, fonts and pictures, photos as data and blob URLs, the WebAssembly
 * of the photo converter and its workers, the Reverb socket, Bugsnag and the beacon Cloudflare adds. During
 * development the Vite server joins the script, style and connect sources.
 */
final class SetSecurityHeaders
{
    /** @var array<string, list<string>> */
    private const array POLICY = [
        'default-src' => ["'self'"],
        'script-src' => ["'self'", "'wasm-unsafe-eval'", 'https://static.cloudflareinsights.com'],
        'style-src' => ["'self'", "'unsafe-inline'"],
        'img-src' => ["'self'", 'data:', 'blob:'],
        'font-src' => ["'self'", 'data:'],
        'connect-src' => ["'self'", 'wss:', 'https://notify.bugsnag.com', 'https://sessions.bugsnag.com', 'https://cloudflareinsights.com'],
        'worker-src' => ["'self'", 'blob:'],
        'manifest-src' => ["'self'"],
        'object-src' => ["'none'"],
        'base-uri' => ["'self'"],
        'form-action' => ["'self'"],
        'frame-ancestors' => ["'self'"],
    ];

    /**
     * @param Closure(Request): Response $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        $response->headers->set('Content-Security-Policy-Report-Only', self::policy($this->viteServer()));

        return $response;
    }

    public static function policy(?string $viteServer = null): string
    {
        $policy = self::POLICY;

        if ($viteServer !== null) {
            $policy['script-src'][] = $viteServer;
            $policy['style-src'][] = $viteServer;
            $policy['connect-src'][] = $viteServer;
            $policy['connect-src'][] = (string) preg_replace('#^http#', 'ws', $viteServer);
        }

        return implode('; ', array_map(static fn (string $directive, array $sources): string => $directive . ' ' . implode(' ', $sources), array_keys($policy), $policy));
    }

    /**
     * The origin of the Vite development server, from the file it writes while it runs.
     */
    private function viteServer(): ?string
    {
        $hot = public_path('hot');

        if (! is_file($hot)) {
            return null;
        }

        $url = mb_trim((string) file_get_contents($hot));

        return preg_match('#^https?://[^/\s]+#', $url, $origin) === 1 ? $origin[0] : null;
    }
}
