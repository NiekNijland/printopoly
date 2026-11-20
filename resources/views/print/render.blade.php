<!DOCTYPE html>
<html lang="{{ $locale }}">
    <head>
        <meta charset="utf-8">
        {{-- Only this app's own origin (assets and crops) may load, nothing else (B69). --}}
        <meta http-equiv="Content-Security-Policy" content="{{ $csp }}">
        <base href="{{ $base }}/">
        <title>Printopoly</title>
        <style>
            @page { size: {{ $width }}mm {{ $height }}mm; margin: 0; }
            html, body { margin: 0; padding: 0; background: #fff; }
        </style>
        <script nonce="{{ $nonce }}">window.__PRINT__ = {{ Js::from($payload) }};</script>
        @vite('resources/js/print.tsx')
    </head>
    <body data-part="{{ $payload['part'] }}" data-set="{{ $payload['set'] }}">
        <div id="print-root"></div>
    </body>
</html>
