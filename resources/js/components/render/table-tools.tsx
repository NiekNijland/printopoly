import { INK } from './table-pieces';

/** Scissors lying open. */
export const Scissors = ({
    size = 96,
    className,
}: {
    size?: number;
    className?: string;
}) => {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 96 60"
            width={size}
            height={(size * 60) / 96}
            className={className}
        >
            <path
                d="M44 30 L92 10 L92 16 Z"
                fill="#CFD3D8"
                stroke={INK}
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M44 30 L92 50 L92 44 Z"
                fill="#CFD3D8"
                stroke={INK}
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <circle cx="44" cy="30" r="3" fill={INK} />
            <circle
                cx="18"
                cy="14"
                r="11"
                fill="none"
                stroke="#C8321F"
                strokeWidth="6"
            />
            <circle
                cx="18"
                cy="46"
                r="11"
                fill="none"
                stroke="#C8321F"
                strokeWidth="6"
            />
            <path
                d="M28 18 L44 30 L28 42"
                fill="none"
                stroke={INK}
                strokeWidth="2"
            />
        </svg>
    );
};

/** A 100 mm ruler. */
export const Ruler = ({
    width = 160,
    className,
}: {
    width?: number;
    className?: string;
}) => {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 160 28"
            width={width}
            height={(width * 28) / 160}
            className={className}
        >
            <rect
                x="1"
                y="1"
                width="158"
                height="26"
                fill="#FFF4C2"
                stroke={INK}
                strokeWidth="1.5"
            />
            {Array.from({ length: 33 }, (_, index) => (
                <line
                    key={index}
                    x1={4 + index * 4.7}
                    x2={4 + index * 4.7}
                    y1="1.5"
                    y2={index % 5 === 0 ? 14 : 8}
                    stroke={INK}
                    strokeWidth="1"
                />
            ))}
        </svg>
    );
};

/** A bank card, the size reference of the proof sheet and the squeegee for stickers. */
export const BankCard = ({
    width = 120,
    className,
}: {
    width?: number;
    className?: string;
}) => {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 86 54"
            width={width}
            height={(width * 54) / 86}
            className={className}
        >
            <rect
                x="1"
                y="1"
                width="84"
                height="52"
                rx="4"
                fill="#CCEDF9"
                stroke={INK}
                strokeWidth="1.5"
            />
            <rect
                x="8"
                y="12"
                width="14"
                height="10"
                rx="2"
                fill="#FFF4C2"
                stroke={INK}
                strokeWidth="1"
            />
            <rect x="8" y="38" width="40" height="3" fill={INK} opacity="0.4" />
            <rect
                x="8"
                y="44"
                width="24"
                height="3"
                fill={INK}
                opacity="0.25"
            />
        </svg>
    );
};
