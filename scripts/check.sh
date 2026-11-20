#!/usr/bin/env bash
# Runs every quality check in sequence and stops at the first failure: the
# same checks the GitHub Actions workflows run. Run it inside Sail, where PHP
# has ext-mongodb and MongoDB and Redis are reachable:
#
#   ./vendor/bin/sail composer check
#
# It checks; it does not fix. `composer codestyle`, `npm run format` and
# `npm run lint:fix` are the fixing counterparts.
set -euo pipefail

cd "$(dirname "$0")/.."

step() {
    printf '\n\033[1m[check] %s\033[0m\n' "$1"
}

step 'generate Wayfinder routes'
php artisan wayfinder:generate --with-form --no-interaction

step 'generated TypeScript types are up to date'
generated=resources/js/types/generated.ts
before="$(cat "$generated")"
php artisan typescript:transform --quiet
if [ "$before" != "$(cat "$generated")" ]; then
    echo "$generated changed: commit the regenerated file." >&2
    exit 1
fi

step 'Rector (dry run)'
vendor/bin/rector process --dry-run

step 'Pint (test)'
composer pint -- --test

step 'PHP syntax (parallel-lint)'
composer lint:syntax

step 'PHPStan (app and tests)'
composer analyse

step 'Composer audit'
composer security

step 'Prettier'
npm run format:check

step 'ESLint'
npm run lint

step 'TypeScript'
npm run types

step 'knip'
npm run knip

step 'Vitest'
npm run test

step 'PHPUnit (paratest)'
composer test

step 'Build, SSR build and SSR self-contained check'
npm run build:ssr
npm run ssr:check

printf '\n\033[1;32m[check] all checks passed\033[0m\n'
