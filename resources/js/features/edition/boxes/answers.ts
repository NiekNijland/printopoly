import { isJsonObject } from '@/features/edition/remote/client';
import {
    is,
    nullable,
    number,
    oneOf,
    string,
    validItems,
    type Parser,
} from '@/lib/parse';

import type {
    BoxContributionData,
    ContributionPart,
    CreatedBox,
    OwnerBox,
} from './types';

const CONTRIBUTION_PARTS: readonly ContributionPart[] = [
    'name',
    'text',
    'town',
    'photo',
    'amount',
];

const unreadable = (what: string): never => {
    throw new Error(`The server answer is not ${what}.`);
};

const numberOrNull = nullable(number);

const stringOrNull = nullable(string);

const field: Parser<BoxContributionData['field']> = oneOf([
    'name',
    'text',
    'town',
]);

const readContribution = (value: unknown): BoxContributionData => {
    if (
        !isJsonObject(value) ||
        typeof value.id !== 'string' ||
        typeof value.elementKey !== 'string' ||
        typeof value.firstName !== 'string' ||
        !is(field, value.field) ||
        !is(stringOrNull, value.value) ||
        !is(numberOrNull, value.amount) ||
        !Array.isArray(value.open) ||
        typeof value.hasPhoto !== 'boolean' ||
        !is(numberOrNull, value.width) ||
        !is(numberOrNull, value.height) ||
        !is(stringOrNull, value.photoUrl) ||
        !is(numberOrNull, value.createdAt)
    ) {
        return unreadable('a contribution');
    }

    return {
        id: value.id,
        elementKey: value.elementKey,
        firstName: value.firstName,
        field: value.field,
        value: value.value,
        amount: value.amount,
        open: validItems(oneOf(CONTRIBUTION_PARTS), value.open),
        hasPhoto: value.hasPhoto,
        width: value.width,
        height: value.height,
        photoUrl: value.photoUrl,
        createdAt: value.createdAt,
    };
};

export const readOwnerBox = (value: unknown): OwnerBox => {
    if (
        !isJsonObject(value) ||
        typeof value.id !== 'string' ||
        typeof value.editionId !== 'string' ||
        typeof value.url !== 'string' ||
        (value.status !== 'open' && value.status !== 'closed') ||
        typeof value.expiresAt !== 'number' ||
        typeof value.accepted !== 'number' ||
        typeof value.rejected !== 'number' ||
        typeof value.cardsHidden !== 'boolean' ||
        typeof value.channel !== 'string' ||
        !Array.isArray(value.contributions)
    ) {
        return unreadable('a box');
    }

    return {
        id: value.id,
        editionId: value.editionId,
        url: value.url,
        status: value.status,
        expiresAt: value.expiresAt,
        accepted: value.accepted,
        rejected: value.rejected,
        cardsHidden: value.cardsHidden,
        channel: value.channel,
        contributions: value.contributions.map(readContribution),
    };
};

export const readCreatedBox = (value: unknown): CreatedBox => {
    const box = readOwnerBox(value);
    const secret = isJsonObject(value) ? value.ownerSecret : undefined;

    return typeof secret === 'string' ? { ...box, ownerSecret: secret } : box;
};

export const readAccountBox = (value: unknown): OwnerBox | null => {
    if (!isJsonObject(value) || !('box' in value)) {
        return unreadable('a box or none');
    }

    return value.box === null ? null : readOwnerBox(value.box);
};

export const readReceipt = (
    value: unknown,
): { id: string; receipt: string } => {
    if (
        !isJsonObject(value) ||
        typeof value.id !== 'string' ||
        typeof value.receipt !== 'string'
    ) {
        return unreadable('a receipt');
    }

    return { id: value.id, receipt: value.receipt };
};

export const readJobId = (value: unknown): { id: string } => {
    if (!isJsonObject(value) || typeof value.id !== 'string') {
        return unreadable('a job');
    }

    return { id: value.id };
};

export const readJobState = (
    value: unknown,
): { status: string; message?: string } => {
    if (!isJsonObject(value) || typeof value.status !== 'string') {
        return unreadable('the state of a job');
    }

    return typeof value.message === 'string'
        ? { status: value.status, message: value.message }
        : { status: value.status };
};

/** The first validation message the server sent, else the status text. */
export const readFailureMessage = (
    value: unknown,
    fallback: string,
): string => {
    if (!isJsonObject(value)) {
        return fallback;
    }
    const firstList = Object.values(
        isJsonObject(value.errors) ? value.errors : {},
    )[0];
    const first: unknown = Array.isArray(firstList) ? firstList[0] : undefined;
    if (typeof first === 'string') {
        return first;
    }

    return typeof value.message === 'string' ? value.message : fallback;
};
