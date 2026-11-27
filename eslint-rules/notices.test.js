import { downloadsPlugin } from './downloads.js';
import { navigationPlugin } from './navigation.js';
import { inSource, tester } from './rule-tester.js';
import { toastsPlugin } from './toasts.js';
import { visitsPlugin } from './visits.js';

const filename = inSource('features/edition/sync.ts');
const cases = (valid, invalid, messageId) => ({
    valid: valid.map((code) => ({ code, filename })),
    invalid: invalid.map((code) => ({
        code,
        filename,
        errors: [{ messageId }],
    })),
});

tester.run(
    'toasts/no-success-toast',
    toastsPlugin.rules['no-success-toast'],
    cases(
        [
            "toast.error('Kapot');",
            "toast({ title: 'Let op', variant: 'destructive' });",
        ],
        ["toast.success('Opgeslagen');", "toast({ variant: 'success' });"],
        'success',
    ),
);

tester.run(
    'visits/no-visit-state',
    visitsPlugin.rules['no-visit-state'],
    cases(
        [
            'router.visit(url, { onStart: () => setStep(2) });',
            'router.visit(url, { onSuccess: () => setOpen(false) });',
        ],
        [
            'router.visit(url, { onStart: () => setBusy(true) });',
            'router.visit(url, { onFinish: () => { setBusy(false); } });',
        ],
        'state',
    ),
);

tester.run(
    'downloads/no-download-link',
    downloadsPlugin.rules['no-download-link'],
    cases(
        ["document.createElement('div');", 'const name = file.download;'],
        ["document.createElement('a');", "link.download = 'set.pdf';"],
        'link',
    ),
);

const write = [{ messageId: 'write' }];

tester.run(
    'navigation/no-location-write',
    navigationPlugin.rules['no-location-write'],
    {
        valid: [
            { code: 'const here = window.location.href;', filename },
            { code: "router.visit('/edities');", filename },
            {
                code: 'window.location.assign(url);',
                filename: inSource('lib/full-page-navigation.ts'),
            },
        ],
        invalid: [
            "window.location.href = '/edities';",
            "location.href = '/edities';",
            "window.location = '/edities';",
            "document.location = '/edities';",
            'location.assign(url);',
            'window.location.replace(url);',
            'globalThis.location.reload();',
        ].map((code) => ({ code, filename, errors: write })),
    },
);
