import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSyncExternalStore } from 'react';

import { EditionSession } from '@/features/edition/session';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition } from '@/lib/render/edition-types';
import { spaceAt } from '@/lib/render/standard-edition';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { AmountInput, changedAmounts, SpaceAmounts } from './amount-fields';

const Harness = ({
    session,
    position,
    problems,
}: {
    session: EditionSession;
    position: number;
    problems?: Record<string, string>;
}) => {
    const edition = useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.edition,
    );

    return (
        <SpaceAmounts
            session={session}
            edition={edition}
            resolved={resolveEdition(edition)}
            space={spaceAt(position)}
            problems={problems}
        />
    );
};

const mount = (
    position: number,
    edition: Edition = makeEdition(),
    problems?: Record<string, string>,
) => {
    const session = new EditionSession(edition, {
        storage: new MemoryEditionStorage(),
        bus: makeBus(null, 'w1'),
        now: () => 1_000,
        scheduler: new ManualScheduler(),
    });
    const view = renderWithI18n(
        <Harness session={session} position={position} problems={problems} />,
    );

    return { session, view };
};

const price = () => screen.getByRole('spinbutton', { name: 'Prijs' });

describe('SpaceAmounts', () => {
    it('shows the amounts of a street, with the rents folded away', async () => {
        const user = userEvent.setup();
        mount(1);

        expect(price()).toHaveValue(60);
        expect(
            screen.getByRole('spinbutton', { name: 'Hypotheek' }),
        ).toHaveValue(30);
        expect(screen.getByText('Huur, 6 regels')).toBeInTheDocument();
        expect(screen.queryByRole('spinbutton', { name: 'Huur' })).toBeNull();

        await user.click(screen.getByRole('button', { name: 'Tonen' }));

        expect(screen.getByRole('spinbutton', { name: 'Huur' })).toHaveValue(2);
        expect(
            screen.getByRole('spinbutton', { name: 'Huur met 1 huis' }),
        ).toHaveValue(10);
        expect(
            screen.getByRole('spinbutton', { name: 'Huur met 2 huizen' }),
        ).toHaveValue(30);
        expect(
            screen.getByRole('spinbutton', { name: 'Huur met hotel' }),
        ).toHaveValue(250);
        expect(
            screen.getByRole('button', { name: 'Verbergen' }),
        ).toBeInTheDocument();
    });

    it('steps an amount and puts it back to standard', async () => {
        const user = userEvent.setup();
        const { session } = mount(1);

        await user.click(screen.getByRole('button', { name: 'Prijs hoger' }));
        expect(session.edition.elements['space.01']?.amounts).toEqual({
            price: 61,
        });

        await user.click(
            screen.getByRole('button', { name: 'Prijs terug naar standaard' }),
        );
        expect(session.edition.elements['space.01']).toBeUndefined();
        expect(price()).toHaveValue(60);
    });

    it('sets a typed amount outside the range to the limit and says so', async () => {
        const user = userEvent.setup();
        const { session } = mount(1);

        await user.clear(price());
        await user.type(price(), '100{Enter}');

        expect(session.edition.elements['space.01']?.amounts).toEqual({
            price: 72,
        });
        expect(
            screen.getByText('Maximaal 72. Het bedrag staat nu op 72.'),
        ).toHaveAttribute('role', 'status');
    });

    it('says the lower limit too', async () => {
        const user = userEvent.setup();
        mount(1);

        await user.clear(price());
        await user.type(price(), '1');
        await user.tab();

        expect(
            screen.getByText('Minimaal 48. Het bedrag staat nu op 48.'),
        ).toHaveAttribute('role', 'status');
    });

    it('opens the rents when one is changed or has a problem', () => {
        const edition = makeEdition();
        edition.elements['space.01'] = { amounts: { 'rent.5': 260 } };
        mount(1, edition, { mortgage: 'Te laag.' });

        expect(
            screen.getByRole('spinbutton', { name: 'Huur met hotel' }),
        ).toHaveValue(260);
        expect(screen.getByRole('alert')).toHaveTextContent('Te laag.');
        expect(
            screen.getByRole('spinbutton', { name: 'Hypotheek' }),
        ).toHaveAttribute('aria-invalid', 'true');
    });

    it('names the rents of a station by the number of stations', async () => {
        const user = userEvent.setup();
        mount(5);

        expect(
            screen.getByText('Huur met 1 tot 4 stations'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Tonen' }));

        expect(
            screen.getByRole('spinbutton', { name: 'Huur met 2 stations' }),
        ).toBeInTheDocument();
    });

    it('shows the amount of a tax and the salary past Start', () => {
        const tax = mount(4);
        expect(
            screen.getByRole('spinbutton', { name: 'Bedrag' }),
        ).toBeInTheDocument();
        tax.view.unmount();

        mount(0);
        expect(
            screen.getByRole('spinbutton', { name: 'Salaris langs Start' }),
        ).toBeInTheDocument();
    });

    it('shows nothing for a space without amounts', () => {
        const { view } = mount(7);

        expect(view.container).toBeEmptyDOMElement();
    });
});

describe('AmountInput', () => {
    it('cannot change an amount whose range is one value', () => {
        renderWithI18n(
            <AmountInput
                id="extra"
                label="Bedrag"
                standard={undefined}
                range={{ min: 10, max: 10 }}
                value={10}
                onChange={vi.fn<(amount: number) => void>()}
                format={(amount) => `€ ${String(amount)}`}
            />,
        );

        expect(
            screen.getByRole('spinbutton', { name: 'Bedrag' }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Bedrag lager' }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Bedrag hoger' }),
        ).toBeDisabled();
        expect(
            screen.queryByRole('button', { name: /terug naar standaard/ }),
        ).toBeNull();
    });
});

describe('changedAmounts', () => {
    it('counts the amounts that differ from where the edition started', () => {
        const edition = makeEdition();
        edition.elements['space.01'] = { amounts: { price: 70, mortgage: 30 } };

        expect(changedAmounts(edition, spaceAt(1))).toBe(2);
        expect(changedAmounts(makeEdition(), spaceAt(1))).toBe(0);
    });
});
