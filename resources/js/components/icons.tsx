import type { ReactNode, SVGProps } from 'react';

/**
 * One icon set: viewBox 20, stroke 1.75, round caps (Stijlgids). Icons are
 * decorative by default; give the surrounding control an accessible name.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
    size?: number;
};

function Icon({
    size = 20,
    children,
    ...props
}: IconProps & { children: ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 20 20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            {children}
        </svg>
    );
}

export function ChevronLeftIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 4 6 10l6 6" />
        </Icon>
    );
}

export function CheckIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
        </Icon>
    );
}

export function ChevronDownIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m5 8 5 5 5-5" />
        </Icon>
    );
}

export function UndoIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M7 4 3 8l4 4M3 8h9a4.5 4.5 0 0 1 0 9H9" />
        </Icon>
    );
}

export function RedoIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m13 4 4 4-4 4M17 8H8a4.5 4.5 0 0 0 0 9h3" />
        </Icon>
    );
}

export function WarningIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M10 2.5 18 17H2Z" strokeLinecap="butt" />
            <path d="M10 8v4M10 14.5v.5" />
        </Icon>
    );
}

/** A hand with a pointing finger: "drag the photo" (ronde 3, UX 1). */
export function HandIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M7.5 10V3.75a1.25 1.25 0 0 1 2.5 0V9" />
            <path d="M10 8.5V7.25a1.25 1.25 0 0 1 2.5 0V9" />
            <path d="M12.5 9V8.25a1.25 1.25 0 0 1 2.5 0V12a5.5 5.5 0 0 1-5.5 5.5h-.6a4.5 4.5 0 0 1-3.6-1.8L3.4 12.1a1.25 1.25 0 0 1 2-1.5l2.1 2.4" />
        </Icon>
    );
}

export function CloseIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M5 5l10 10M15 5L5 15" />
        </Icon>
    );
}

export function MoreIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="4.5" cy="10" r="1" />
            <circle cx="10" cy="10" r="1" />
            <circle cx="15.5" cy="10" r="1" />
        </Icon>
    );
}

export function ZoomIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.5 12.5L17 17M8.5 6v5M6 8.5h5" />
        </Icon>
    );
}

export function SearchIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.5 12.5L17 17" />
        </Icon>
    );
}

export function MenuIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M3 5h14M3 10h14M3 15h14" />
        </Icon>
    );
}

export function FolderIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" />
        </Icon>
    );
}

export function CopyIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="6.5" y="6.5" width="10" height="10" rx="1.5" />
            <path d="M13.5 6.5v-2a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" />
        </Icon>
    );
}
