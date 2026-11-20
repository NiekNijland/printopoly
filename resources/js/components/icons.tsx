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

export function FolderIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" />
        </Icon>
    );
}
