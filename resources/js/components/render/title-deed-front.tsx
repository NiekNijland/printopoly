import { deedContent, type DeedContent } from '@/lib/render/deed-rows';
import { DEED_PHOTO } from '@/lib/render/edition-deed-photos';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { STRINGS } from '@/lib/render/strings';
import { partStyleOf } from '@/lib/render/style';
import { mm } from '@/lib/render/units';
import type { OwnableSpace } from '@/types/game';

import { FitText } from './fit-text';
import { PhotoSlot, isFullPhoto } from './photo-slot';
import { Abs, useRender } from './sheet';
import { SpaceIconArt, type SpaceIconSource } from './space-icon';
import {
    BLOCK,
    BLOCK_HEIGHT,
    COST_ROW,
    DEED_SEED,
    DeedBlock,
    DeedFrame,
    FRAME,
    RULE_Y,
    RULE_Y_PHOTO,
    blockColors,
    iconOf,
    townLabel,
} from './title-deed-parts';
import { Row, rowLook } from './title-deed-rows';
import { StyledDeedRule } from './title-deed-styles';

type FrontProps = {
    space: OwnableSpace;
    w: number;
    h: number;
    name?: string;
    town?: string;
    photo?: PhotoSource;
    icon?: SpaceIconSource;
    bleed: number;
};

type TableLook = {
    w: number;
    deedStyle: DeedStyle | undefined;
    band: string;
    street: boolean;
};

const DeedRentRows = ({
    rows,
    top,
    rowHeight,
    rowFont,
    w,
    deedStyle,
    band,
    street,
}: TableLook & {
    rows: DeedContent['rows'];
    top: number;
    rowHeight: number;
    rowFont: number;
}) => {
    const { theme } = useRender();

    return (
        <div
            style={{
                position: 'absolute',
                left: mm(BLOCK + 0.5),
                top: mm(top),
                width: mm(w - 2 * BLOCK - 1),
            }}
            data-slot="rent-table"
        >
            {rows.map((row, index) => (
                <Row
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    height={rowHeight}
                    font={rowFont}
                    look={rowLook(deedStyle, index, band, street, theme)}
                />
            ))}
        </div>
    );
};

const DeedCosts = ({
    content,
    ruleY,
    w,
    deedStyle,
    band,
    street,
}: TableLook & {
    content: DeedContent;
    ruleY: number;
}) => {
    const { theme } = useRender();

    return (
        <>
            {deedStyle === undefined ? (
                <Abs
                    x={BLOCK + 0.5}
                    y={ruleY}
                    w={w - 2 * BLOCK - 1}
                    h={0}
                    style={{ borderTop: `0.2mm solid ${theme.ink}` }}
                    slot="rule"
                />
            ) : (
                <StyledDeedRule
                    style={deedStyle}
                    x={BLOCK + 0.5}
                    y={ruleY}
                    w={w - 2 * BLOCK - 1}
                    band={band}
                    street={street}
                />
            )}
            <div
                style={{
                    position: 'absolute',
                    left: mm(BLOCK + 0.5),
                    top: mm(ruleY + 1),
                    width: mm(w - 2 * BLOCK - 1),
                }}
                data-slot="costs"
            >
                {content.costs.map((row) => (
                    <Row
                        key={row.label}
                        label={row.label}
                        value={row.value}
                        height={COST_ROW}
                        font={3.1}
                        look={rowLook(deedStyle, 1, band, street, theme)}
                    />
                ))}
                <div
                    style={{
                        textAlign: 'right',
                        fontSize: mm(2.3),
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                    }}
                    data-slot="costs-note"
                >
                    {content.costsNote}
                </div>
            </div>
        </>
    );
};

const tableLayout = (
    space: OwnableSpace,
    h: number,
    hasPhoto: boolean,
    rowCount: number,
) => {
    const blockBottom = BLOCK + BLOCK_HEIGHT;
    const photoBottom = DEED_PHOTO.bottom;
    const ruleY = hasPhoto ? RULE_Y_PHOTO : RULE_Y;
    const contentTop = hasPhoto ? photoBottom + 1.5 : blockBottom + 2.5;
    const iconName = iconOf(space);
    const iconSize =
        iconName === null || hasPhoto ? 0 : space.type === 'utility' ? 15 : 12;
    const rowsTop = contentTop + (iconSize > 0 ? iconSize + 3.5 : 0);
    const rowsBottom = space.type === 'street' ? ruleY - 1 : h - FRAME - 4;
    const rowHeight =
        rowCount === 0 ? 0 : Math.min(6.5, (rowsBottom - rowsTop) / rowCount);
    const rowFont = Math.min(3.3, rowHeight * 0.62);

    return {
        ruleY,
        contentTop,
        iconName,
        iconSize,
        rowsTop,
        rowHeight,
        rowFont,
    };
};

