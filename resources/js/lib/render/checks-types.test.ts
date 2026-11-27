import type { Localized } from '@/types/game';

import type {
    CheckCode,
    CheckFold,
    CheckInput,
    CheckIssue,
    IssueIcon,
    PartSelection,
    Severity,
} from './checks-types';

describe('the check types', () => {
    it('select the parts of the set the checks look at, the board among them', () => {
        expectTypeOf<keyof PartSelection>().toEqualTypeOf<
            | 'board'
            | 'titleDeeds'
            | 'cards'
            | 'money'
            | 'tokens'
            | 'boxLid'
            | 'houseRules'
        >();
        expectTypeOf<PartSelection['board']>().toEqualTypeOf<boolean>();
    });

    it('need a board, the parts and the elements, and nothing else', () => {
        type Required = {
            [
                Key in keyof CheckInput as undefined extends CheckInput[Key]
                    ? never
                    : Key
            ]: CheckInput[Key];
        };

        expectTypeOf<keyof Required>().toEqualTypeOf<
            'board' | 'parts' | 'elements'
        >();
    });

    it('give every issue a code, a severity with its icon and word, and a message in both languages', () => {
        expectTypeOf<CheckIssue['code']>().toEqualTypeOf<CheckCode>();
        expectTypeOf<CheckIssue['severity']>().toEqualTypeOf<Severity>();
        expectTypeOf<Severity>().toEqualTypeOf<'warning' | 'error'>();
        expectTypeOf<IssueIcon>().toEqualTypeOf<
            'triangle-alert' | 'octagon-x'
        >();
        expectTypeOf<CheckIssue['severityLabel']>().toEqualTypeOf<Localized>();
        expectTypeOf<CheckIssue['message']>().toEqualTypeOf<Localized>();
    });

    it('know the codes by their area', () => {
        expectTypeOf<'photo.low-resolution'>().toExtend<CheckCode>();
        expectTypeOf<'center.on-fold'>().toExtend<CheckCode>();
        expectTypeOf<'photo.too-dark'>().not.toExtend<CheckCode>();
        expectTypeOf<CheckCode>().toExtend<`${string}.${string}`>();
    });

    it('say what lies on a fold of the board centre', () => {
        expectTypeOf<CheckFold['what']>().toEqualTypeOf<
            'name' | 'photo' | 'logo' | 'layer' | 'face'
        >();
    });
});
