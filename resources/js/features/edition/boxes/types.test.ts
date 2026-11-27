import type {
    BoxContributionData as WireContribution,
    Locale,
    OwnerBoxData,
} from '@/types/generated';

import type {
    BoxContributionData,
    BoxSnapshot,
    ContributionPart,
    CreatedBox,
    FriendBox,
    OwnerBox,
} from './types';

describe('the box types', () => {
    it('name every field the server sends for a box, and only those', () => {
        expectTypeOf<keyof CreatedBox>().toEqualTypeOf<keyof OwnerBoxData>();
        expectTypeOf<keyof OwnerBox>().toEqualTypeOf<
            Exclude<keyof OwnerBoxData, 'ownerSecret'>
        >();
        expectTypeOf<keyof BoxContributionData>().toEqualTypeOf<
            keyof WireContribution
        >();
    });

    it('narrow the wire types without widening them', () => {
        expectTypeOf<OwnerBox>().toExtend<Omit<OwnerBoxData, 'ownerSecret'>>();
        expectTypeOf<BoxContributionData>().toExtend<WireContribution>();
        expectTypeOf<OwnerBox['status']>().toEqualTypeOf<
            OwnerBoxData['status']
        >();
    });

    it('keep the owner secret only on the answer that creates a box', () => {
        expectTypeOf<CreatedBox['ownerSecret']>().toEqualTypeOf<
            string | undefined
        >();
        expectTypeOf<OwnerBox>().not.toHaveProperty('ownerSecret');
    });

    it('give a friend a replaced link, a language and no photos of the edition', () => {
        expectTypeOf<FriendBox['status']>().toEqualTypeOf<
            'open' | 'closed' | 'replaced'
        >();
        expectTypeOf<FriendBox['language']>().toEqualTypeOf<Locale>();
        expectTypeOf<keyof BoxSnapshot['elements'][string]>().toEqualTypeOf<
            'name' | 'text' | 'town' | 'added'
        >();
    });

    it('let a contribution propose the five parts the owner decides on', () => {
        expectTypeOf<ContributionPart>().toEqualTypeOf<
            'name' | 'text' | 'town' | 'photo' | 'amount'
        >();
        expectTypeOf<BoxContributionData['open']>().toEqualTypeOf<
            ContributionPart[]
        >();
        expectTypeOf<
            BoxContributionData['field']
        >().toExtend<ContributionPart>();
    });
});
