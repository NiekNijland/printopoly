import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { CenterRow, SpaceRow } from './board-list-rows';

const session = () =>
    new EditionSession(sampleEdition(), {
        storage: new MemoryEditionStorage(),
        bus: new EditionBus(null, 'w'),
        now: () => 5,
    });

const row = (key: string, onSelect = vi.fn<(key: string) => void>()) => {
    renderWithI18n(
        <ul>
            <SpaceRow
                elementKey={key}
                edition={{
                    ...sampleEdition(),
                    elements: { [key]: { icon: { preset: 'whistle' } } },
                }}
                interfaceLanguage="nl"
                session={session()}
                selected
                warned
                onSelect={onSelect}
                onFocusRow={() => undefined}
                onAnnounce={() => undefined}
                photos={undefined}
                onSwapPhoto={undefined}
                photoDrag={null}
                setPhotoDrag={() => undefined}
            />
        </ul>,
    );

    return onSelect;
};

describe('SpaceRow', () => {
    it('gives a space with a name of its own a name field', () => {
        row('space.01');

        expect(
            screen.getByRole('textbox', { name: 'Naam van Molenweg' }),
        ).toHaveValue('Molenweg');
    });

    it('shows a space without a name of its own as a button that opens it, with its marks', async () => {
        const user = userEvent.setup();
        const onSelect = row('space.02');
        const button = screen.getByRole('button', { name: /Algemeen Fonds/ });

        expect(button).toHaveAttribute('aria-current', 'true');
        expect(screen.getByLabelText('aangepast')).toBeInTheDocument();
        expect(
            screen.getByLabelText('heeft een waarschuwing'),
        ).toBeInTheDocument();
        await user.click(button);
        expect(onSelect).toHaveBeenCalledWith('space.02');
    });
});

describe('CenterRow', () => {
    it('names the centre with its hint and opens it', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn<() => void>();
        renderWithI18n(
            <ul>
                <CenterRow
                    edition={sampleEdition()}
                    interfaceLanguage="nl"
                    selected={false}
                    warned
                    onSelect={onSelect}
                />
            </ul>,
        );

        await user.click(
            screen.getByRole('button', { name: /Naam, foto of logo/ }),
        );
        expect(onSelect).toHaveBeenCalledOnce();
        expect(
            screen.getByLabelText('heeft een waarschuwing'),
        ).toBeInTheDocument();
    });
});
