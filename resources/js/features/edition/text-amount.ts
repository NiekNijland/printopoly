/**
 * The money a rewritten card text names, for the suggestion to put it on the amount line (Niek, 22 nov): "betaal
 * 100" and "ontvang 50" give -100 and 50. Money per house or hotel, per player or per eye is no amount line, so
 * a text with those gives nothing. Two amounts that disagree give nothing either: the editor does not guess.
 */
export function textAmount(text: string): number | undefined {
    const plain = text.toLowerCase().replace(/\{[^}]*\}/g, ' ');

    if (
        /\bper\s+(huis|hotel|huizen|hotels|house|houses|hotel|speler|player)|\belke\s+speler|\beach\s+player|\bkeer\b|\btimes\b/.test(
            plain,
        )
    ) {
        return undefined;
    }

    const found = new Set<number>();
    const pattern =
        /\b(betaal|betaalt|betalen|pay|pays|ontvang|ontvangt|krijg|krijgt|pak|collect|receive|get)\b[^.\d]{0,20}?(\d{1,4}(?:[.,]\d{3})*)/g;

    for (const match of plain.matchAll(pattern)) {
        const word = match[1] ?? '';
        const value = Number((match[2] ?? '').replace(/[.,]/g, ''));
        if (!Number.isInteger(value) || value <= 0) {
            continue;
        }
        const pays = ['betaal', 'betaalt', 'betalen', 'pay', 'pays'].includes(
            word,
        );
        found.add(pays ? -value : value);
    }

    return found.size === 1 ? [...found][0] : undefined;
}
