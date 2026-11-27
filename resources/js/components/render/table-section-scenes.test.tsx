import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    BoardScene,
    CardsScene,
    LidArt,
    MoneyScene,
    PawnsScene,
    ProofScene,
    ShareScene,
    TroubleScene,
} from './table-section-scenes';

describe('the still lifes of the print guide', () => {
    it('lays something on the table for every part', () => {
        for (const scene of [
            <ProofScene key="proof" />,
            <BoardScene key="board" />,
            <CardsScene key="cards" />,
            <MoneyScene key="money" />,
            <PawnsScene key="pawns" />,
            <ShareScene key="share" />,
            <TroubleScene key="trouble" />,
        ]) {
            expect(render(scene).container.childElementCount).toBeGreaterThan(
                0,
            );
        }
    });

    it('draws the box lid of the sample edition', () => {
        const { container } = render(<LidArt />);

        expect(
            container.querySelector('[data-element="box-lid"]'),
        ).not.toBeNull();
    });
});
