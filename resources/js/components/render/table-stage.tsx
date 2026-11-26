import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

interface StageProps {
    /** Design size in px; everything inside is placed in these units. */
    width: number;
    height: number;
    children: ReactNode;
    className?: string;
}

/**
 * A fixed composition of printed things that shrinks to the width of its box on small screens.
 * The server renders it at design size and the browser measures after hydration.
 */
export const Stage = ({ width, height, children, className }: StageProps) => {
    const box = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const element = box.current;

        if (element === null) {
            return;
        }

        const update = () => setScale(Math.min(1, element.clientWidth / width));

        update();

        const observer = new ResizeObserver(update);

        observer.observe(element);

        return () => observer.disconnect();
    }, [width]);

    return (
        <div
            ref={box}
            aria-hidden="true"
            className={cn('mx-auto w-full overflow-hidden', className)}
            style={{ maxWidth: width, height: height * scale }}
        >
            <div
                className="relative origin-top-left"
                style={{
                    width,
                    height,
                    transform: `scale(${scale})`,
                }}
            >
                {children}
            </div>
        </div>
    );
};

interface TableItemProps {
    /** Position of the top left corner in the stage, in px. */
    left: number;
    top: number;
    rotate?: number;
    /** Seconds before the item settles on load. */
    delay?: number;
    z?: number;
    className?: string;
    children: ReactNode;
}

/** One thing lying on the table: rotated, with paper shadow, settling and lifting a little. */
export const TableItem = ({
    left,
    top,
    rotate = 0,
    delay = 0,
    z = 1,
    className,
    children,
}: TableItemProps) => {
    return (
        <div
            data-settle=""
            className={cn('table-item absolute', className)}
            style={
                {
                    left,
                    top,
                    zIndex: z,
                    '--rot': `${rotate}deg`,
                    '--delay': `${delay}s`,
                } as CSSProperties
            }
        >
            {children}
        </div>
    );
};
