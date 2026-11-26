import { Textarea } from '@/components/ui/textarea';
import {
    CheckField,
    ChoiceRow,
    FieldLabel,
    RangeField,
} from '@/features/edition/editor/panel/panel-parts';
import { useTranslation } from '@/hooks/use-translation';
import {
    LAYER_ALIGNS,
    LAYER_FONTS,
    type FreeLayer,
    type LayerAlign,
    type LayerFont,
} from '@/lib/render/edition-types';
import {
    rotateLayer,
    scaleLayer,
    type LayerArea,
} from '@/lib/render/editor-layers';

type TextLayer = Extract<FreeLayer, { kind: 'text' }>;

const withoutField = (
    layer: TextLayer,
    field: 'color' | 'font' | 'align',
): TextLayer => {
    const next = { ...layer };
    delete next[field];

    return next;
};

type LayerColorProps = {
    layer: TextLayer;
    ink: string;
    onChange: (layer: TextLayer, group: string) => void;
    onStandard: () => void;
};

const LayerColor = ({ layer, ink, onChange, onStandard }: LayerColorProps) => {
    const t = useTranslation();
    const colorId = `layer-color-${layer.id}`;

    return (
        <div className="flex flex-col gap-1">
            <FieldLabel
                htmlFor={colorId}
                label={t('editor.layer_color')}
                onStandard={layer.color === undefined ? undefined : onStandard}
            />
            <div className="flex items-center gap-3">
                <input
                    id={colorId}
                    type="color"
                    value={(layer.color ?? ink).toLowerCase()}
                    onChange={(event) =>
                        onChange(
                            {
                                ...layer,
                                color: event.target.value.toUpperCase(),
                            },
                            `layer-color:${layer.id}`,
                        )
                    }
                    className="h-12 w-16 cursor-pointer rounded-control border-2 border-ink bg-card p-1"
                />
                <span className="font-mono text-sm">
                    {(layer.color ?? ink).toUpperCase()}
                </span>
            </div>
        </div>
    );
};

/**
 * The letter, the alignment and the colour of a text layer (B169), so a line on the lid can match the photo. A
 * colour of its own has a "Standaard" button that goes back to the ink of the theme.
 */
const TextLook = ({
    layer,
    ink,
    onChange,
}: {
    layer: TextLayer;
    ink: string;
    onChange: (layer: TextLayer, group: string) => void;
}) => {
    const t = useTranslation();
    const without = (field: 'color' | 'font' | 'align') =>
        withoutField(layer, field);

    return (
        <>
            <ChoiceRow<LayerFont>
                name={t('editor.layer_font')}
                label={t('editor.layer_font')}
                options={LAYER_FONTS.map((font) => ({
                    id: font,
                    label: t(`editor.layer_font_${font}`),
                }))}
                value={layer.font ?? 'heading'}
                onChange={(font) =>
                    onChange(
                        font === 'heading'
                            ? without('font')
                            : { ...layer, font },
                        `layer-look:${layer.id}`,
                    )
                }
            />
            <ChoiceRow<LayerAlign>
                name={t('editor.layer_align')}
                label={t('editor.layer_align')}
                options={LAYER_ALIGNS.map((align) => ({
                    id: align,
                    label: t(`editor.layer_align_${align}`),
                }))}
                value={layer.align ?? 'center'}
                onChange={(align) =>
                    onChange(
                        align === 'center'
                            ? without('align')
                            : { ...layer, align },
                        `layer-look:${layer.id}`,
                    )
                }
            />
            <LayerColor
                layer={layer}
                ink={ink}
                onChange={onChange}
                onStandard={() =>
                    onChange(without('color'), `layer-look:${layer.id}`)
                }
            />
        </>
    );
};

type LayerControlsProps = {
    selected: FreeLayer | undefined;
    area: LayerArea;
    ink: string;
    change: (layer: FreeLayer, group: string) => void;
};

const PlacementControls = ({
    selected,
    area,
    change,
}: Omit<LayerControlsProps, 'selected' | 'ink'> & { selected: FreeLayer }) => {
    const t = useTranslation();

    return (
        <>
            <RangeField
                label={t('editor.layer_size')}
                shown={
                    <span className="font-mono font-normal">
                        {Math.round(selected.w)} mm
                    </span>
                }
                min={6}
                max={Math.round(Math.max(area.w, area.h))}
                value={Math.round(selected.w)}
                valueText={`${String(Math.round(selected.w))} mm`}
                onChange={(next) =>
                    change(
                        scaleLayer(selected, next / selected.w, area),
                        `layer:${selected.id}`,
                    )
                }
            />
            <RangeField
                label={t('editor.layer_turn')}
                shown={
                    <span className="font-mono font-normal">
                        {selected.rotation ?? 0}°
                    </span>
                }
                min={-180}
                max={180}
                value={selected.rotation ?? 0}
                valueText={`${String(selected.rotation ?? 0)}°`}
                onChange={(next) =>
                    change(rotateLayer(selected, next), `layer:${selected.id}`)
                }
            />
            {selected.kind === 'photo' && (
                <CheckField
                    label={t('editor.grayscale')}
                    checked={selected.photo.grayscale}
                    onCheckedChange={(checked) =>
                        change(
                            {
                                ...selected,
                                photo: {
                                    ...selected.photo,
                                    grayscale: checked,
                                },
                            },
                            `layer-photo:${selected.id}`,
                        )
                    }
                />
            )}
        </>
    );
};

export const LayerControls = ({
    selected,
    area,
    ink,
    change,
}: LayerControlsProps) => {
    const t = useTranslation();

    return (
        <>
            {selected?.kind === 'text' && (
                <>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                        {t('editor.layer_text')}
                        <Textarea
                            rows={3}
                            value={selected.text}
                            onChange={(event) =>
                                change(
                                    { ...selected, text: event.target.value },
                                    `layer-text:${selected.id}`,
                                )
                            }
                        />
                    </label>
                    <TextLook
                        layer={selected}
                        ink={ink}
                        onChange={(next, group) => change(next, group)}
                    />
                </>
            )}
            {selected !== undefined && (
                <PlacementControls
                    selected={selected}
                    area={area}
                    change={change}
                />
            )}
        </>
    );
};
