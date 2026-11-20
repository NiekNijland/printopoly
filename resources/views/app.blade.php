<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#F6F1E4">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Pages without SEO data (editor, editions, print, errors) stay out of search results. --}}
        @unless (isset($page['props']['seo']))
            <meta name="robots" content="noindex, nofollow">
        @endunless

        <link rel="icon" href="/favicon.ico" sizes="48x48">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <link rel="manifest" href="/site.webmanifest">

        {{-- Settings for the browser, read at runtime: the release is built without the production .env. --}}
        <script id="printopoly-config" type="application/json">{!! \App\Support\PublicConfig::toJson() !!}</script>

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Printopoly') }}</title>
        </x-inertia::head>
    </head>
    <body class="bg-paper font-sans text-ink antialiased">
        <x-inertia::app />
    </body>
</html>
