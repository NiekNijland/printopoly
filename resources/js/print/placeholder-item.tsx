import { rulerTicks } from '@/lib/print/calibration';
import type { PageItem, PrintEdition } from '@/lib/print/composition';

interface PlaceholderItemProps {
    item: PageItem;
    edition: PrintEdition;
}

/**
 * Stands in for the real renderers (resources/js/components/render) until they are merged:
 * it draws the bleed box, the trim box, the label and the first cropped photo of the element,
 * all at true size in mm. Swapping it for the real renderer touches only this file and
 * print-document.tsx; the page plan comes from composePages and does not change.
 */
export function PlaceholderItem({ item, edition }: PlaceholderItemProps) {
    if (item.kind === 'calibration') {
        return <CalibrationItem item={item} />;
    }

    const photo =
        item.elementKey === null
            ? undefined
            : edition.elements[item.elementKey]?.photo;
    const { bleed, trim } = item;

    return (
        <div
            data-item={item.id}
            style={{
                position: 'absolute',
                left: `${String(bleed.x)}mm`,
                top: `${String(bleed.y)}mm`,
                width: `${String(bleed.w)}mm`,
                height: `${String(bleed.h)}mm`,
                background: '#f2efe6',
                overflow: 'hidden',
            }}
        >
            {photo?.src !== undefined && (
                <img
                    src={photo.src}
                    alt=""
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                />
            )}
            <div
                style={{
                    position: 'absolute',
                    left: `${String(trim.x - bleed.x)}mm`,
                    top: `${String(trim.y - bleed.y)}mm`,
                    width: `${String(trim.w)}mm`,
                    height: `${String(trim.h)}mm`,
                    boxSizing: 'border-box',
                    border: '0.2mm solid #1b1f24',
                    fontFamily: 'sans-serif',
                    fontSize: '3mm',
                    lineHeight: 1.2,
                    padding: '1mm',
                    color: '#1b1f24',
                }}
            >
                {item.label}
                {item.side !== undefined &&
                    ` (${item.side === 'front' ? 'voor' : 'achter'})`}
            </div>
        </div>
    );
}

function CalibrationItem({ item }: { item: PageItem }) {
    const { trim } = item;
    const base = {
        position: 'absolute' as const,
        left: `${String(trim.x)}mm`,
        top: `${String(trim.y)}mm`,
        fontFamily: 'sans-serif',
        fontSize: '3mm',
        color: '#1b1f24',
    };

    if (item.id === 'ruler') {
        return (
            <div
                style={{
                    ...base,
                    width: `${String(trim.w)}mm`,
                    height: `${String(trim.h)}mm`,
                }}
            >
                {rulerTicks().map((tick) => (
                    <div
                        key={tick.at}
                        style={{
                            position: 'absolute',
                            left: `${String(tick.at)}mm`,
                            top: 0,
                            width: '0.2mm',
                            height: `${String(tick.length)}mm`,
                            background: '#1b1f24',
                        }}
                    />
                ))}
                <div style={{ position: 'absolute', top: '6.5mm', left: 0 }}>
                    {item.label}
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                ...base,
                width: `${String(trim.w)}mm`,
                height: `${String(trim.h)}mm`,
                boxSizing: 'border-box',
                border: '0.3mm solid #1b1f24',
                borderRadius: item.id === 'bank-card' ? '3.18mm' : 0,
                padding: '1mm',
            }}
        >
            {item.label}
        </div>
    );
}
