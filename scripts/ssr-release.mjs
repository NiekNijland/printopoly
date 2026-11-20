import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** @returns {import('vite').Plugin} */
export function ssrRelease() {
    /** @type {string | null} */
    let release = null;
    let clientBuild = false;

    return {
        name: 'printopoly-ssr-release',
        config(config, { command, isSsrBuild }) {
            clientBuild = command === 'build' && !isSsrBuild;
            if (clientBuild) {
                release = randomUUID();
            } else if (command === 'build') {
                const artifactPath = path.resolve(
                    config.root ?? process.cwd(),
                    'public/build/ssr-release.json',
                );
                try {
                    const artifact = JSON.parse(
                        readFileSync(artifactPath, 'utf8'),
                    );
                    if (
                        typeof artifact?.id !== 'string' ||
                        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
                            artifact.id,
                        )
                    ) {
                        throw new Error('Invalid build identity');
                    }
                    release = artifact.id;
                } catch (cause) {
                    throw new Error(
                        'SSR release identity is missing or malformed; build the client before SSR.',
                        { cause },
                    );
                }
            }

            return { define: { __SSR_RELEASE_ID__: JSON.stringify(release) } };
        },
        generateBundle() {
            if (clientBuild) {
                this.emitFile({
                    type: 'asset',
                    fileName: 'ssr-release.json',
                    source: JSON.stringify({ id: release }),
                });
            }
        },
    };
}
