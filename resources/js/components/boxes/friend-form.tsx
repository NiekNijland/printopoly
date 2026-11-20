import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { ContributionPreview } from '@/components/boxes/contribution-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { BoxApiError, sendContribution } from '@/lib/boxes/api';
import { prepareFriendPhoto } from '@/lib/boxes/friend-photo';
import { targetLabel } from '@/lib/boxes/labels';
import { addSent, type SentRecord } from '@/lib/boxes/local';
import type { FriendBox } from '@/lib/boxes/types';
import type { Edition } from '@/lib/edition/types';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import type { Locale } from '@/lib/game/types';

const NO_PHOTOS: PhotoInfos = new Map();

interface FriendFormProps {
    box: FriendBox;
    edition: Edition;
    locale: Locale;
    elementKey: string;
    firstName: string;
    /** What the element is called now, for the "Nu:" line. */
    current: string;
    onSent: (record: SentRecord) => void;
}

/**
 * What a friend adds to the chosen element (B128): a photo with a live preview on the element, and a suggested name
 * or card text. The first name comes from the page. The photo is checked in the browser first; the server checks
 * again.
 */
export function FriendForm({
    box,
    edition,
    locale,
    elementKey,
    firstName,
    current,
    onSent,
}: FriendFormProps) {
    const t = useTranslation();
    const ids = useId();
    const isCard = elementKey.startsWith('card.');
    const isTown = elementKey.startsWith('group.');
    const field = isCard ? 'text' : isTown ? 'town' : 'name';
    const label = targetLabel(elementKey, edition, locale, (group) =>
        t('friend.town_of', { group }),
    );
    const [value, setValue] = useState('');
    const [photo, setPhoto] = useState<{
        upload: Blob;
        url: string;
        width: number;
        height: number;
    } | null>(null);
    const [working, setWorking] = useState(false);
    const [sending, setSending] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);
    const [nameProblem, setNameProblem] = useState(false);
    const file = useRef<HTMLInputElement>(null);
    const honeypot = useRef<HTMLInputElement>(null);

    const photoUrl = photo?.url;
    useEffect(
        () => () => {
            if (photoUrl !== undefined) {
                URL.revokeObjectURL(photoUrl);
            }
        },
        [photoUrl],
    );

    const choose = async (chosen: File): Promise<void> => {
        setProblem(null);
        setWorking(true);
        try {
            const prepared = await prepareFriendPhoto(chosen, locale);
            if (!prepared.ok) {
                setProblem(prepared.message);

                return;
            }
            if (
                prepared.upload.size >
                box.limits.photoMegabytes * 1024 * 1024
            ) {
                setProblem(
                    t('photo.too_large', { mb: box.limits.photoMegabytes }),
                );

                return;
            }
            setPhoto({
                upload: prepared.upload,
                url: URL.createObjectURL(prepared.preview),
                width: prepared.width,
                height: prepared.height,
            });
        } finally {
            setWorking(false);
        }
    };

    const submit = async (event: FormEvent): Promise<void> => {
        event.preventDefault();
        setProblem(null);
        const name = firstName.trim();
        if (name === '') {
            setNameProblem(true);
            document.getElementById('friend-first-name')?.focus();

            return;
        }
        setNameProblem(false);
        const text = value.trim();
        if (text === '' && photo === null) {
            setProblem(t('boxes.nothing_to_add'));

            return;
        }
        setSending(true);
        try {
            const sent = await sendContribution(box.token, {
                elementKey,
                firstName: name,
                value: text,
                photo: photo?.upload ?? null,
                website: honeypot.current?.value ?? '',
            });
            const record: SentRecord = {
                receipt: sent.receipt,
                elementKey,
                label,
                value: text,
                hasPhoto: photo !== null,
                sentAt: Date.now(),
            };
            addSent(box.token, record);
            setValue('');
            setPhoto(null);
            onSent(record);
        } catch (failure) {
            setProblem(
                failure instanceof BoxApiError && failure.message !== ''
                    ? failure.message
                    : t('friend.error'),
            );
        } finally {
            setSending(false);
        }
    };

    const limit = isCard ? box.limits.text : box.limits.name;

    return (
        <form
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-4"
            noValidate
        >
            <div className="flex flex-col gap-1">
                <h2 className="m-0 font-display text-2xl font-extrabold break-words">
                    {label}
                </h2>
                <p className="m-0 text-sm text-ink-soft">
                    {t('friend.current', { value: current })}
                </p>
            </div>

            <div className="flex justify-center rounded-control bg-table p-3">
                <ContributionPreview
                    edition={edition}
                    contribution={{
                        elementKey,
                        field,
                        value: value.trim() === '' ? null : value.trim(),
                        width: photo?.width ?? null,
                        height: photo?.height ?? null,
                    }}
                    photoUrl={photo?.url ?? null}
                    photos={NO_PHOTOS}
                    maxWidth={300}
                    maxHeight={280}
                />
            </div>

            {!isTown && (
                <div className="flex flex-col gap-2">
                    <span className="font-semibold">{t('friend.photo')}</span>
                    <input
                        ref={file}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                        onChange={(event) => {
                            const chosen = event.target.files?.[0];
                            event.target.value = '';
                            if (chosen !== undefined) {
                                void choose(chosen);
                            }
                        }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant={photo === null ? 'secondary' : 'ghost'}
                            disabled={working || sending}
                            onClick={() => file.current?.click()}
                        >
                            {working
                                ? t('friend.photo_working')
                                : photo === null
                                  ? t('friend.photo_choose')
                                  : t('friend.photo_change')}
                        </Button>
                        {photo !== null && (
                            <Button
                                variant="ghost"
                                className="underline underline-offset-4"
                                onClick={() => setPhoto(null)}
                            >
                                {t('friend.photo_remove')}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2">
                <label htmlFor={`${ids}-value`} className="font-semibold">
                    {t(
                        isCard
                            ? 'friend.text_label'
                            : isTown
                              ? 'friend.town_label'
                              : 'friend.name_label',
                    )}
                </label>
                {isCard ? (
                    <Textarea
                        id={`${ids}-value`}
                        rows={3}
                        maxLength={limit}
                        value={value}
                        placeholder={t('friend.text_placeholder')}
                        onChange={(event) => setValue(event.target.value)}
                    />
                ) : (
                    <Input
                        id={`${ids}-value`}
                        maxLength={limit}
                        value={value}
                        placeholder={t(
                            isTown
                                ? 'friend.town_placeholder'
                                : 'friend.name_placeholder',
                        )}
                        autoComplete="off"
                        onChange={(event) => setValue(event.target.value)}
                    />
                )}
            </div>

            {/* The honeypot: out of sight and out of the tab order. People leave it empty, bots fill it. */}
            <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            >
                <label>
                    Website
                    <input
                        ref={honeypot}
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </label>
            </div>

            {nameProblem && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {t('boxes.first_name_required')}
                </p>
            )}
            {problem !== null && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {problem}
                </p>
            )}

            <Button type="submit" disabled={sending || working}>
                {sending ? t('friend.sending') : t('friend.submit')}
            </Button>
            <p className="m-0 text-sm text-ink-soft">{t('friend.privacy')}</p>
            {photo !== null && (
                <span className="sr-only">{t('friend.photo_alt')}</span>
            )}
        </form>
    );
}
