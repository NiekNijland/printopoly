import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FriendBox } from '@/features/edition/boxes/types';
import { formOf, requestOf, stubFetch } from '@/testing/fetch';
import { renderWithI18n } from '@/testing/render';

import { FriendForm } from './friend-form';
import { readSent } from './local';
import { editionFromSnapshot } from './snapshot';

const prepare = vi.hoisted(() => ({ friendPhoto: vi.fn() }));

vi.mock('./friend-photo', () => ({
    prepareFriendPhoto: prepare.friendPhoto,
}));

const box: FriendBox = {
    token: 't'.repeat(40),
    editionName: 'Zaterdagclub',
    language: 'nl',
    status: 'open',
    snapshot: {
        theme: 'classic',
        currency: 'eur',
        parts: { cards: true, pawns: false },
        elements: { 'space.02': { name: 'Molenweg' } },
    },
    limits: { name: 40, text: 200, firstName: 30, photoMegabytes: 1 },
};

const edition = editionFromSnapshot(box.snapshot, {
    name: 'Zaterdagclub',
    language: 'nl',
});

const sent = () =>
    stubFetch(() =>
        Promise.resolve(
            new Response(JSON.stringify({ id: 'c1', receipt: 'r1' }), {
                status: 201,
            }),
        ),
    );

const form = (
    elementKey: string,
    extra: { firstName?: string; onSent?: () => void } = {},
) =>
    renderWithI18n(
        <FriendForm
            box={box}
            edition={edition}
            locale="nl"
            elementKey={elementKey}
            firstName={extra.firstName ?? 'Sanne'}
            current="Molenweg"
            onSent={extra.onSent ?? vi.fn()}
        />,
    );

describe('FriendForm', () => {
    beforeEach(() => {
        window.localStorage.clear();
        prepare.friendPhoto.mockReset();
    });

    it('names the element and what it is called now, with a name field for a space', () => {
        form('space.02');

        expect(
            screen.getByRole('heading', { name: 'Molenweg' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Nu: Molenweg')).toBeInTheDocument();
        expect(screen.getByLabelText('Naam voorstellen')).toHaveAttribute(
            'maxLength',
            '40',
        );
        expect(screen.getByText('0 van 40 tekens')).toBeInTheDocument();
        expect(
            screen.queryByRole('group', { name: 'Bedrag voorstellen' }),
        ).not.toBeInTheDocument();
    });

    it('asks for a first name and for something to add before sending', async () => {
        const user = userEvent.setup();
        const fetchMock = sent();
        const { unmount } = form('space.02', { firstName: ' ' });

        await user.click(screen.getByRole('button', { name: 'Versturen' }));
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Vul je voornaam in.',
        );
        unmount();

        form('space.02');
        await user.click(screen.getByRole('button', { name: 'Versturen' }));
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Voeg een foto of een voorstel toe.',
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends a name, remembers it as sent and empties the field', async () => {
        const user = userEvent.setup();
        const onSent = vi.fn();
        const fetchMock = sent();
        form('space.02', { onSent });

        await user.type(screen.getByLabelText('Naam voorstellen'), 'Kerkpad');
        expect(screen.getByText('7 van 40 tekens')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
        const body = formOf(requestOf(fetchMock).init);
        expect(body.get('value')).toBe('Kerkpad');
        expect(body.get('firstName')).toBe('Sanne');
        expect(body.get('website')).toBe('');
        expect(readSent(box.token)[0]).toMatchObject({
            receipt: 'r1',
            elementKey: 'space.02',
            value: 'Kerkpad',
            hasPhoto: false,
        });
        expect(screen.getByLabelText('Naam voorstellen')).toHaveValue('');
    });

    it('proposes an amount in the direction of a card, and refuses one out of range', async () => {
        const user = userEvent.setup();
        const fetchMock = sent();
        form('card.chance.12');

        expect(screen.getByText('Betaal')).toBeInTheDocument();
        const amount = screen.getByRole('spinbutton', {
            name: 'Bedrag voorstellen',
        });
        await user.type(amount, '99');
        expect(amount).toHaveAttribute('aria-invalid', 'true');
        await user.click(screen.getByRole('button', { name: 'Versturen' }));
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Dit bedrag past niet bij deze kaart.',
        );

        await user.clear(amount);
        await user.type(amount, '14');
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(formOf(requestOf(fetchMock).init).get('amount')).toBe('-14');
        expect(readSent(box.token)[0]?.value).toMatch(/14/);
    });

    it('lets a new card choose to pay or receive, with a text field', async () => {
        const user = userEvent.setup();
        const fetchMock = sent();
        form('newcard.chest');

        expect(
            screen.getByRole('heading', { name: /Nieuwe kaart voor/ }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: 'Ontvang' }));
        expect(screen.getByRole('radio', { name: 'Ontvang' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        await user.type(
            screen.getByRole('spinbutton', { name: 'Bedrag voorstellen' }),
            '300',
        );
        await user.type(
            screen.getByLabelText('Tekst voorstellen'),
            'Je wint de loterij',
        );
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(formOf(requestOf(fetchMock).init).get('amount')).toBe('300');
    });

    it('shows what the server said when sending fails', async () => {
        const user = userEvent.setup();
        stubFetch(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({ errors: { value: ['Geen links.'] } }),
                    { status: 422 },
                ),
            ),
        );
        form('space.02');

        await user.type(screen.getByLabelText('Naam voorstellen'), 'x');
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Geen links.',
        );
    });

    it('takes a photo that fits, refuses one that is too large, and removes it', async () => {
        const user = userEvent.setup();
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
        vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
        prepare.friendPhoto
            .mockResolvedValueOnce({
                ok: true,
                upload: new Blob([new Uint8Array(2 * 1024 * 1024)]),
                preview: new Blob(['p']),
                width: 800,
                height: 600,
            })
            .mockResolvedValueOnce({ ok: false, message: 'Geen foto.' })
            .mockResolvedValueOnce({
                ok: true,
                upload: new Blob(['u']),
                preview: new Blob(['p']),
                width: 800,
                height: 600,
            });
        const { container } = form('space.02');
        const input = container.querySelector('input[type="file"]');
        expect(input).toBeInstanceOf(HTMLInputElement);
        const choose = (name: string) =>
            user.upload(
                container.querySelector<HTMLInputElement>(
                    'input[type="file"]',
                ) ?? document.createElement('input'),
                new File(['x'], name, { type: 'image/jpeg' }),
            );

        await choose('groot.jpg');
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Deze foto is groter dan 1 MB.',
        );
        await choose('kapot.jpg');
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Geen foto.',
        );
        await choose('goed.jpg');
        expect(
            await screen.findByRole('button', { name: 'Andere foto' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Je gekozen foto')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Foto weghalen' }));
        expect(
            screen.getByRole('button', { name: 'Kies een foto' }),
        ).toBeInTheDocument();
    });
});
