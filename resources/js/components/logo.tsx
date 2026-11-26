import { useId } from 'react';

import { cn } from '@/lib/utils';

type Tone = 'ink' | 'paper';

const STROKE: Record<Tone, string> = {
    ink: '#1B1F24',
    paper: '#F6F1E4',
};

const CYAN = '#00A3E0';
const MAGENTA = '#E6007E';
const YELLOW = '#FFE600';
const PAPER = '#F6F1E4';
const RED = '#C8321F';

type RegistrationMarkProps = {
    size?: number;
    tone?: Tone;
    /** The heavier drawing for the mark on its own, as in the favicon. */
    heavy?: boolean;
    className?: string;
};

/**
 * The registration mark (paspunt), drawn exactly as in docs/design: one
 * drawing for empty states and the like, paper-coloured on dark (B83, B87).
 */
export const RegistrationMark = ({
    size = 28,
    tone = 'ink',
    heavy = false,
    className,
}: RegistrationMarkProps) => {
    const stroke = STROKE[tone];
    const strokeWidth = heavy ? 2.5 : 2;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 28 28"
            aria-hidden="true"
            className={cn('shrink-0', className)}
        >
            <circle
                cx="14"
                cy="14"
                r="8"
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
            />
            <circle cx="14" cy="14" r={heavy ? 3.5 : 3} fill={RED} />
            <path
                d="M14 1v7M14 20v7M1 14h7M20 14h7"
                stroke={stroke}
                strokeWidth={strokeWidth}
            />
        </svg>
    );
};

/** The board corner as one outline: square cells, rounded outer corners. */
const CORNER =
    'M2 2H41A5 5 0 0 1 46 7V16H16V41A5 5 0 0 1 11 46H7A5 5 0 0 1 2 41Z';

type LogoMarkProps = {
    size?: number;
    tone?: Tone;
    className?: string;
};

/**
 * The beeldmerk (B110): a board corner of square cells in cyan, magenta,
 * yellow and red (with a house), and a printer's registration mark lying over
 * its inner corner. Hand-built on a 48 grid. public/favicon.svg is the same
 * drawing, simplified so it reads at 16 px.
 */
export const LogoMark = ({
    size = 40,
    tone = 'ink',
    className,
}: LogoMarkProps) => {
    const stroke = STROKE[tone];
    const clipId = useId();

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            aria-hidden="true"
            className={cn('shrink-0', className)}
        >
            <defs>
                <clipPath id={clipId}>
                    <path d={CORNER} />
                </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
                <rect x="2" y="2" width="14" height="14" fill={PAPER} />
                <rect x="16" y="2" width="15" height="14" fill={CYAN} />
                <rect x="31" y="2" width="15" height="14" fill={MAGENTA} />
                <rect x="2" y="16" width="14" height="15" fill={YELLOW} />
                <rect x="2" y="31" width="14" height="15" fill={RED} />
                <path
                    d="M16 2V46M31 2V16M2 16H16M2 31H16"
                    stroke={stroke}
                    strokeWidth="2"
                    fill="none"
                />
            </g>
            <path
                d="M9 33.4 14.4 38H12.9V43.4H5.1V38H3.6Z"
                fill={PAPER}
                stroke={PAPER}
                strokeWidth="0.6"
                strokeLinejoin="round"
            />
            <path
                d={CORNER}
                fill="none"
                stroke={stroke}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <circle cx="31" cy="31" r="9.5" fill={PAPER} />
            <path d="M31 31V21.5A9.5 9.5 0 0 0 21.5 31Z" fill={CYAN} />
            <path d="M31 31H40.5A9.5 9.5 0 0 0 31 21.5Z" fill={MAGENTA} />
            <path d="M31 31H21.5A9.5 9.5 0 0 0 31 40.5Z" fill={YELLOW} />
            <circle
                cx="31"
                cy="31"
                r="9.5"
                fill="none"
                stroke={stroke}
                strokeWidth="2.5"
            />
            <path
                d="M31 18V44M18 31H44"
                stroke={stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
};

type LogoProps = {
    size?: 'sm' | 'md';
    tone?: Tone;
    className?: string;
};

/**
 * The logo (B110): the mark, then "Printopoly" in League Spartan 800 with a
 * red dot on the i. The i is the dotless ı and the dot is its own element, so
 * it stays crisp at every size.
 */
export const Logo = ({ size = 'md', tone = 'ink', className }: LogoProps) => {
    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            <LogoMark size={size === 'md' ? 40 : 32} tone={tone} />
            <span className="sr-only">Printopoly</span>
            <span
                aria-hidden="true"
                className={cn(
                    'font-display leading-none font-extrabold tracking-tight',
                    size === 'md' ? 'text-3xl' : 'text-2xl',
                    tone === 'paper' ? 'text-paper' : 'text-ink',
                )}
            >
                Pr
                <span className="relative">
                    {'ı'}
                    <span className="absolute top-[0.03em] left-1/2 size-[0.21em] -translate-x-1/2 rounded-full bg-press" />
                </span>
                ntopoly
            </span>
        </span>
    );
};
