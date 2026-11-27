import type { CSSProperties } from 'react';

import type { PriceListPage } from '@/lib/render/rules-booklet';
import { standardEdition } from '@/lib/render/standard-edition';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

/**
 * A long street name in the price list gets a smaller letter and a second line instead of being cut off ("De
 * burgemeesterswoni…", bug 19 of test round 4). The name column holds about 20 letters at full size.
 */
const priceNameFit = (name: string): CSSProperties => {
    const length = [...name].length;

    if (length <= 20) {
        return { overflow: 'hidden', textOverflow: 'ellipsis' };
    }

    return {
        fontSize: mm(length <= 26 ? 2.7 : length <= 44 ? 2.4 : 2.1),
        lineHeight: 1.05,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden',
    };
};

export const PriceTable = ({
    content,
    theme,
}: {
    content: PriceListPage;
    theme: Theme;
}) => {
    const columns = '1fr 15mm 16mm 15mm 15mm 17mm';
    const cell: CSSProperties = {
        fontSize: mm(3.2),
        lineHeight: 1,
        whiteSpace: 'nowrap',
    };
    const number: CSSProperties = { ...cell, textAlign: 'right' };
    const head: CSSProperties = {
        ...cell,
        fontFamily: theme.monoFont,
        fontSize: mm(2.3),
        textTransform: 'uppercase',
        opacity: 0.7,
    };
    const colors = new Map<string, string>(
        standardEdition.groups.map((group) => [group.id, group.color]),
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: columns,
                    columnGap: mm(1.5),
                    paddingBottom: mm(1.2),
                    borderBottom: `${mm(0.3)} solid ${theme.ink}`,
                }}
            >
                <span style={head}>{content.heads.name}</span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.price}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.rent}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.hotel}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.house}
                </span>
                <span style={{ ...head, textAlign: 'right' }}>
                    {content.heads.mortgage}
                </span>
            </div>
            {content.groups.map((group) => (
                <PriceGroup
                    key={group.id}
                    group={group}
                    color={colors.get(group.id) ?? theme.ink}
                    columns={columns}
                    cell={cell}
                    number={number}
                    theme={theme}
                />
            ))}
            <p
                style={{
                    margin: `${mm(3)} 0 0`,
                    fontSize: mm(2.7),
                    lineHeight: 1.35,
                    opacity: 0.8,
                }}
            >
                {content.note}
            </p>
        </div>
    );
};

const PriceGroup = ({
    group,
    color,
    columns,
    cell,
    number,
    theme,
}: {
    group: PriceListPage['groups'][number];
    color: string;
    columns: string;
    cell: CSSProperties;
    number: CSSProperties;
    theme: Theme;
}) => {
    return (
        <div style={{ marginTop: mm(2.2) }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: mm(1.6),
                    marginBottom: mm(0.8),
                }}
            >
                <span
                    style={{
                        width: mm(10),
                        height: mm(2.6),
                        background: color,
                        border: `${mm(0.2)} solid ${theme.ink}`,
                    }}
                />
                <span
                    style={{
                        fontFamily: theme.headingFont,
                        fontWeight: 800,
                        fontSize: mm(3),
                    }}
                >
                    {group.label}
                </span>
            </div>
            {group.rows.map((row) => (
                <PriceRow
                    key={row.name}
                    row={row}
                    columns={columns}
                    cell={cell}
                    number={number}
                    theme={theme}
                />
            ))}
        </div>
    );
};

const PriceRow = ({
    row,
    columns,
    cell,
    number,
    theme,
}: {
    row: PriceListPage['groups'][number]['rows'][number];
    columns: string;
    cell: CSSProperties;
    number: CSSProperties;
    theme: Theme;
}) => {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: columns,
                columnGap: mm(1.5),
                alignItems: 'center',
                height: mm(5.4),
                borderBottom: `${mm(0.12)} solid ${theme.line}`,
            }}
        >
            <span
                data-price-name=""
                style={{ ...cell, ...priceNameFit(row.name) }}
            >
                {row.name}
            </span>
            <span style={number}>{row.price}</span>
            {row.group === 'station' || row.group === 'utility' ? (
                <span
                    style={{
                        ...number,
                        gridColumn: '3 / span 3',
                    }}
                >
                    {row.rent}
                </span>
            ) : (
                <>
                    <span style={number}>{row.rent}</span>
                    <span style={number}>{row.hotel}</span>
                    <span style={number}>{row.house}</span>
                </>
            )}
            <span style={number}>{row.mortgage}</span>
        </div>
    );
};
