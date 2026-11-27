import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    Field,
    FieldDescription,
    FieldLabel,
    FieldTitle,
} from '@/components/ui/field';

describe('Field', () => {
    it('is a vertical group that names its control with the label', () => {
        render(
            <Field aria-label="Naam">
                <FieldLabel htmlFor="name">Naam van de editie</FieldLabel>
                <input id="name" />
                <FieldDescription>Hoogstens 40 tekens</FieldDescription>
            </Field>,
        );
        const group = screen.getByRole('group', { name: 'Naam' });

        expect(group).toHaveAttribute('data-orientation', 'vertical');
        expect(group).toHaveClass('flex-col');
        expect(
            screen.getByRole('textbox', { name: 'Naam van de editie' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Hoogstens 40 tekens').tagName).toBe('P');
        expect(screen.getByText('Hoogstens 40 tekens')).toHaveAttribute(
            'data-slot',
            'field-description',
        );
    });

    it('lays the label and control side by side when horizontal', () => {
        render(
            <Field orientation="horizontal" className="extra">
                <FieldTitle>Titel</FieldTitle>
            </Field>,
        );
        const group = screen.getByRole('group');

        expect(group).toHaveAttribute('data-orientation', 'horizontal');
        expect(group).toHaveClass('flex-row', 'items-center', 'extra');
        expect(group).not.toHaveClass('flex-col');
        expect(screen.getByText('Titel')).toHaveAttribute(
            'data-slot',
            'field-label',
        );
    });

    it('switches with the container when responsive', () => {
        render(<Field orientation="responsive" />);
        const group = screen.getByRole('group');

        expect(group).toHaveAttribute('data-orientation', 'responsive');
        expect(group).toHaveClass('flex-col', '@md/field-group:flex-row');
    });

    it('keeps the label slot and its own classes', () => {
        render(<FieldLabel className="mine">Kleur</FieldLabel>);

        expect(screen.getByText('Kleur')).toHaveAttribute(
            'data-slot',
            'field-label',
        );
        expect(screen.getByText('Kleur')).toHaveClass('w-fit', 'mine');
    });
});
