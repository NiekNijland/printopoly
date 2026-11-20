import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// The release artifact excludes node_modules by design, so the SSR bundle has to
// carry its own dependencies. When it does not, the SSR worker dies with
// ERR_MODULE_NOT_FOUND after the next deploy and every page silently drops to
// client rendering. That happened to motormonitor on 2026-09-18, on the host
// Printopoly shares; this check is copied from there.
//
// Parsing the bundle for bare imports is unreliable against generated code, so
// this boots the real thing from a directory that has no node_modules anywhere
// above it, which is exactly the condition on the host.

const SSR_DIRECTORY = 'bootstrap/ssr';
const PORT = Number(process.env.VITE_INERTIA_SSR_PORT) || 13714;
const BOOT_TIMEOUT_MS = 30_000;

const fail = (message) => {
    console.error(message);
    process.exit(1);
};

const isUp = async () => {
    try {
        const response = await fetch(`http://127.0.0.1:${PORT}/health`);

        return response.ok;
    } catch {
        return false;
    }
};

if (await isUp()) {
    fail(
        `Port ${PORT} already serves an SSR process, so this check cannot tell which\n` +
            'bundle answered. Stop it (php artisan inertia:stop-ssr) and run this again.',
    );
}

const workspace = await mkdtemp(path.join(tmpdir(), 'ssr-self-contained-'));
let child;

try {
    await cp(SSR_DIRECTORY, path.join(workspace, 'ssr'), {
        recursive: true,
    }).catch(() => {
        fail(
            `${SSR_DIRECTORY} is missing. Run "npm run build:ssr" before this check.`,
        );
    });
    // `type: module` lives here, and the artifact ships package.json too.
    await cp('package.json', path.join(workspace, 'package.json'));

    child = spawn(process.execPath, ['ssr/ssr.js'], {
        cwd: workspace,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));

    let exited = null;
    child.on('exit', (code) => (exited = code ?? 0));

    const deadline = Date.now() + BOOT_TIMEOUT_MS;
    let healthy = false;

    while (Date.now() < deadline) {
        if (exited !== null) {
            break;
        }

        if (await isUp()) {
            healthy = true;
            break;
        }

        await delay(250);
    }

    if (!healthy) {
        const reason = output.includes('ERR_MODULE_NOT_FOUND')
            ? 'The bundle imports packages it does not contain, so it cannot run without node_modules.'
            : `The SSR process did not answer on port ${PORT} within ${BOOT_TIMEOUT_MS / 1000}s.`;

        fail(
            [
                'SSR bundle is NOT self-contained.',
                '',
                reason,
                '',
                'The release artifact ships without node_modules, so SSR would stop after',
                'the next deploy. Keep `ssr: { noExternal: true }` in vite.config.ts.',
                '',
                '--- SSR process output ---',
                output.trim() || '(no output)',
            ].join('\n'),
        );
    }

    console.log(
        `SSR bundle is self-contained: booted and answered on port ${PORT} with no node_modules present.`,
    );
} finally {
    child?.kill('SIGTERM');
    await rm(workspace, { recursive: true, force: true });
}
