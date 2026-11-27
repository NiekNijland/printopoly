export const fakeCanvasContext = (context: object): (() => void) => {
    const prototype = HTMLCanvasElement.prototype;
    const original = Object.getOwnPropertyDescriptor(prototype, 'getContext');
    Object.defineProperty(prototype, 'getContext', {
        configurable: true,
        value: () => context,
    });

    return () => {
        if (original !== undefined) {
            Object.defineProperty(prototype, 'getContext', original);
        }
    };
};
