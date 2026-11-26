<?php

declare(strict_types=1);

namespace Tests\Guards;

use LogicException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CiExamples;
use Tests\Support\Architecture\ComposerScripts;
use Tests\Support\Architecture\DatabaseEngine;
use Tests\Support\Architecture\GithubSmokeRules;
use Tests\Support\Architecture\GithubWorkflowGuard;
use Tests\Support\SourceSandbox;

/**
 * The contract test over the CI files, GitHub form (04-guards.md C4): the kit's workflow `.github/workflows/kit-checks.yml`, the
 * parts of `scripts/checks.sh`, DATABASE_IMAGE of `scripts/kit-config.sh` and the composer scripts the jobs run. The failing
 * examples are one-line edits of a copy of the real workflow; each must fail with a message that names the rule and the fix.
 * The checks script itself is read by CiScriptsArchitectureTest.
 */
final class CiContractArchitectureTest extends TestCase
{
    private const string KIT = 'kit-checks.yml';

    private const string CHECKOUT_SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';

    private const string MONGO_HEALTH = "--health-cmd \"mongosh --quiet --eval 'db.runCommand({ping: 1})'\"\n          ";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function narrowedWorkflows(): iterable
    {
        $kit = self::kitWorkflow();

        yield 'a manual trigger' => [CiExamples::change($kit, "on:\n", "on:\n  workflow_dispatch:\n"), 'the trigger `workflow_dispatch` is not one of'];
        yield 'a trigger that runs with secrets' => [CiExamples::change($kit, "on:\n", "on:\n  pull_request_target:\n"), 'pull_request_target is used'];
        yield 'a path filter on the pull request' => [CiExamples::change($kit, "  pull_request:\n", "  pull_request:\n    paths: ['app/**']\n"), 'pull_request has `paths`'];
        yield 'a branch filter, which a stacked pull request does not match' => [CiExamples::change($kit, "  pull_request:\n", "  pull_request:\n    branches: [main]\n"), 'pull_request has `branches`'];
        yield 'no re-run after a retarget' => [CiExamples::change($kit, ', edited]', ']'), 'pull_request.types lacks `edited`'];
        yield 'a deploying branch that is not listed' => [CiExamples::change($kit, "  push:\n    branches: [main]", "  push:\n    branches: [release]"), 'does not list the deploying branch main'];
        yield 'a path filter on the push' => [CiExamples::change($kit, "    branches: [main]\n", "    branches: [main]\n    paths-ignore: ['docs/**']\n"), 'push has a path filter'];
        yield 'a schedule trigger that is gone' => [CiExamples::change($kit, "  schedule:\n    - cron: '17 3 * * *'\n    - cron: '23 4 * * 0'\n", ''), 'the workflow has no `schedule` trigger'];
        yield 'a cron that is a placeholder' => [CiExamples::change($kit, "'17 3 * * *'", "'<cron expression>'"), 'still holds a placeholder'];
        yield 'a condition on the checks job' => [CiExamples::inJob($kit, 'checks', "if: github.event_name == 'pull_request'", "if: github.event_name == 'pull_request' && github.actor != 'dependabot[bot]'"), 'job `checks` has another condition'];
        yield 'a checks job that another job can skip' => [CiExamples::inJob($kit, 'checks', "    runs-on: ubuntu-24.04\n", "    needs: [smoke]\n    runs-on: ubuntu-24.04\n"), 'job `checks` waits for smoke'];
        yield 'a part without a matrix entry' => [CiExamples::inJob($kit, 'checks', 'part: [gate, static, guards, repo]', 'part: [gate, static, guards]'), 'the matrix of job `checks` is not exactly the parts'];
        yield 'a part dropped by an exclude' => [CiExamples::inJob($kit, 'checks', "        part: [gate, static, guards, repo]\n", "        part: [gate, static, guards, repo]\n        exclude:\n          - part: static\n"), 'has the key `exclude` besides `part`'];
        yield 'a matrix that is an expression' => [CiExamples::inJob($kit, 'checks', 'part: [gate, static, guards, repo]', "part: \${{ fromJSON('[\"gate\"]') }}"), 'the matrix of job `checks` is not exactly the parts'];
        yield 'a checks step that may fail' => [CiExamples::inJob($kit, 'checks', "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n", "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n        continue-on-error: true\n"), 'a step may fail'];
        yield 'a checks step with a base of its own' => [CiExamples::inJob($kit, 'checks', "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n", "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n        env:\n          CHECK_BASE: main\n"), 'sets CHECK_BASE in its own env'];
        yield 'a checks step under another shell' => [CiExamples::inJob($kit, 'checks', "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n", "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n        shell: sh\n"), 'sets `shell`'];
        yield 'a checks step with a condition' => [CiExamples::inJob($kit, 'checks', "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n", "      - run: bash scripts/checks.sh --part \${{ matrix.part }}\n        if: matrix.part != 'static'\n"), 'has a condition of its own'];
        yield 'a checks line that narrows' => [CiExamples::change($kit, 'bash scripts/checks.sh --part ${{ matrix.part }}', 'bash scripts/checks.sh --part static'), 'the checks of a pull request are missing'];
        yield 'a main-branch checks line that narrows' => [CiExamples::change($kit, 'bash scripts/checks.sh --main --part ${{ matrix.part }}', 'bash scripts/checks.sh --main --part gate'), 'the checks of a deploying branch are missing'];
        yield 'a command that succeeds anyway' => [CiExamples::inJob($kit, 'checks', 'npm ci --prefer-offline --no-audit --no-fund', 'npm ci --prefer-offline --no-audit --no-fund || true'), 'a check is made to succeed anyway'];
        yield 'a placeholder in a run line' => [CiExamples::inJob($kit, 'smoke', 'npm run ssr:check', '<check the server render>'), 'still holds a placeholder'];
        yield 'an install that does not come from the lock file' => [CiExamples::inJob($kit, 'frontend-tests', 'npm ci --prefer-offline --no-audit --no-fund', 'npm install'), 'does not come from the lock file'];
        yield 'a command that pushes' => [CiExamples::inJob($kit, 'smoke', 'npm run ssr:check', 'git push origin HEAD'), 'a command writes to the repository'];
        yield 'a lint run with a content cache' => [CiExamples::inJob($kit, 'frontend-tests', 'run: npm run test:coverage', 'run: npx eslint . --cache'), 'has a content cache'];
        yield 'an action on a tag' => [CiExamples::inJob($kit, 'frontend-tests', 'actions/checkout@' . self::CHECKOUT_SHA, 'actions/checkout@v7'), 'not pinned to a full commit sha'];
        yield 'a pin without its release' => [CiExamples::inJob($kit, 'frontend-tests', self::CHECKOUT_SHA . ' # v7.0.1', self::CHECKOUT_SHA), 'has no comment naming its release'];
        yield 'a reusable workflow on a branch' => [$kit . "  reuse:\n    uses: org/repo/.github/workflows/x.yml@main\n", 'calls the workflow'];
        yield 'a runner on a moving label' => [CiExamples::inJob($kit, 'checks-result', 'runs-on: ubuntu-24.04', 'runs-on: ubuntu-latest'), 'a moving label'];
        yield 'a container without a digest' => [CiExamples::inJob($kit, 'checks', "    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    container: php:8.5\n"), 'not pinned by digest'];
        yield 'a privileged container' => [CiExamples::inJob($kit, 'checks', "    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    container:\n      image: php@sha256:" . str_repeat('0', 64) . "\n      options: --privileged\n"), 'passes `--privileged` to its container'];
        yield 'a PHP that moves' => [CiExamples::inJob($kit, 'checks', "php-version: '8.5'", 'php-version: latest'), 'sets up PHP without an exact version'];
        yield 'a Node that moves' => [CiExamples::inJob($kit, 'checks', 'node-version-file: .nvmrc', "node-version: 'lts/*'"), 'sets up Node without a pinned version'];
        yield 'a job without a maximum time' => [CiExamples::inJob($kit, 'checks-result', "    timeout-minutes: 5\n", ''), 'has no integer timeout-minutes'];
        yield 'a maximum time that is the default of the host' => [CiExamples::inJob($kit, 'smoke', 'timeout-minutes: 20', 'timeout-minutes: 360'), 'above the 120 the guard allows'];
        yield 'a scheduled job beyond its own ceiling' => [CiExamples::inJob($kit, 'scheduled', 'timeout-minutes: 240', 'timeout-minutes: 300'), 'above the 240 the guard allows'];
        yield 'a job that may fail' => [CiExamples::inJob($kit, 'smoke', "    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    continue-on-error: true\n"), 'may fail or is switched off'];
        yield 'a shallow clone' => [CiExamples::inJob($kit, 'frontend-tests', 'fetch-depth: 0', 'fetch-depth: 1'), 'a shallow clone'];
        yield 'credentials that the checkout drops' => [CiExamples::inJob($kit, 'checks-main', 'fetch-depth: 0', "fetch-depth: 0\n          persist-credentials: false"), 'persist-credentials: false'];
        yield 'a head that the job does not check out' => [CiExamples::inJob($kit, 'checks', 'CHECK_BASE: ${{ github.base_ref }}', "CHECK_BASE: \${{ github.base_ref }}\n      CHECK_HEAD: \${{ github.event.pull_request.head.sha }}"), 'sets CHECK_HEAD but does not check out that revision'];
        yield 'no base for the ratchets' => [CiExamples::inJob($kit, 'checks', "    env:\n      CHECK_BASE: \${{ github.base_ref }}\n", ''), 'does not set CHECK_BASE'];
        yield 'a tool downloaded without its checksum' => [CiExamples::change($kit, "          echo \"\${GITLEAKS_SHA256}  gitleaks.tgz\" | sha256sum -c -\n", ''), 'checks no checksum'];
        yield 'a download piped into a shell' => [CiExamples::inJob($kit, 'smoke', 'npm run ssr:check', 'curl -sSfL https://example.test/install.sh | sh'), 'pipes a download into a shell'];
        yield 'a tool run without its version' => [CiExamples::change($kit, '@puppeteer/browsers@3.3.0', '@puppeteer/browsers'), 'with npx without an exact version'];
        yield 'a database of another major version' => [CiExamples::inJob($kit, 'backend-tests', 'image: mongo:8', 'image: mongo:7'), 'is not DATABASE_IMAGE'];
        yield 'a service without a health check' => [CiExamples::inJob($kit, 'smoke', self::MONGO_HEALTH, ''), 'has no `--health-cmd`'];
        yield 'a database with the health check of another engine' => [CiExamples::inJob($kit, 'smoke', "mongosh --quiet --eval 'db.runCommand({ping: 1})'", 'pg_isready -U postgres'), 'no health check of its engine (mongosh)'];
        yield 'a service on the runner without a port' => [CiExamples::inJob($kit, 'scheduled', "        ports:\n          - 27017:27017\n", ''), 'publishes no port'];
        yield 'a database the job does not reach' => [CiExamples::inJob($kit, 'backend-tests', 'MONGODB_URI: mongodb://127.0.0.1:27017', 'MONGODB_URI: mongodb://database:27017'), 'is not reached by its job'];
        yield 'a service on a moving image' => [CiExamples::inJob($kit, 'smoke', 'image: redis:alpine', 'image: redis'), 'has no tag or the moving tag'];
        yield 'a test run without its database service' => [CiExamples::inJob($kit, 'backend-tests', 'image: mongo:8', 'image: redis:alpine'), 'job `backend-tests` has no database service with the image `mongo:8`'];
        yield 'a smoke run without its browser case' => [CiExamples::inJob($kit, 'smoke', 'ChromeRenderTest', 'PrintPipelineTest'), '(the browser case)'];
        yield 'a smoke run that installs no browser' => [CiExamples::change($kit, 'chrome-headless-shell@131.0.6778.33', 'chrome@stable'), '(the browser install)'];
        yield 'a smoke run without the smoke suite' => [CiExamples::change($kit, 'vendor/bin/phpunit -c phpunit.smoke.xml', 'vendor/bin/phpunit --group smoke'), '(the smoke suite)'];
        yield 'a smoke run on the array cache' => [CiExamples::changeAfter($kit, 'Boot the stack', "          CACHE_STORE: redis\n", "          CACHE_STORE: array\n"), 'does not set CACHE_STORE: redis'];
        yield 'a smoke run on the sync queue' => [CiExamples::changeAfter($kit, 'Boot the stack', "          QUEUE_CONNECTION: redis\n", "          QUEUE_CONNECTION: sync\n"), 'does not set QUEUE_CONNECTION: redis'];
        yield 'a smoke run in the local environment' => [CiExamples::changeAfter($kit, 'Boot the stack', 'APP_ENV: staging', 'APP_ENV: local'), 'runs with APP_ENV `local`'];
        yield 'a smoke run that boots no stack' => [CiExamples::change($kit, 'php artisan serve --host=127.0.0.1 --port=8000', 'php -S 127.0.0.1:8000 -t public'), 'has no step that runs `php artisan serve`'];
        yield 'a scheduled job without the mutation run' => [CiExamples::change($kit, "      - name: Mutation testing of the whole tree (weekly, Sunday)\n        if: github.event.schedule == '23 4 * * 0'\n        run: bash scripts/mutation.sh\n", ''), 'does not run `bash scripts/mutation.sh`'];
        yield 'a mutation run held back by another condition' => [CiExamples::change($kit, "if: github.event.schedule == '23 4 * * 0'", "if: github.ref == 'refs/heads/never'"), 'the mutation step of job `scheduled` has the condition'];
        yield 'a mutation run on a cron the workflow does not have' => [CiExamples::change($kit, "if: github.event.schedule == '23 4 * * 0'", "if: github.event.schedule == '0 0 31 2 *'"), 'the mutation step of job `scheduled` has the condition'];
        yield 'the scheduled checks on another event' => [CiExamples::inJob($kit, 'scheduled', "if: github.event_name == 'schedule'", "if: github.event_name != 'push'"), 'runs the scheduled checks on another condition'];
        yield 'the scheduled checks narrowed' => [CiExamples::change($kit, 'run: bash scripts/checks.sh --scheduled', 'run: bash scripts/checks.sh --scheduled --quick'), 'no job runs exactly `bash scripts/checks.sh --scheduled`'];
        yield 'a deleted backend test job' => [CiExamples::withoutJob($kit, 'backend-tests'), 'no job `backend-tests`'];
        yield 'a deleted smoke job' => [CiExamples::withoutJob($kit, 'smoke'), 'no job `smoke`'];
        yield 'a deleted frontend test job' => [CiExamples::withoutJob($kit, 'frontend-tests'), 'no job `frontend-tests`'];
        yield 'a backend run that is not the suite' => [CiExamples::inJob($kit, 'backend-tests', 'run: composer test:unit', 'run: vendor/bin/phpunit --testsuite Unit'), 'does not run exactly `composer test:unit`'];
        yield 'a test job that skips the pull requests' => [CiExamples::inJob($kit, 'frontend-tests', "if: github.event_name != 'schedule'", "if: github.event_name == 'push'"), 'does not run on every pull request'];
        yield 'two jobs that report one check name' => [CiExamples::inJob($kit, 'smoke', "    timeout-minutes: 20\n", "    timeout-minutes: 20\n    name: backend-tests\n"), 'is the name of another job'];
        yield 'no concurrency group' => [CiExamples::change($kit, "concurrency:\n  group: kit-\${{ github.event_name }}-\${{ github.event.pull_request.number || github.sha }}\n  cancel-in-progress: \${{ github.event_name == 'pull_request' }}\n", ''), 'no concurrency group'];
        yield 'a group that every run shares' => [CiExamples::change($kit, 'group: kit-${{ github.event_name }}-${{ github.event.pull_request.number || github.sha }}', 'group: ci'), 'does not hold `github.event_name`'];
        yield 'a group that cancels a push to a deploying branch' => [CiExamples::change($kit, "cancel-in-progress: \${{ github.event_name == 'pull_request' }}", 'cancel-in-progress: true'), 'concurrency cancels runs of every event'];
        yield 'a token that writes' => [CiExamples::change($kit, "permissions:\n  contents: read\n\ndefaults", "permissions:\n  contents: write\n\ndefaults"), 'a permission is `write`'];
        yield 'no top-level permissions' => [CiExamples::change($kit, "permissions:\n  contents: read\n\ndefaults", 'defaults'), 'has no top-level `permissions`'];
        yield 'a default shell without pipefail' => [CiExamples::change($kit, "defaults:\n  run:\n    shell: bash\n", ''), 'does not set `defaults.run.shell: bash`'];
        yield "a secret in a job that runs the pull request's scripts" => [CiExamples::inJob($kit, 'checks', "      CHECK_BASE: \${{ github.base_ref }}\n", "      CHECK_BASE: \${{ github.base_ref }}\n      TOKEN: \${{ secrets.DEPLOY_KEY }}\n"), 'reads a secret'];
        yield 'an aggregate job that passes whatever happened' => [CiExamples::change($kit, 'run: test "$RESULT" = success', 'run: echo done'), 'no aggregate job'];
        yield 'an aggregate job that needs nothing' => [CiExamples::change($kit, 'needs: [checks]', 'needs: []'), 'must need exactly the checks job'];
        yield 'an aggregate job without always()' => [CiExamples::change($kit, "if: always() && github.event_name == 'pull_request'", "if: github.event_name == 'pull_request'"), 'must need exactly the checks job'];
        yield 'an aggregate job that reads another result' => [CiExamples::change($kit, 'needs.checks.result', 'needs.checks-main.result'), 'does not read RESULT'];
        yield 'the backend tests twice on one event' => [$kit . "  again:\n    if: github.event_name == 'pull_request'\n    runs-on: ubuntu-24.04\n    timeout-minutes: 5\n    steps:\n      - run: composer test:unit\n", 'the backend suite runs 2 times on one pull_request event'];
    }

