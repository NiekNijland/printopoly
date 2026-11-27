/** The outer element of what was just rendered. */
export const root = (container: HTMLElement): HTMLElement => {
    const element = container.firstElementChild;

    if (!(element instanceof HTMLElement)) {
        throw new Error('Nothing rendered');
    }

    return element;
};

/** How the browser normalises a colour, so tests can compare with what is in the style. */
export const css = (color: string): string => {
    const probe = document.createElement('div');

    probe.style.background = color;

    return probe.style.background;
};

export const mmSize = (element: HTMLElement) => [
    element.style.width,
    element.style.height,
];

export const openSides = (space: HTMLElement): string[] => {
    const drawn = [...space.querySelectorAll('[data-frame] line')].map(
        (line): string => {
            const [, , w = 0, h = 0] = (
                line.closest('svg')?.getAttribute('viewBox') ?? ''
            )
                .split(' ')
                .map(Number);

            if (line.getAttribute('y1') === line.getAttribute('y2')) {
                return Number(line.getAttribute('y1')) < h / 2
                    ? 'top'
                    : 'bottom';
            }

            return Number(line.getAttribute('x1')) < w / 2 ? 'left' : 'right';
        },
    );

    return drawn.length === 0
        ? []
        : ['top', 'right', 'bottom', 'left'].filter(
              (side) => !drawn.includes(side),
          );
};
