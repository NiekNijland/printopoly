# Feedback ronde 6: opa met oude dorpsfoto's (iPad staand, 820 × 1180)

Persona: Kees, 68, gepensioneerd onderwijzer. Hij werkt rustig en precies op zijn iPad, staand. Hij maakt een spel van zijn dorp met oude, ingescande foto's (klein, korrelig, liggend en staand), een familiespel en een klassenspel. Hij komt later terug om ze te vinden en af te maken. Hij print thuis op A4, ook het doosdeksel.

Gemaakt:

- Westerbroek zoals het was. Sjabloon Dorp of wijk via de landingspagina, thema Klassiek, Nederlands, euro. Alle 28 namen zelf getypt. Foto's op 10 vakken (staand, liggend, één heel kleine scan van 320 × 220 px), één staande foto met Hele vak, een foto over het hele midden, een extra foto in het midden, eigen ondertitel. Doosdeksel met foto en eigen regel. Geprint (Thuisprint-set): proefvel, bord, kaarten en eigendomsbewijzen, doosdeksel, spelregelboekje.
- Familie de Boer. Sjabloon Familie, eerst Klassiek, later in de editor naar Riso. De eerste keer de helft van de namen en drie gezichten. Later via Verder met teruggekomen en afgemaakt: alle namen, Naam met foto in het midden, 8 pionnen met naam (5 met foto), deksel met foto en "Kerst 2026". Geprint: bord, kaarten, pionnen, doosdeksel.
- Klas 6 van meester Kees, 1985. Leeg, thema Strak, munt M. 22 straatnamen in één keer geplakt in het zoekveld, 8 pionnen met namen van leerlingen. Geprint: bord, kaarten, pionnen.

## Samenvatting

Dit voelde als een af product. Ik kon alle drie de spellen maken zonder vast te lopen, en de PDF's zien er netjes uit. Het mooiste vond ik het dorp: de foto over het hele midden, de foto's op de vakken en de kaartteksten die vanzelf mijn eigen namen gebruiken ("Er wordt getrakteerd bij De Smederij"). Het deksel past nu op twee vellen A4, en dat was voor mij de reden om het te proberen. Het grootste probleem is de melding "te klein" bij mijn foto's. Mijn scan van 3000 × 2000 px krijgt die melding in het midden, en ik weet niet hoe groot een foto dan wel moet zijn. Verder zijn het kleine dingen.

## Werkt niet (bugs)

1. Bij Hele vak klopt de maat niet. Waar: vak Het Dorpshuis, staande foto, Hele vak gekozen. Wat gebeurde: de tekst bleef "Op het bord is de foto ongeveer 37 bij 36 mm", net als bij In kader. In de PDF is de foto duidelijk groter (bijna het hele vak). Verwacht: de maat van Hele vak. Ernst: klein. Stappen: open een straat, kies Foto, kies Hele vak, lees de regel onder Zwart-wit. Screenshot: `img/opa-kees/06-hele-vak-maat.jpg`.

2. Tikken op "niet in je set" doet niets. Waar: editor, tab Doos, de grijze knop "niet in je set" naast Doosdeksel, Pionnen en Uitnodiging. Wat gebeurde: het ziet eruit als een knop (het is ook een button), maar er gebeurt niets bij een tik. Verwacht: uitleg dat je het op de printpagina aanzet, of een link daarheen. Ernst: klein. Screenshot: `img/opa-kees/10-deksel-foto.jpg`.

3. Bij één poging kwam de fotoknop niet. Waar: editor familie, direct na een foto op het ene vak het volgende vak openen en Foto kiezen. De foto kwam niet op Het familiefeest, wel op het vak erna. Ik kon het niet nog eens laten gebeuren, dus misschien lag het aan mij. Ernst: klein, niet zeker.

## UX: wat kan beter

1. De melding "Te klein, wordt korrelig op papier" zegt niet wat ik moet doen. Mijn foto van De Brink is 3000 × 2000 px. Over het hele midden (ongeveer 33 cm) krijgt hij de melding, en op de printpagina staat hij bij "Nog even nakijken". Een kerkfoto van 1200 × 800 px op het deksel krijgt hem ook. Ik heb oude foto's, groter worden ze niet. Voorstel: zeg hoeveel pixels nodig zijn ("voor het midden is 3500 px breed mooi"), of zeg eerlijk dat het op papier wat zachter wordt maar wel kan. Nu klinkt het alsof ik iets fout doe. Screenshots: `img/opa-kees/07-foto-hele-midden.jpg`, `img/opa-kees/11-printpagina.jpg`.