const DeedFooter = ({
    footer,
    w,
    h,
    top,
    hasPhoto,
}: {
    footer: string;
    w: number;
    h: number;
    top: number;
    hasPhoto: boolean;
}) => {
    return (
        <FitText
            text={footer}
            x={BLOCK + 1.5}
            y={top}
            w={w - 2 * BLOCK - 3}
            h={h - FRAME - 3 - top}
            maxFontMm={3.3}
            minFontMm={1.8}
            wrap="words"
            font="body"
            align="center"
            valign={hasPhoto ? 'middle' : 'top'}
            lineHeight={1.35}
            slot="footer"
        />
    );
};

type FrontTableProps = TableLook & {
    space: OwnableSpace;
    h: number;
    photo?: PhotoSource;
    full: boolean;
    icon?: SpaceIconSource;
};

const DeedFrontTable = ({
    space,
    w,
    h,
    photo,
    full,
    icon,
    deedStyle,
    band,
    street,
}: FrontTableProps) => {
    const { theme, locale, currency, words } = useRender();
    const hasPhoto = photo !== undefined;
    const content = deedContent(space, locale, currency, words);
    const {
        ruleY,
        contentTop,
        iconName,
        iconSize,
        rowsTop,
        rowHeight,
        rowFont,
    } = tableLayout(space, h, hasPhoto, content.rows.length);

    return (
        <>
            {hasPhoto && !full && (
                <PhotoSlot
                    x={BLOCK}
                    y={DEED_PHOTO.top}
                    w={DEED_PHOTO.w}
                    h={DEED_PHOTO.bottom - DEED_PHOTO.top}
                    photo={photo}
                />
            )}
            {iconName !== null && iconSize > 0 && (
                <SpaceIconArt
                    icon={icon}
                    fallback={iconName}
                    x={(w - iconSize) / 2}
                    y={contentTop + 0.5}
                    size={iconSize}
                    color={theme.ink}
                    strokeWidth={1.5}
                />
            )}
            {content.rows.length > 0 && (
                <DeedRentRows
                    rows={content.rows}
                    top={rowsTop}
                    rowHeight={rowHeight}
                    rowFont={rowFont}
                    w={w}
                    deedStyle={deedStyle}
                    band={band}
                    street={street}
                />
            )}
            {content.costs.length > 0 && (
                <DeedCosts
                    content={content}
                    ruleY={ruleY}
                    w={w}
                    deedStyle={deedStyle}
                    band={band}
                    street={street}
                />
            )}
            {space.type === 'utility' && (
                <DeedFooter
                    footer={content.footer}
                    w={w}
                    h={h}
                    top={rowsTop}
                    hasPhoto={hasPhoto}
                />
            )}
        </>
    );
};

export const DeedFront = ({
    space,
    w,
    h,
    name,
    town,
    photo,
    icon,
    bleed,
}: FrontProps) => {
    const { theme, locale, style } = useRender();
    const deedStyle = partStyleOf(style, 'deeds');
    const street = space.type === 'street';
    const t = STRINGS[locale];
    const title = name ?? space.name[locale];
    const townText = townLabel(space, town);
    const { band, onBand } = blockColors(space, theme, style);
    const hasPhoto = photo !== undefined;
    // "Full": the photo fills the top of the card behind the block (B124); the table keeps its own paper.
    const full = hasPhoto && isFullPhoto(photo);
    const blockBottom = BLOCK + BLOCK_HEIGHT;
    const photoBottom = DEED_PHOTO.bottom;

    // The paper tile of Speels and the border of Vintage (one opaque picture in print, B269) lie under a full photo;
    // the theme's frame is drawn over it.
    const frameUnder = deedStyle === 'playful' || deedStyle === 'vintage';

    return (
        <>
            {frameUnder && (
                <DeedFrame deedStyle={deedStyle} w={w} h={h} seed={DEED_SEED} />
            )}
            {full && (
                // Full width (B253): edge to edge into the bleed, under the block instead of behind it, so the
                // block never covers a face (R5-05, Ingrid in round 6).
                <PhotoSlot
                    x={-bleed}
                    y={blockBottom}
                    w={w + 2 * bleed}
                    h={photoBottom - blockBottom}
                    photo={photo}
                />
            )}
            {!frameUnder && (
                <DeedFrame deedStyle={deedStyle} w={w} h={h} seed={DEED_SEED} />
            )}
            <DeedBlock
                deedStyle={deedStyle}
                w={w}
                label={t.titleDeed}
                title={title}
                townText={townText}
                band={band}
                onBand={onBand}
                street={street}
                bleed={bleed}
                seed={DEED_SEED}
            />
            <DeedFrontTable
                space={space}
                w={w}
                h={h}
                photo={photo}
                full={full}
                icon={icon}
                deedStyle={deedStyle}
                band={band}
                street={street}
            />
        </>
    );
};
