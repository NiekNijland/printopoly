import type { Edition } from '@/lib/render/edition-types';
import { sampleEdition } from '@/testing/editions';

import { createAccountActions } from './account-actions';

const fakeStore = (remote: Edition | undefined) => {
    const store = {
        get: vi.fn(() => Promise.resolve(remote)),
        rename: vi.fn(() =>
            Promise.resolve({ ok: true as const, revision: 2, updatedAt: 1 }),
        ),
        importEditions: vi.fn(() =>
            Promise.resolve({
                imported: [],
                conflicts: [],
                overLimit: [],
                invalid: {},
            }),
        ),
        delete: vi.fn(() => Promise.resolve()),
    };

    return {
        store,
        actions: createAccountActions(store as never),
    };
};

describe('account actions of Mijn edities', () => {
    it('renames against the revision the account has now', async () => {
        const { store, actions } = fakeStore({
            ...sampleEdition(),
            revision: 7,
        });

        await actions.rename('e1', 'Nieuw');

        expect(store.rename).toHaveBeenCalledWith('e1', 'Nieuw', 7);
    });

    it('leaves an edition alone that the account does not have', async () => {
        const { store, actions } = fakeStore(undefined);

        await actions.rename('e1', 'Nieuw');
        await actions.copy('e1', sampleEdition());

        expect(store.rename).not.toHaveBeenCalled();
        expect(store.importEditions).not.toHaveBeenCalled();
    });

    it('puts the copy of an edition from the account in the account', async () => {
        const { store, actions } = fakeStore(sampleEdition());
        const copy = { ...sampleEdition(), id: 'copy-id-1' };

        await actions.copy('e1', copy);

        expect(store.importEditions).toHaveBeenCalledWith([copy]);
    });

    it('deletes in the account', async () => {
        const { store, actions } = fakeStore(undefined);

        await actions.remove('e1');

        expect(store.delete).toHaveBeenCalledWith('e1');
    });
});
