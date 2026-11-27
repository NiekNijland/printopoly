// What the print page and headless Chrome hand each other on the window (B54): the payload the server writes, and
// the signals the PDF job waits for.
export {};

declare global {
    interface Window {
        __PRINT__?: unknown;
        printReady?: boolean;
        printError?: string;
        printOverflow?: number;
    }
}
