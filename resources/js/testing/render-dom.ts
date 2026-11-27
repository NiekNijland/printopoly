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