    #[DataProvider('narrowedWorkflows')]
    public function test_it_detects_a_workflow_that_narrows_a_check_or_skips_a_run(string $workflow, string $reason): void
    {
        self::assertStringContainsString($reason, $this->violations([self::KIT => $workflow]));
    }

    public function test_it_reads_the_suite_count_across_workflow_files_and_their_triggers(): void
    {
        $legacy = "name: frontend\non:\n  pull_request:\n  push:\n    branches: [main]\njobs:\n  frontend:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run test\n";
        $called = CiExamples::change($legacy, "on:\n  pull_request:\n  push:\n    branches: [main]\n", "on:\n  workflow_call:\n");

        self::assertStringContainsString('the frontend suite runs 2 times on one pull_request event', $this->violations([self::KIT => self::kitWorkflow(), 'frontend.yml' => $legacy]));
        self::assertStringContainsString('the frontend suite runs 2 times on one push event', $this->violations([self::KIT => self::kitWorkflow(), 'frontend.yml' => $legacy]));
        self::assertSame('', $this->violations([self::KIT => self::kitWorkflow(), 'frontend.yml' => $called]));
    }

    public function test_it_holds_the_coverage_floor_in_the_composer_script_the_backend_job_runs(): void
    {
        $scripts = $this->composerScripts();
        $scripts['test:unit'] = array_values(array_filter($scripts['test:unit'] ?? [], static fn (string $command): bool => ! str_contains($command, '--coverage ')));

        self::assertStringContainsString('job `backend-tests` has no line `bash scripts/checks.sh --coverage <report>`', $this->violations([self::KIT => self::kitWorkflow()], scripts: $scripts));
        self::assertSame('', $this->violations([self::KIT => CiExamples::inJob(self::kitWorkflow(), 'backend-tests', 'run: composer test:unit', "run: |\n          composer test:unit\n          bash scripts/checks.sh --coverage coverage/clover.xml")], scripts: $scripts));
    }

