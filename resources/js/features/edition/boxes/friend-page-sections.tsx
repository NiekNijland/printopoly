import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';

import { LogoMark } from '@/components/logo';
import { RegistrationStrip } from '@/components/registration-strip';
import { Input } from '@/components/ui/input';
import type { OwnState } from '@/features/edition/boxes/api';
import { FriendArt } from '@/features/edition/boxes/friend-art';
import type { SentRecord } from '@/features/edition/boxes/local';
import { useTranslation } from '@/hooks/use-translation';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';

type Href = ComponentProps<typeof Link>['href'];

/** What became of a contribution, in the words of the friend's page (B175). */
const STATE_TEXT: Record<OwnState, string> = {
    waiting: 'friend.mine_waiting',
    applied: 'friend.mine_applied',
    passed: 'friend.mine_passed',
    handled: 'friend.mine_handled',
};

export const Step = ({ n }: { n: number }) => (
    <span aria-hidden="true" className="mr-2 font-mono text-base text-press">
        {n}
    </span>
);

export const FriendHeader = ({
    name,
    homeHref,
}: {
    name: string;
    homeHref: Href;
}) => (
    <header className="border-b-2 border-ink bg-card">
        <RegistrationStrip className="h-1.5" />
        <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-3 md:px-8">
            <Link
                href={homeHref}
                aria-label="Printopoly"
                className="inline-flex size-12 flex-none items-center justify-center no-underline"
            >
                <LogoMark size={32} />
            </Link>
            <p className="m-0 min-w-0 truncate font-display text-xl font-extrabold">
                {name}
            </p>
        </div>
    </header>
);

/** A colour band with the edition's own board on the table, as the other public pages have (B109). */
export const FriendHero = ({
    title,
    resolved,
    nameField,
}: {
    title: string;
    resolved: ResolvedEdition;
    nameField: ReactNode;
}) => {
    const t = useTranslation();

    return (
        <section className="border-b-2 border-ink bg-print-chest">
            <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-16 gap-y-6 px-4 py-8 md:px-8 md:py-12">
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
                    <h1 className="m-0 font-display text-[32px] leading-[1.05] font-extrabold md:text-[40px]">
                        {title}
                    </h1>
                    <p className="m-0 max-w-[34em] md:text-lg">
                        {t('friend.lead')}
                    </p>
                    {nameField}
                </div>
                <div className="hidden min-w-0 flex-[1_1_320px] md:block">
                    <FriendArt resolved={resolved} />
                </div>
            </div>
        </section>
    );
};

export const FirstNameField = ({
    value,
    maxLength,
    onChange,
}: {
    value: string;
    maxLength: number;
    onChange: (value: string) => void;
}) => {
    const t = useTranslation();

    return (
        <div className="flex max-w-sm flex-col gap-1">
            <p className="m-0 font-semibold">
                <Step n={1} />
                <label htmlFor="friend-first-name">
                    {t('friend.first_name')}
                </label>
            </p>
            <Input
                id="friend-first-name"
                value={value}
                maxLength={maxLength}
                autoComplete="given-name"
                onChange={(event) => {
                    onChange(event.target.value);
                }}
            />
            <p className="m-0 text-sm">{t('friend.first_name_hint')}</p>
        </div>
    );
};

export const ClosedNotice = ({ replaced }: { replaced: boolean }) => {
    const t = useTranslation();

    return (
        <section className="flex max-w-prose flex-col gap-2 rounded-control border-2 border-ink bg-card p-6">
            <h2 className="m-0 font-display text-2xl font-extrabold">
                {t(replaced ? 'friend.replaced_title' : 'friend.closed_title')}
            </h2>
            <p className="m-0 text-ink-soft">
                {t(replaced ? 'friend.replaced_body' : 'friend.closed_body')}
            </p>
        </section>
    );
};

export const SendPanel = ({
    title,
    thanks,
    children,
}: {
    title: string;
    thanks: string | null;
    children: ReactNode;
}) => {
    const t = useTranslation();

    return (
        <section
            aria-label={title}
            id="friend-form"
            className="flex h-fit scroll-mt-4 flex-col gap-3 lg:sticky lg:top-6"
        >
            <p className="m-0 font-display text-xl font-extrabold">
                <Step n={3} />
                {t('friend.step_send')}
            </p>
            <div className="flex flex-col gap-4 overflow-hidden rounded-control border-2 border-ink bg-card p-4 pt-0">
                <RegistrationStrip className="-mx-4 mb-1 h-1.5" />
                {thanks !== null && (
                    <div
                        role="status"
                        className="rounded-control border-2 border-ink bg-board p-3 font-semibold"
                    >
                        {thanks}
                    </div>
                )}
                {children}
            </div>
        </section>
    );
};

export const SentList = ({
    token,
    sent,
    states,
}: {
    token: string;
    sent: SentRecord[];
    states: Record<string, OwnState>;
}) => {
    const t = useTranslation();

    return (
        <section
            aria-labelledby="friend-mine"
            className="flex max-w-prose flex-col gap-3"
        >
            <h2
                id="friend-mine"
                className="m-0 font-display text-xl font-extrabold"
            >
                {t('friend.mine_title')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {sent.map((record) => {
                    const state = states[record.receipt];

                    return (
                        <li
                            key={record.receipt}
                            className="flex items-center gap-3 rounded-control border-2 border-ink bg-card p-3"
                        >
                            {record.hasPhoto && state === 'waiting' && (
                                <img
                                    src={`/api/box/${token}/mine/${record.receipt}/photo`}
                                    alt=""
                                    className="size-14 flex-none rounded-control border-2 border-ink object-cover"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="m-0 font-semibold break-words">
                                    {record.label}
                                    {record.value !== '' && `: ${record.value}`}
                                </p>
                                {state !== undefined && (
                                    <p className="m-0 text-sm text-ink-soft">
                                        {t(STATE_TEXT[state])}
                                    </p>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export const FriendFooter = ({ homeHref }: { homeHref: Href }) => {
    const t = useTranslation();

    return (
        <footer className="border-t-2 border-ink bg-card">
            <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-6 text-sm md:px-8">
                <LogoMark size={24} />
                <Link
                    href={homeHref}
                    className="inline-flex min-h-11 items-center font-semibold"
                >
                    {t('friend.footer')}
                </Link>
            </div>
            <RegistrationStrip className="h-1.5" />
        </footer>
    );
};
