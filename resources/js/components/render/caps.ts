import type { Theme } from '@/lib/render/themes';

/** Names on the board in capitals, as on the classic board; Strak keeps its quieter lower case. */
export function usesCaps(theme: Theme): boolean {
    return theme.id !== 'strak';
}