    public function test_it_reads_the_parts_from_the_checks_script_so_a_part_added_there_and_left_out_of_the_matrix_fails(): void
    {
        $checks = CiExamples::change(self::file('scripts/checks.sh'), "    \"guards::Guard tests\"\n", "    \"guards::Guard tests\"\n    \"frontend::\"\n");

        self::assertStringContainsString('the matrix of job `checks` is not exactly the parts of PARTS (gate, static, guards, frontend, repo)', $this->violations([self::KIT => self::kitWorkflow()], $checks));
    }

    public function test_it_says_so_when_the_checks_script_holds_no_table_of_parts(): void
    {
        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('holds no PARTS=(');

        $this->violations([self::KIT => self::kitWorkflow()], CiExamples::change(self::file('scripts/checks.sh'), 'PARTS=(', 'NOTPARTS=('));
    }

    public function test_it_accepts_the_kit_workflow_its_near_misses_and_a_deploy_workflow_that_waits_for_it(): void
    {
        $kit = self::kitWorkflow();
        $deploy = "name: Deploy\non:\n  workflow_run:\n    workflows: [Kit checks]\n    types: [completed]\npermissions:\n  contents: read\njobs:\n  deploy:\n    if: github.event.workflow_run.conclusion == 'success'\n    runs-on: ubuntu-24.04\n    timeout-minutes: 10\n    steps:\n      - run: echo deploy\n";

        self::assertSame('', $this->violations([self::KIT => $kit]));
        self::assertSame('', $this->violations([self::KIT => $kit, 'deploy.yml' => $deploy]));
        // A probe of the job's own stack is no download; the mutation run may follow the daily cron as well.
        self::assertSame('', $this->violations([self::KIT => CiExamples::inJob($kit, 'smoke', 'npm run ssr:check', 'curl -sf http://localhost:8000/up')]));
        self::assertSame('', $this->violations([self::KIT => CiExamples::change($kit, "if: github.event.schedule == '23 4 * * 0'", "if: github.event.schedule == '17 3 * * *'")]));
        self::assertSame('', $this->violations([self::KIT => CiExamples::change($kit, "        if: github.event.schedule == '23 4 * * 0'\n", '')]));
        // A container job is still read by the kit's rules: pinned by digest, the database reached by its name.
        self::assertSame('', $this->violations([self::KIT => CiExamples::inJob($kit, 'checks', "    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    container:\n      image: php@sha256:" . str_repeat('0', 64) . "\n      options: --user root\n")]));
        self::assertStringContainsString('no workflow runs `bash scripts/checks.sh`', $this->violations(['deploy.yml' => $deploy]));
    }

