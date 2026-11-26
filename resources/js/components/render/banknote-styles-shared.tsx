import { noteInk, type Rect } from '@/lib/render/banknote-pattern';
import { withAlpha } from '@/lib/render/color';
import type { PhotoSource } from '@/lib/render/photo';
import type { Theme } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { BANKNOTE_SIZE_MM } from './banknote-parts';
import { PhotoSlot } from './photo-slot';
import { Abs } from './sheet';

export type StyledNoteProps = {
    value: number;
    paper: string;
    bankName?: string;
    editionName?: string;
    photo?: PhotoSource;
};

export const { w: NOTE_W, h: NOTE_H } = BANKNOTE_SIZE_MM;

/** The frame line of every style: the set mark sits on its bottom edge (`NOTE_MARK` in item-art.tsx). */
export const FRAME_INSET = 4.6;

/** One dark ink per note: a deep shade of its paper like the original money, black in Strak (B255). */
export const inkOf = (theme: Theme, paper: string): string => {
    return theme.id === 'strak' ? theme.ink : noteInk(paper, theme.ink);
};

/** A full photo behind the field, lightened so the line work and the text stay on top (as B137). */
export const FullPhoto = ({
    field,
    photo,
    light,
    radius = 0,
}: {
    field: Rect;
    photo: PhotoSource | undefined;
    light: string;
    radius?: number;
}) => {
    return (
        <Abs
            x={field.x}
            y={field.y}
            w={field.w}
            h={field.h}
            style={{ borderRadius: mm(radius), overflow: 'hidden' }}
        >
            <PhotoSlot x={0} y={0} w={field.w} h={field.h} photo={photo} />
            <Abs
                x={0}
                y={0}
                w={field.w}
                h={field.h}
                style={{ background: withAlpha(light, 0.55) }}
                slot="photo-wash"
            />
        </Abs>
    );
};
