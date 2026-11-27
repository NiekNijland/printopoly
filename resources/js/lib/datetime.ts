// The one door to Intl.DateTimeFormat: one formatter per locale and options, kept.
const formatters = new Map<string, Intl.DateTimeFormat>();

export const dateTimeFormatter = (
    locale: string,
    options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormat => {
    const key = `${locale}|${JSON.stringify(options)}`;
    const known = formatters.get(key);
    if (known !== undefined) {
        return known;
    }
    const formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);

    return formatter;
};

export const formatDateTime = (
    value: Date | number,
    locale: string,
    options: Intl.DateTimeFormatOptions = {},
): string => dateTimeFormatter(locale, options).format(value);
