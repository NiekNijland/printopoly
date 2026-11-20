import { readPublicConfig } from './public-config';

function page(json: string | null): Document {
    const doc = document.implementation.createHTMLDocument('x');

    if (json !== null) {
        const script = doc.createElement('script');

        script.id = 'printopoly-config';
        script.type = 'application/json';
        script.textContent = json;
        doc.body.append(script);
    }

    return doc;
}

describe('public config', () => {
    it('reads what the server put in the page', () => {
        const config = readPublicConfig(
            page(
                '{"reverb":{"key":"pk","host":"printopoly.nl","port":443,"scheme":"https"},"bugsnag":{"apiKey":"b","releaseStage":"production"}}',
            ),
            {},
        );

        expect(config.reverb).toEqual({
            key: 'pk',
            host: 'printopoly.nl',
            port: 443,
            scheme: 'https',
        });
        expect(config.bugsnag).toEqual({
            apiKey: 'b',
            releaseStage: 'production',
        });
    });

    it('falls back to the build variables only where the page has nothing (development)', () => {
        const config = readPublicConfig(page(null), {
            VITE_REVERB_APP_KEY: 'dev',
            VITE_REVERB_PORT: '8083',
        });

        expect(config.reverb.key).toBe('dev');
        expect(config.reverb.port).toBe(8083);
        expect(config.bugsnag.apiKey).toBeNull();
    });

    it('survives broken JSON', () => {
        expect(readPublicConfig(page('{nope'), {}).reverb.key).toBeNull();
    });
});