2. Een melding bij de kleine scan staat in gewone grijze tekst onder de knoppen. Ik zag hem pas toen ik zocht. Bij het vak in de lijst staat wel een driehoekje. Voorstel: de melding in het paneel dezelfde gele kleur geven als op de printpagina. Screenshot: `img/opa-kees/05-kleine-foto-melding.jpg`.

3. Op het deksel heet de keuze ook "In kader / Hele vak". Een deksel is geen vak. Bij een pion staat ook "of Hele vak voor de grootste foto". Voorstel: daar "Hele deksel" of "Hele pion".

4. De ondertitel op het deksel is "Een spel voor 2 tot 8 spelers", ook als ik op het bord een eigen ondertitel heb ("Ons dorp in de jaren vijftig"). Ik verwachtte dat het deksel die zou overnemen. Voorstel: het deksel begint met de ondertitel van het bord.

5. Op de printpagina staat na het printen "Bewaar deze link om ze terug te vinden". Welke link? De link van de pagina in de adresbalk, of de ZIP? Voorstel: een knop "Link kopiëren" ernaast, of zeggen dat je ze ook via Mijn edities terugvindt.

6. Het proefvel zit niet in de ZIP. Dat is logisch als je het eerst apart print, maar ik zocht het er later wel in. Voorstel: in de ZIP een regel in het bestelblad of een los bestand.

7. Plakken in het zoekveld werkt nu (R5-10 is opgelost). De melding "22 namen ingevuld. 11 vakken van een andere soort zijn overgeslagen" begreep ik niet. Welke 11? Voorstel: "Ingevuld op de 22 straten. Stations en nutsbedrijven heb ik laten staan." Screenshot: `img/opa-kees/14-plakken-in-zoekveld.jpg`.

8. In de lijst met pionnen zie je niet wie al een foto heeft. Alle pionnen hebben hetzelfde lege rondje. Voorstel: de foto klein in dat rondje. Screenshot: `img/opa-kees/17-pion-met-foto.jpg`.

9. Het zoekveld zegt "Zoek een vak of plak nam", de laatste letters vallen weg op 820 px. Klein, maar het oogt slordig.

10. "Bewaard op dit toestel. Safari wist het als je de site 7 dagen niet opent." stond één keer bovenaan in de editor. Dat schrikt mij af: ik kom misschien pas over twee weken terug. Mijn edities zegt het rustiger. Voorstel: in de editor dezelfde rustige zin als op Mijn edities, met wat je ertegen kunt doen. Screenshot: `img/opa-kees/03-namen-getypt.jpg`, linksboven.

## Ontwerp

Mooi:

- De landingspagina en Nieuwe editie zien er vrolijk en verzorgd uit. "Mijn edities" heeft nu tekst bij het mapje.
- De foto over het hele midden in de editor en in de PDF: hij loopt door tot de rand en de kaartstapels staan er als stippellijn op. Erg mooi met een oude foto.
- Naam met foto zet de foto recht in het vrije vak. Oma Annie staat nu rechtop en groot. Screenshot: `img/opa-kees/16-naam-met-foto.jpg`.
- Het bord in de kleine weergave: foto's blijven in hun vak.
- Deel je bord laat nu mijn echte bord zien, met foto's en de kop "Onze eigen editie". Screenshot: `img/opa-kees/18-deel-je-bord.jpg`.
- Het proefvel toont Start en mijn eerste vak met euro. Screenshot: `img/opa-kees/22-pdf-proefvel.jpg`.
- Het deksel op twee A4-vellen met een strook om over elkaar te leggen, en de ondertitel is nu goed leesbaar. Screenshot: `img/opa-kees/20-pdf-deksel-bestelblad.jpg`.

Minder mooi:

