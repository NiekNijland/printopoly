# Typepredicaten lezen met een parser

Status: voorgesteld in stap 9 (punt 9 van de eerste after-zero backlog in `docs/archive/zero-debt-plan.md`, D-30 teruggedraaid door de eigenaar); de eigenaar keurt goed bij de merge.

## Context

De frontend had 81 zelfgeschreven typepredicaten (`x is T`), 73 buiten de tests en 38 op een waarde van type `unknown`. Een predicaat belooft het hele type, maar de compiler controleert de body niet. Een deel controleerde minder dan het beloofde: `readSent` in `features/edition/boxes/local.ts` keek alleen naar `receipt`, `isBusMessage` in `features/edition/bus.ts` nooit naar `editionId` en `revision`, `isPrintPayload` alleen naar `part` en `edition`, waardoor ook de payload van het deelplaatje als printonderdeel doorging. Een ander deel beloofde te weinig: `hasText`, `isChip` en `isString` vernauwden in de else-tak een type dat daar nog kon zitten.

## Besluit

- `resources/js/lib/parse.ts` is de enige plek die een waarde van onbekende vorm leest. Een lezer (`string`, `number`, `finiteNumber`, `text`, `boolean`, `literal`, `oneOf`, `keyOf`, `instanceOf`, `nullable`, `optional`, `array`, `dictionary`, `object`, `record`, `union`) geeft `{ ok: true, value }` of `{ ok: false, error }` met het pad naar het veld dat niet klopt. Lezers stapelen tot een lezer per type, met het type erbij (`const x: Parser<T> = record({ ... })`), zodat de compiler ziet dat elk veld van het type gelezen wordt.
- Een lezer verandert niets: hij geeft de waarde terug die hij kreeg (`array` en `dictionary` een kopie met dezelfde items). Een veld dat het type niet noemt, blijft staan en wordt niet gecontroleerd; een nieuwere server of een oudere opgeslagen rij met een veld meer leest dus nog.
- Een aanroeper gebruikt `is(lezer, x)` in een voorwaarde, `parseOrUndefined` voor één waarde en `validItems` voor een lijst waarvan de goede items blijven. Een functie als `isThemeId = (value: unknown) => is(themeId, value)` krijgt haar predicaat van de compiler, net als een filter of check die zelf vernauwt (`space.type === 'street'`).
- `is` vernauwt ook de else-tak. Bij een lezer met een extra eis (`finiteNumber`, `text(max)`) klopt dat alleen voor een invoer van type `unknown`; zo gebruikt het schema van de editie ze.
- De lintregel `predicates/no-type-predicate` (`eslint-rules/predicates.js`, met RuleTester-gevallen) faalt op elk geschreven `x is T` en `asserts x is T` buiten `resources/js/lib/parse.ts`. Een uitzondering staat bij naam en bestand in `predicateDoors`; de ratchetrij `lint-type-predicates` telt die namen en mag alleen dalen.

## De uitzondering die blijft

`isServerElements` in `resources/js/features/print/print-payload.ts` (1). De lezer van de printpagina controleert elk veld van het printonderdeel, het deelplaatje, de editie en het bordprofiel, maar van de elementen alleen dat ze een object zijn. PHP schrijft die elementen: een leeg object kan als lijst aankomen, en de foto's krijgen een `src` die het schema van de browser niet kent. Een strenge lezer zou daar een PDF laten falen die nu goed wordt. De uitzondering gaat weg met een lezer per element die de vorm van PHP volgt, en een test die de payload van `PrintHtmlBuilder` door die lezer haalt.

## Gevolgen

Geldige data leest als voorheen. Data met de verkeerde vorm wordt nu geweigerd in plaats van doorgelaten:

- IndexedDB: een foto of printjob met een ontbrekend veld of een veld van het verkeerde type (ook `preview` en `fileName`) valt uit de lijst.
- localStorage: een verzonden bijdrage zonder alle velden valt uit de lijst; een opgeslagen lijst in plaats van een object leest als geen printmarkeringen; een lijst in plaats van een sectie in de publieke config leest als geen sectie.
- BroadcastChannel: een bericht `saved` of `deleted` zonder `editionId` of `revision` wordt niet doorgegeven.
- API: de printstatus per editie met een veld van het verkeerde type wordt overgeslagen.
- Printpagina: een payload die een veld mist of een veld van het verkeerde type heeft, eindigt in de fout "The print page has no data." in plaats van een halve render.
