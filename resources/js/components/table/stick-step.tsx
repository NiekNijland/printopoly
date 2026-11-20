import type { CSSProperties } from 'react';

import { BankCard } from './pieces';

const PANEL = 'absolute border border-ink bg-board';

/**
 * The four small drawings of "Plakken", as in Printgids.dc.html: the panel loose, with its
 * backing folded back, pressed on with a bank card, and the fold left free.
 */
export function StickStep({ step }: { step: number }) {
    return (
        <div
            aria-hidden="true"
            className="relative aspect-square overflow-hidden rounded-control border-2 border-ink bg-card"
        >
            {step === 1 && (
                <div
                    className={`${PANEL} table-item shadow-sheet`}
                    style={
                        {
                            left: '12%',
                            top: '12%',
                            width: '38%',
                            height: '38%',
                            '--rot': '-6deg',
                        } as CSSProperties
                    }
                />
            )}
            {step === 2 && (
                <>
                    <div
                        className={PANEL}
                        style={{ left: 0, top: 0, width: '50%', height: '50%' }}
                    />
                    <div
                        className="absolute border border-ink bg-white shadow-sheet"
                        style={{ left: 0, top: 0, width: '50%', height: '12%' }}
                    />
                </>
            )}
            {step === 3 && (
                <>
                    <div
                        className={PANEL}
                        style={{ left: 0, top: 0, width: '50%', height: '50%' }}
                    />
                    <div
                        className="table-item absolute"
                        style={
                            {
                                left: '26%',
                                top: '28%',
                                '--rot': '-12deg',
                            } as CSSProperties
                        }
                    >
                        <BankCard width={64} className="paper-shadow" />
                    </div>
                </>
            )}
            {step === 4 && (
                <>
                    <div
                        className="absolute inset-y-0 left-0 bg-board"
                        style={{ width: '48%' }}
                    />
                    <div
                        className="absolute inset-y-0 right-0 bg-board"
                        style={{ width: '48%' }}
                    />
                </>
            )}
        </div>
    );
}
