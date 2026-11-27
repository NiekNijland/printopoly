// The one door to window and document events: each helper returns the function that removes what it added.
export const listenToWindow = <K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
): (() => void) => {
    window.addEventListener(type, listener, options);

    return () => window.removeEventListener(type, listener, options);
};

export const listenToDocument = <K extends keyof DocumentEventMap>(
    type: K,
    listener: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions,
    target: Document = document,
): (() => void) => {
    target.addEventListener(type, listener, options);

    return () => target.removeEventListener(type, listener, options);
};
