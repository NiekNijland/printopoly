// Text that is not JSON (a broken or foreign value in storage) reads as undefined, so the caller checks one shape.
export const parseJson = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return undefined;
        }
        throw error;
    }
};
