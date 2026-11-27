import { makeEdition } from '@/testing/edition-test-utils';
import { requestsOf, stubFetch } from '@/testing/fetch';
import { visit } from '@/testing/inertia';
import { fakePrintServices, printJob } from '@/testing/print-job';

import { uploadFirstJob } from './upload-first-job';

const choice = { skipped: [], copies: 2 };

describe('uploadFirstJob', () => {
    it('does nothing without an edition in this browser', async () => {
        const fetchMock = stubFetch();

        expect(
            await uploadFirstJob({
                services: fakePrintServices(),
                locale: 'nl',
                forSet: 'home',
                chosen: ['board'],
                choice,
                onProgress: vi.fn(),
            }),
        ).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uploads the edition, keeps the job, starts the run and opens its page (B80)', async () => {
        const edition = makeEdition({ id: 'e1' });
        const services = fakePrintServices({
            loadUpload: () =>
                Promise.resolve({
                    edition,
                    photos: {},
                    targets: { printer: {}, home: {} },
                    locale: 'nl',
                }),
        });
        const fetchMock = stubFetch((url) =>
            url.endsWith('/generate')
                ? new Response(JSON.stringify(printJob([]).status), {
                      status: 200,
                  })
                : new Response(
                      JSON.stringify({
                          token: 'k',
                          url: '/nl/print/k',
                          statusUrl: '/api/print/k/status',
                      }),
                      { status: 201 },
                  ),
        );
        const onProgress = vi.fn();

        expect(
            await uploadFirstJob({
                services,
                locale: 'nl',
                forSet: 'home',
                chosen: ['board'],
                choice,
                onProgress,
            }),
        ).toBe(true);
        expect(services.rememberJob).toHaveBeenCalledWith(edition, 'k');
        expect(onProgress).toHaveBeenLastCalledWith(null);
        expect(requestsOf(fetchMock).map(({ url }) => url)).toHaveLength(2);
        expect(visit).toHaveBeenCalledWith('/nl/print/k?set=home');
    });
});
