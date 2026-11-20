import { cn } from '@/lib/utils';

type Tone = 'ink' | 'paper';

const STROKE: Record<Tone, string> = {
    ink: '#1B1F24',
    paper: '#F6F1E4',
};

interface RegistrationMarkProps {
    size?: number;
    tone?: Tone;
    /** The heavier drawing for the mark on its own, as in the favicon. */
    heavy?: boolean;
    className?: string;
}

/**
 * The registration mark (paspunt), drawn exactly as in docs/design: one
 * drawing everywhere, paper-coloured on dark (B83, B87).
 */
export function RegistrationMark({
    size = 28,
    tone = 'ink',
    heavy = false,
    className,
}: RegistrationMarkProps) {
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
            <circle cx="14" cy="14" r={heavy ? 3.5 : 3} fill="#C8321F" />
            <path
                d="M14 1v7M14 20v7M1 14h7M20 14h7"
                stroke={stroke}
                strokeWidth={strokeWidth}
            />
        </svg>
    );
}

interface LogoProps {
    size?: 'sm' | 'md';
    tone?: Tone;
    className?: string;
}

/** The wordmark: the mark, then "Printopoly" in League Spartan 800 (B87). */
export function Logo({ size = 'md', tone = 'ink', className }: LogoProps) {
    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            <RegistrationMark size={size === 'md' ? 28 : 24} tone={tone} />
            <span
                className={cn(
                    'font-display leading-none font-extrabold',
                    size === 'md' ? 'text-2xl' : 'text-xl',
                    tone === 'paper' ? 'text-paper' : 'text-ink',
                )}
            >
                Printopoly
            </span>
        </span>
    );
}
