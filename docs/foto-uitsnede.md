# Foto-uitsnede en resolutie

Gedeelde afspraak tussen de editor (TypeScript, `resources/js/lib/photos/resolution.ts`) en de printjob (PHP, B61). Beide rekenen met dezelfde formules en moeten dezelfde getallen geven. De TypeScript-tests zijn de referentie; de PHP-job krijgt dezelfde testgevallen.

## Invoer

- `W`, `H`: pixels van de originele foto na EXIF-oriëntatie. De job draait de foto eerst rechtop (`autoOrient`) en snijdt daarna.
- Transform per plaatsing, genormaliseerd opgeslagen: `x`, `y` (0 tot 1), `scale` (1 tot 3), `rotation` (0, 90, 180 of 270 graden met de klok mee) en `grayscale`.
- `tw`, `th`: doelgebied in mm, met afloop. Voor een volle foto is dat kader plus 2 × afloop (3 mm), voor een foto in een kader het kader plus de afloop van die plaatsing.

## Formules

1. Gedraaide foto: `Wr, Hr` = `W, H` bij 0 en 180, en `H, W` bij 90 en 270.
2. mm per pixel bij 100% (vullend): `cover = max(tw / Wr, th / Hr)`.
3. mm per pixel van deze plaatsing: `k = cover × scale`.
4. Effectieve resolutie: `dpi = 25,4 / k`.
5. Zichtbaar gebied in de gedraaide foto, in pixels: breedte `vw = tw / k`, hoogte `vh = th / k`, linkerboven `(x × Wr − vw / 2, y × Hr − vh / 2)`.
6. Normaal ligt dat gebied binnen de foto, want de editor houdt `x` en `y` binnen `[vw / 2 / Wr, 1 − vw / 2 / Wr]` (en voor `y` analoog). Is `vw >= Wr`, dan geldt `x = 0,5`. De job begrenst het gebied op `[0, Wr] × [0, Hr]` om afrondingsruis op te vangen.

## Uitsnede

1. Zet de hoeken van het zichtbare gebied terug naar de originele foto (zonder draaiing):
   - 0: `(u, v) → (u, v)`
   - 90: `(u, v) → (v, H − u)`
   - 180: `(u, v) → (W − u, H − v)`
   - 270: `(u, v) → (W − v, u)`

   Neem van de twee hoeken het minimum en maximum als rechthoek.
2. Maak er hele pixels van: `links = floor(x + 1e-6)`, `boven = floor(y + 1e-6)`, `rechts = ceil(x + w − 1e-6)`, `onder = ceil(y + h − 1e-6)`, begrensd op `[0, W] × [0, H]`.
3. Snij die rechthoek uit de originele foto.
4. Draai de uitsnede `rotation` graden met de klok mee.
5. Als `grayscale`: zet om naar grijstinten.
6. Schaal naar de uitvoermaat. Nooit opschalen:
   - `uitvoer-dpi = min(300, dpi)`
   - `uitvoer-breedte = round(tw / 25,4 × uitvoer-dpi)`, `uitvoer-hoogte = round(th / 25,4 × uitvoer-dpi)`, minimaal 1.

Het maximum van 300 dpi geldt inclusief afloop (B61). `dpi` uit stap 4 is de waarde vóór dat maximum; de editor en de Controle gebruiken die.

## Passend (B168)

Een plaatsing met `fit: true` rekent met "contain" in plaats van "cover":

- mm per pixel bij 100%: `contain = min(tw / Wr, th / Hr)`, en `k = contain × scale`. `scale` mag van 0,5 tot 3.
- Het midden blijft op de foto: is `vw / 2 / Wr` kleiner dan 0,5, dan ligt `x` tussen `vw / 2 / Wr` en `1 − vw / 2 / Wr`, anders is `x` 0,5. Voor `y` net zo. Dit geldt ook voor vullend: een plaatsing die voor een ander kader is gemaakt (de foto van een straat op het eigendomsbewijs, B157) of een start op een derde van boven schuift terug op de foto in plaats van af te kappen.
- Uitsnede: het zichtbare gebied begrensd op de foto, zoals hierboven.
- Uitvoermaat: het zichtbare deel op zijn eigen maat, `breedte = (u2 − u1) × k`, `hoogte = (v2 − v1) × k` in mm, bij dezelfde uitvoer-dpi. De printpagina zet die uitsnede heel en in het midden van het kader (`object-fit: contain`); de rest is het papier van het element.
- Controle meldt bij Passend niet dat de foto het kader niet bedekt.

## Controle (B94)

- Neutraal vanaf 150 dpi, een waarschuwing eronder. Er wordt vergeleken op de afgeronde waarde die de gebruiker ziet: 149,6 telt als 150.
- De foto bedekt het doel niet als het zichtbare gebied buiten de foto valt, bijvoorbeeld bij `scale` onder 1.

## Voorbeeld

Foto 4000 × 3000 px, doel 80 × 60 mm, `scale` 2, `x` en `y` 0,5, geen draaiing:
`cover = max(80 / 4000, 60 / 3000) = 0,02`, `k = 0,04`, `dpi = 635`, zichtbaar gebied 2000 × 1500 px vanaf (1000, 750). Uitvoer: 300 dpi, 945 × 709 px.

## Preview

De browser maakt bij upload een WebP-preview met de lange zijde op 1600 px (nooit groter dan het origineel), na EXIF-oriëntatie. De server maakt dezelfde preview en een printbron van hooguit 8000 px (B61). Hoe `W` en `H` in de editor aan de breedte en hoogte van de preview verhouden, maakt voor de transform niets uit, want `x` en `y` zijn genormaliseerd. Voor de dpi rekent de editor met de pixelmaat van het origineel, niet die van de preview. Snijdt de job uit de printbron van 8000 px in plaats van uit het origineel, dan zijn `W` en `H` die van de bron; het beeld blijft hetzelfde.
