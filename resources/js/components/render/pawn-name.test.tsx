import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NameDecor } from './pawn-name';

describe('NameDecor', () => {
    it('adds flourishes, a bar or confetti round the name per style', () => {
        const slot = (look: 'vintage' | 'modern' | 'playful', name: string) =>
            render(<NameDecor look={look} seed={5} />).container.querySelector(
                `[data-slot="${name}"]`,
            );

        expect(slot('vintage', 'flourish')).not.toBeNull();
        expect(slot('modern', 'name-bar')).not.toBeNull();
        expect(slot('playful', 'confetti')).not.toBeNull();
    });

    it('adds nothing in the theme look', () => {
        const { container } = render(<NameDecor look={undefined} seed={5} />);

        expect(container.innerHTML).toBe('');
    });
});