- Op het eigendomsbewijs vult een liggende foto de hele strook, maar een staande foto wordt een klein vierkantje in het midden met veel wit ernaast (De Smederij). Naast elkaar ziet dat ongelijk uit. Screenshot: `img/opa-kees/25-pdf-eigendomsbewijs-foto.jpg`.
- Op het kleine bord staan de zwarte puntjes voor "aangepast" over de hoek van mijn foto's. Met veel foto's wordt het druk. Screenshot: `img/opa-kees/06-hele-vak-maat.jpg`.
- Bord vergroten ("Kies een vak") op de staande iPad: het bord staat bovenin en de onderste helft van het venster is leeg. Screenshot: `img/opa-kees/09-kies-een-vak.jpg`.
- De naad van het deksel loopt dwars door de titel. Bij het plakken moet ik de letters precies laten aansluiten. Kan de naad buiten de titel vallen, bijvoorbeeld door het deksel liggend in twee stukken te knippen?
- Bij thema Strak zijn de vier vellen van het midden bijna helemaal wit. Dat zijn vier dure stickervellen voor een wit vlak. Screenshot: `img/opa-kees/24-pdf-klas6-strak.jpg`.
- De plaatjes bij de sjablonen op Nieuwe editie lijken allemaal op elkaar, alleen de achtergrondkleur verschilt. Ik zie niet wat een Dorp-bord anders maakt dan een Familie-bord. Screenshot: `img/opa-kees/02-nieuwe-editie.jpg`.
- Het spelregelboekje heeft op de voorkant geen foto, ook al heb ik een dekselfoto. Screenshot: `img/opa-kees/21-pdf-boekje.jpg`.

## Features die ik zou willen

1. Een verhaal bij elke straat. De huisregel van het dorpssjabloon zegt al "Wie een straat koopt, vertelt wat er in het echt gebeurde". Ik wil dat verhaal zelf opschrijven, één of twee zinnen, op de achterkant van het eigendomsbewijs of achterin het boekje. Voor een dorpsspel met oude foto's is dat het halve plezier. Belangrijk: must.
2. Hulp bij oude foto's: zeggen hoe groot een scan moet zijn (dpi bij het scannen), en een knop om een vergeelde foto wat op te frissen naast Zwart-wit. Belangrijk: nice.
3. In Mijn edities en bij Verder met zien welke editie nog niet af is of nog niet geprint. Nu staat alleen "30 aangepast". Belangrijk: nice.
4. De dekselfoto ook op de voorkant van het spelregelboekje. Belangrijk: nice.
5. Bij Naam met foto ruimte voor twee of drie foto's (opa en oma samen, de kleinkinderen). Belangrijk: nice.

## Wat goed werkte

Controle van de punten uit ronde 5 die bij mij horen:

- R5-01 opgelost: staande foto's (molen, smederij, dorpshuis) geven geen valse melding meer.
- R5-02 opgelost: Foto over het hele midden zet de gekozen foto er meteen op.
- R5-04 opgelost: Naam met foto staat recht en groot.
- R5-06 opgelost: op het kleine bord blijven foto's in hun vak.
- R5-07 opgelost: Extra foto erop komt naast de hoofdfoto, niet erop.
- R5-08 opgelost: bij het deksel staat "Op het deksel is de foto ongeveer 243 bij 120 mm". Wel nog "Hele vak" als keuze (zie UX 3).
- R5-09 opgelost: de kleine scan geeft één melding.
- R5-10 opgelost: plakken in het zoekveld vult de straten.
- R5-20 opgelost: Dorp of wijk begint met bord en kaarten, de editor zegt meteen "niet in je set".
- R5-22 opgelost: Nieuwe editie zei "M (geen echte munt), zoals de vorige keer".
- R5-23 opgelost: Mijn edities heeft tekst, Verder met toont alle drie, de opslagtekst is rustig. Screenshot: `img/opa-kees/15-verder-met.jpg`.
- R5-24 opgelost: Deel je bord toont het echte bord.
- R5-26 opgelost: proefvel met euro en "print dan de rest".
- R5-27 opgelost: een tik op de naam van een onderdeel zet het vinkje aan.
- R5-29 opgelost: deksel op A4, boekje zegt "het speelgeld neem je uit je eigen spel", de kaartenrij zegt "16 pagina's, dubbelzijdig 8 vellen", ondertitel op het deksel groter.
- R5-30 opgelost: het boekje zegt "zet er twee nietjes in".

Verder: printen ging snel (9 tot 27 seconden per set), de bewerkingen bleven bewaard na herladen, en via Verder met vond ik mijn familiespel meteen terug.
