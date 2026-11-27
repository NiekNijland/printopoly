// The one door to Intl.NumberFormat: one formatter per locale and options, kept.
const formatters = new Map<string, Intl.NumberFormat>();

const numberFormatter = (
    locale: string,
    options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat => {
    const key = `${locale}|${JSON.stringify(options)}`;
    const known = formatters.get(key);
    if (known !== undefined) {
        return known;
    }
    const formatter = new Intl.NumberFormat(locale, options);
    formatters.set(key, formatter);

    return formatter;
};

export const formatNumber = (
    value: number,
    locale: string,
    options: Intl.NumberFormatOptions = {},
): string => numberFormatter(locale, options).format(value);
