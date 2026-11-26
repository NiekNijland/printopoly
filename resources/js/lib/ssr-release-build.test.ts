import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { build, resolveConfig } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ssrRelease } from '../../../scripts/ssr-release.mjs';

const readArtifact = async (file: string): Promise<{ id: string }> => {
    const artifact: unknown = JSON.parse(await readFile(file, 'utf8'));
    if (
        typeof artifact !== 'object' ||
        artifact === null ||
        !('id' in artifact) ||
        typeof artifact.id !== 'string'
    ) {
        throw new Error(`${file} holds no release id`);
    }

    return { id: artifact.id };
};

describe('SSR release build identity', () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), 'printopoly-ssr-build-'));
        await writeFile(
            path.join(root, 'entry.js'),
            'export const release = __SSR_RELEASE_ID__;',
        );
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    const runBuild = (ssr: boolean) =>
        build({
            configFile: false,
            root,
            publicDir: false,
            logLevel: 'silent',
            plugins: [ssrRelease()],
            build: {
                ssr: ssr ? path.join(root, 'entry.js') : false,
                outDir: ssr ? 'ssr' : 'public/build',
                rollupOptions: { input: path.join(root, 'entry.js') },
            },
        });

    it('generates a client identity and embeds that exact identity into an immutable SSR bundle', async () => {
        await runBuild(false);
        const artifactPath = path.join(root, 'public/build/ssr-release.json');
        const artifact = await readArtifact(artifactPath);
        expect(artifact.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        await runBuild(true);
        const bundlePath = path.join(root, 'ssr/entry.mjs');
        const bundle = await readFile(bundlePath, 'utf8');
        expect(bundle).toContain(artifact.id);
        expect(bundle).not.toContain('__SSR_RELEASE_ID__');

        await runBuild(false);
        const next = await readArtifact(artifactPath);
        expect(next.id).not.toBe(artifact.id);
        expect(await readFile(bundlePath, 'utf8')).toBe(bundle);
        await runBuild(true);
        expect(await readFile(bundlePath, 'utf8')).toContain(next.id);
    });

    it.each([null, '{', '{}', '{"id":42}', '{"id":"not-a-release"}'])(
        'refuses to build SSR without a valid client artifact: %s',
        async (artifact) => {
            if (artifact !== null) {
                await mkdir(path.join(root, 'public/build'), {
                    recursive: true,
                });
                await writeFile(
                    path.join(root, 'public/build/ssr-release.json'),
                    artifact,
                );
            }
            await expect(runBuild(true)).rejects.toThrow(/SSR release/);
        },
    );

    it('does not require a build artifact for hot development', async () => {
        const config = await resolveConfig(
            { configFile: false, root, plugins: [ssrRelease()] },
            'serve',
        );
        expect(config.define?.__SSR_RELEASE_ID__).toBe('null');
    });
});
