import {
    PrintgidsScene,
    FaqScene,
    PrivacyScene,
    TermsScene,
    EditionScene,
    ContactScene,
} from './table-page-scenes';
import {
    ProofScene,
    BoardScene,
    CardsScene,
    MoneyScene,
    PawnsScene,
    ShareScene,
    TroubleScene,
    LidArt,
} from './table-section-scenes';
import { Stage } from './table-stage';

export type PageArtName =
    'printgids' | 'faq' | 'privacy' | 'terms' | 'contact' | 'edition';

/** The big drawing in the colour band at the top of a public page (B109). */
export const PageArt = ({ name }: { name: PageArtName }) => {
    return (
        <Stage width={400} height={250}>
            {name === 'printgids' && <PrintgidsScene />}

            {name === 'faq' && <FaqScene />}

            {name === 'privacy' && <PrivacyScene />}

            {name === 'terms' && <TermsScene />}

            {name === 'edition' && <EditionScene />}

            {name === 'contact' && <ContactScene />}
        </Stage>
    );
};

export type SectionArtName =
    | 'proof'
    | 'board'
    | 'cards'
    | 'money'
    | 'pawns'
    | 'lid'
    | 'share'
    | 'trouble';

/** A small still life per part of the print guide, lying on a coloured tile. */
export const SectionArt = ({ name }: { name: SectionArtName }) => {
    return (
        <Stage width={360} height={170}>
            {name === 'proof' && <ProofScene />}

            {name === 'board' && <BoardScene />}

            {name === 'cards' && <CardsScene />}

            {name === 'money' && <MoneyScene />}

            {name === 'pawns' && <PawnsScene />}
            {name === 'lid' && <LidArt />}
            {name === 'share' && <ShareScene />}

            {name === 'trouble' && <TroubleScene />}
        </Stage>
    );
};
