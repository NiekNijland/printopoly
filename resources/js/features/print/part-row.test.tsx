import { fireEvent, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { makeEdition } from '@/testing/edition-test-utils';
import { partRow } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

import { PartRow } from './part-row';

type Props = ComponentProps<typeof PartRow>;

const props: Props = {
    set: 'printer',
    part: 'cards',
    row: undefined,
    included: true,
    disabled: false,
    cards: 60,
    edition: makeEdition(),
    onToggle: () => undefined,
    onMake: () => undefined,
};

const draw = (overrides: Partial<Props> = {}) => {
    renderWithI18n(
        <ul>
            <PartRow {...props} {...overrides} />
        </ul>,
        'en',
    );

    return document.getElementById(`part-${overrides.part ?? props.part}`);
};

const tick = () =>
    screen.getByRole('checkbox', { name: 'Cards and deeds in your set' });

describe('PartRow', () => {
    it('shows the name, what to order and the spec counted from the cards', () => {
        draw();

        expect(screen.getByText('Cards and deeds')).toBeInTheDocument();
        expect(screen.getByText(/Order as a card set/)).toBeInTheDocument();
        expect(
            screen.getByText(
                '60 cards · 63 × 88 mm · 3 mm bleed and crop marks',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('not made yet')).toBeInTheDocument();
    });

    it('uses its own order and spec lines and a note when given', () => {
        draw({ order: 'Own order', spec: 'Own spec', note: 'With a card' });

        expect(screen.getByText('Own order')).toBeInTheDocument();
        expect(screen.getByText('Own spec')).toBeInTheDocument();
        expect(screen.getByText('With a card')).toBeInTheDocument();
        expect(screen.queryByText(/Order as a card set/)).toBeNull();
    });

    it('ticks the part in or out of the set', () => {
        const onToggle = vi.fn();
        draw({ onToggle });

        expect(tick()).toBeChecked();
        fireEvent.click(tick());
        expect(onToggle).toHaveBeenCalledOnce();
    });

    it('locks the board in the set and says why', () => {
        draw({ part: 'board', locked: true });
        const box = screen.getByRole('checkbox', { name: 'Board in your set' });

        expect(box).toBeDisabled();
        expect(box).toBeChecked();
        expect(box).toHaveAccessibleDescription('always in the set');
    });

    it('shows a part out of the set as skipped, without its choice', () => {
        const row = draw({
            included: false,
            queued: true,
            children: <span>A choice</span>,
        });

        expect(tick()).not.toBeChecked();
        expect(screen.getByText('not in your set')).toBeInTheDocument();
        expect(screen.queryByText('A choice')).toBeNull();
        expect(row?.className).toContain('bg-paper');
    });

    it('shows the choice of a part in the set', () => {
        draw({ children: <span>A choice</span> });

        expect(screen.getByText('A choice')).toBeInTheDocument();
    });

    it.each(['idle', 'outdated', 'failed'] as const)(
        'shows a queued %s part as waiting in line',
        (status) => {
            draw({ queued: true, row: partRow('printer', 'cards', status) });

            expect(
                screen.getByText('waiting for the one before'),
            ).toBeInTheDocument();
            expect(screen.queryByText(/Something went wrong/)).toBeNull();
        },
    );

    it('keeps a queued part that is being made as being made', () => {
        draw({ queued: true, row: partRow('printer', 'cards', 'running') });

        expect(screen.getByText('being made')).toBeInTheDocument();
    });

    it.each([
        ['timeout', /took too long/],
        ['photos', /photos are missing/],
        ['nonsense', /send us a message/],
        [null, /send us a message/],
    ])('explains a failure with reason %s', (reason, text) => {
        draw({ row: partRow('printer', 'cards', 'failed', { reason }) });

        expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('marks the row the editor asked for', () => {
        expect(draw({ asked: true })).toHaveAttribute('data-asked', 'true');
    });

    it('does not mark a row nobody asked for', () => {
        expect(draw()).not.toHaveAttribute('data-asked');
    });

    it('shows the test sheet with its own title and order line, without a tick', () => {
        const row = draw({
            part: 'calibration',
            included: null,
            variant: 'trial',
            set: 'home',
        });

        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(
            within(row ?? document.body).getByText('Try first: test sheet'),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/If it fits, print the rest/),
        ).toBeInTheDocument();
        expect(
            screen.getByText('A4 · ruler, bank card and corner space'),
        ).toBeInTheDocument();
    });

    it('tells the printer set to order after the test sheet', () => {
        draw({ part: 'calibration', included: null, variant: 'trial' });

        expect(screen.getByText(/If it fits, order\./)).toBeInTheDocument();
    });
});