    public function test_it_leaves_another_workflow_alone_unless_the_owner_names_it(): void
    {
        $risky = "name: Deploy\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo \${{ secrets.DEPLOY_KEY }}\n";
        $release = "name: Release\non:\n  workflow_run:\n    workflows: [Kit checks]\n    types: [completed]\njobs:\n  release:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.workflow_run.head_sha }}\n";
        $files = [self::KIT => self::kitWorkflow(), 'deploy.yml' => $risky, 'release.yml' => $release];

        self::assertSame('', $this->violations($files));
        self::assertStringContainsString('deploy.yml: job `deploy` has no integer timeout-minutes', $this->violations($files, hardened: ['deploy.yml']));
        self::assertStringContainsString('deploy.yml: job `deploy` runs on a moving label', $this->violations($files, hardened: ['deploy.yml']));
        self::assertStringContainsString('deploy.yml: `uses: actions/checkout@v4` has no comment naming its release', $this->violations($files, hardened: ['deploy.yml']));
        self::assertStringContainsString('release.yml: a workflow_run workflow checks out the code of the pull request', $this->violations($files, hardened: ['release.yml']));
    }

    public function test_it_reads_a_workflow_directory_under_a_dot_directory_and_says_when_a_file_is_missing(): void
    {
        $root = SourceSandbox::create([
            '.github/workflows/' . self::KIT => self::kitWorkflow(),
            'scripts/checks.sh' => self::file('scripts/checks.sh'),
            'composer.json' => self::file('composer.json'),
        ], '.checkout-');

        try {
            self::assertSame([], $this->guard($root)->violations());
            self::assertStringContainsString('does not exist: the parts of the checks step are read from it', implode("\n", $this->guard($root, checks: '/scripts/none.sh')->violations()));
            self::assertStringContainsString('no workflow under', implode("\n", $this->guard($root, workflows: '/.github/none')->violations()));
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_names_the_engine_of_a_database_image(): void
    {
        self::assertSame('mongodb', DatabaseEngine::of('mongo:8'));
        self::assertSame('postgres', DatabaseEngine::of('postgis/postgis:17-3.5'));
        self::assertSame('mariadb', DatabaseEngine::of('mariadb:11.4@sha256:abc'));
        self::assertSame('', DatabaseEngine::of('redis:alpine'));
        self::assertSame([], DatabaseEngine::passwordKeys('mongodb'));
    }

    /**
     * The real tree: every workflow of `.github/workflows` (the kit's file and the project's others, counted for point 19).
     */
    public function test_it_keeps_the_workflows_as_the_contract_says(): void
    {
        self::assertSame([], $this->guard(self::root())->violations());
    }

    /**
     * @param array<string, string> $files the workflow files by name
     * @param array<string, list<string>>|null $scripts the composer scripts; the real ones when null
     * @param list<string> $hardened
     */
    private function violations(array $files, ?string $checks = null, ?array $scripts = null, array $hardened = []): string
    {
        return implode("\n", $this->guard('', hardened: $hardened)->inWorkflows($files, $checks ?? self::file('scripts/checks.sh'), $scripts ?? $this->composerScripts()));
    }

    /**
     * @param list<string> $hardened
     */
    private function guard(string $root, string $workflows = '/.github/workflows', string $checks = '/scripts/checks.sh', array $hardened = []): GithubWorkflowGuard
    {
        return new GithubWorkflowGuard(
            $root . $workflows,
            $root . $checks,
            $root . '/composer.json',
            self::KIT,
            ['main'],
            'composer test:unit',
            suites: ['backend' => ['composer test:unit'], 'frontend' => ['npm run test:coverage', 'npm run test']],
            databaseImage: CiExamples::kitValue(self::file('scripts/kit-config.sh'), 'DATABASE_IMAGE'),
            smoke: new GithubSmokeRules(
                'php artisan serve',
                'vendor/bin/phpunit -c phpunit.smoke.xml',
                'chrome-headless-shell@',
                'ChromeRenderTest',
                ['CACHE_STORE' => 'redis', 'QUEUE_CONNECTION' => 'redis', 'SESSION_DRIVER' => 'redis'],
            ),
            hardenedWorkflows: $hardened,
            // The scheduled job runs the whole-tree mutation run weekly; every other job stays under 120 minutes.
            timeoutCeilings: ['scheduled' => 240],
        );
    }

    /**
     * @return array<string, list<string>>
     */
    private function composerScripts(): array
    {
        return ComposerScripts::of(self::file('composer.json'));
    }

    private static function kitWorkflow(): string
    {
        return self::file('.github/workflows/' . self::KIT);
    }

    private static function file(string $path): string
    {
        return (string) file_get_contents(self::root() . '/' . $path);
    }

    private static function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
