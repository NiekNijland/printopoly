import { WordInput } from '@/features/edition/editor/edition-field-parts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { deedContent } from '@/lib/render/deed-rows';
import { BANK_KEY, wordKey } from '@/lib/render/edition-keys';
import { MAX_NAME_LENGTH } from '@/lib/render/edition-schema';
import type { Edition } from '@/lib/render/edition-types';
import { defaultWords, resolveWords } from '@/lib/render/edition-words';
import { standardEdition } from '@/lib/render/standard-edition';
import { STRINGS } from '@/lib/render/strings';
import type { Locale } from '@/types/game';

/** What a note says without a bank name: "Speelgeld" (B85). */
const bankPlaceholder = (language: Locale): string => {
    const word = STRINGS[language].playMoney;

    return word.charAt(0).toUpperCase() + word.slice(1);
};

type WordSpec = {
    key: string;
    field: 'name' | 'text';
    label: string;
    placeholder: string;
};

const WordGrid = ({
    session,
    edition,
    specs,
}: {
    session: EditionSession;
    edition: Edition;
    specs: readonly WordSpec[];
}) => (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {specs.map((spec) => (
            <WordInput
                key={`${spec.key}.${spec.field}`}
                session={session}
                edition={edition}
                elementKey={spec.key}
                field={spec.field}
                label={spec.label}
                placeholder={spec.placeholder}
            />
        ))}
    </div>
);

const wordPreviews = (
    edition: Edition,
    words: ReturnType<typeof resolveWords>,
) => {
    const street = standardEdition.spaces.find(
        (space) => space.type === 'street',
    );
    const buildings =
        street?.type === 'street'
            ? deedContent(street, edition.language, edition.currency, words)
            : undefined;
    const station = standardEdition.spaces.find(
        (space) => space.type === 'station',
    );
    const utility = standardEdition.spaces.find(
        (space) => space.type === 'utility',
    );
    const transport =
        station?.type === 'station' && utility?.type === 'utility'
            ? {
                  station: deedContent(
                      station,
                      edition.language,
                      edition.currency,
                      words,
                  ).rows[1]?.label,
                  utility: words.utility.singular,
              }
            : undefined;

    return { buildings, transport };
};

const pair = (
    key: string,
    one: [string, string],
    many: [string, string],
): WordSpec[] => [
    { key, field: 'name', label: one[0], placeholder: one[1] },
    { key, field: 'text', label: many[0], placeholder: many[1] },
];

type Previews = ReturnType<typeof wordPreviews>;

const BuildingWords = ({
    session,
    edition,
    buildings,
}: {
    session: EditionSession;
    edition: Edition;
    buildings: Previews['buildings'];
}) => {
    const t = useTranslation();
    const standard = defaultWords(edition);

    return (
        <>
            <WordGrid
                session={session}
                edition={edition}
                specs={[
                    ...pair(
                        wordKey('house'),
                        [t('words.house'), standard.house.singular],
                        [t('words.houses'), standard.house.plural],
                    ),
                    ...pair(
                        wordKey('hotel'),
                        [t('words.hotel'), standard.hotel.singular],
                        [t('words.hotels'), standard.hotel.plural],
                    ),
                ]}
            />
            {buildings !== undefined && (
                <p className="m-0 -mt-2 rounded-control bg-paper px-3 py-2 text-sm text-ink-soft">
                    {t('words.preview_buildings', {
                        text: `${buildings.rows[3]?.label ?? ''}, ${buildings.rows[6]?.label ?? ''}`,
                    })}
                </p>
            )}
        </>
    );
};

const TransportWords = ({
    session,
    edition,
    transport,
}: {
    session: EditionSession;
    edition: Edition;
    transport: Previews['transport'];
}) => {
    const t = useTranslation();
    const standard = defaultWords(edition);

    return (
        <>
            {/* Stations and utilities: the deeds and the cards that send you there use these (UX 4). */}
            <WordGrid
                session={session}
                edition={edition}
                specs={[
                    ...pair(
                        wordKey('station'),
                        [t('words.station'), standard.station.singular],
                        [t('words.stations'), standard.station.plural],
                    ),
                    ...pair(
                        wordKey('utility'),
                        [t('words.utility'), standard.utility.singular],
                        [t('words.utilities'), standard.utility.plural],
                    ),
                ]}
            />
            {transport !== undefined && (
                <p className="m-0 -mt-2 rounded-control bg-paper px-3 py-2 text-sm text-ink-soft">
                    {t('words.preview_transport', {
                        station: transport.station ?? '',
                        utility: transport.utility,
                    })}
                </p>
            )}
        </>
    );
};

/** Woorden: houses, hotels, the jail in a sentence, the two decks and the bank (B126, B148). */
export const WordFields = ({
    session,
    edition,
}: {
    session: EditionSession;
    edition: Edition;
}) => {
    const t = useTranslation();
    const standard = defaultWords(edition);
    const { buildings, transport } = wordPreviews(
        edition,
        resolveWords(edition),
    );

    return (
        <>
            <p className="m-0 text-sm text-ink-soft">
                {t('edition_panel.words_hint')}
            </p>
            <BuildingWords
                session={session}
                edition={edition}
                buildings={buildings}
            />
            <TransportWords
                session={session}
                edition={edition}
                transport={transport}
            />
            <WordInput
                session={session}
                edition={edition}
                elementKey={wordKey('jail')}
                field="name"
                label={t('words.jail_word')}
                placeholder={standard.jail}
            />
            <WordGrid
                session={session}
                edition={edition}
                specs={[
                    {
                        key: wordKey('chance'),
                        field: 'name',
                        label: t('words.deck_chance'),
                        placeholder: standard.decks.chance,
                    },
                    {
                        key: wordKey('chest'),
                        field: 'name',
                        label: t('words.deck_chest'),
                        placeholder: standard.decks.chest,
                    },
                ]}
            />
            <WordInput
                session={session}
                edition={edition}
                elementKey={BANK_KEY}
                field="name"
                label={t('edition_panel.bank')}
                placeholder={bankPlaceholder(edition.language)}
                where={t('edition_panel.bank_where')}
                maxLength={MAX_NAME_LENGTH}
            />
        </>
    );
};
