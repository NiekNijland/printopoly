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

export function KeyboardIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <rect x="2" y="5" width="16" height="10" rx="1.5" />
            <path d="M5 8.5h.5M8.5 8.5h.5M11.5 8.5h.5M14.5 8.5h.5M6 12h8" />
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

export function MenuIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M3 5h14M3 10h14M3 15h14" />
        </Icon>
    );
}

export function UsersIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <circle cx="7.5" cy="7" r="2.75" />
            <path d="M2.5 16c.4-2.6 2.3-4 5-4s4.6 1.4 5 4" />
            <circle cx="14" cy="7.75" r="2.25" />
            <path d="M14 12.25c2 .1 3.2 1.3 3.5 3.25" />
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
