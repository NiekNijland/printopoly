# Feedback ronde 3: oma Ria maakt kerstcadeaus voor de kleinkinderen (desktop 1440x900)

Persona: Ria, 71, Nederlands, niet technisch, leest langzaam. Wil met kerst drie spellen geven aan haar kleinkinderen: over haar dorp, over de familie (veel familiefoto's, pionnen met de namen van de kleinkinderen) en over de favoriete plekken van haar overleden man Henk. Houdt van Klassiek. Print thuis op een inkjet (Thuisprint-set).

Gemaakt (alle drie op https://printopoly.nl/nl, thema Klassiek, taal Nederlands, munt euro, Thuisprint-set gemaakt):

1. **Ons dorp Lutten**. Sjabloon "Je dorp of wijk". 10 vakken hernoemd (Oude Kerkstraat, Molenweg, Bakker Jansen, Sint-Joriskerk, Camping Zeeland, Visvijver en meer), 6 vakken met foto (waaronder een piepkleine foto van 160 px en een foto van 6000 px), plaatsnaam "Lutten", 3 kaarten herschreven. Geprint: bord (7 vellen A4) en kaarten + eigendomsbewijzen (16 pagina's), twee keer gemaakt om de links te halen.
2. **Familiespel van Oma Ria**. Sjabloon "Familie" (heeft speelgeld, pionnen en huisregels al aan). 5 vakken hernoemd met foto (Huize Van den Berg, Oma's keuken, Opa Henk's schuur, De caravan in Zeeland, De tuin van tante Ria), 5 pionnen met naam en foto (Emma, Lars, Sophie, Noah, Fleur), 3 overbodige pionnen weggehaald. Geprint: bord, kaarten, speelgeld (35 pagina's, 17 MB), pionnen.
3. **Opa Henks mooiste plekken**. Sjabloon "Leeg". 12 vakken hernoemd (De Visvijver van Henk, Het bankje bij de molen, Café De Gouden Leeuw, Voetbalclub Lutten, Camping Zeeland, Het stadion in Enschede, enzovoort), 8 met foto. Samen-maken-link aangemaakt (alleen bekeken). Geprint: bord en kaarten.

Opmerking over de test: ik heb de foto's gegenereerd (gradient, twee gezichten als cirkels, tekst). Ik heb niet echt als Ria met een muis geklikt, maar met een script. Wat over wachttijd en taal gaat, schat ik dus vanuit de schermen.

## Samenvatting

De site voelt vrolijk en netjes. De sjablonen, het voorbeeld ("Voorbeeld" met het hele bord) en de PDF's zien er goed uit. Het maken van een dorpsspel ging snel: foto op een vak zetten is makkelijk en de laadtijd van een grote foto was kort. Het printen duurde 30 tot 60 seconden per set, veel sneller dan gedacht. Het mooiste: pionnen met naam en foto, en de Voorbeeld-weergave van het bord. De grootste problemen voor Ria: (1) een foto op een straat komt wel op het bord maar niet op het eigendomsbewijs, dus ze moet alles dubbel doen en weet dat niet, (2) veel jargon (dpi, vinylsticker, uitlijntest, "gespiegeld", "variabelen") voor iemand van 71, en (3) de Thuisprint-set is op een inkjet veel werk: 35 vellen speelgeld en 7 vellen losse stickers die je zelf moet knippen. De printpagina onthoudt de klaar-status niet, terwijl hij zegt "bewaar deze link".

## Werkt niet (bugs)

1. **Printpagina na herladen: bestanden weg.** Waar: `/nl/editions/<id>/print`. Na "2 van 2 klaar" staat er "Je kunt deze pagina sluiten. De bestanden staan 7 dagen klaar. Bewaar deze link om ze terug te vinden." Ik opende dezelfde link opnieuw (zelfde browser, zelfde profiel): "0 van 2 klaar", alles weer "nog niet gemaakt". Verwacht: de gemaakte bestanden terugvinden. Ernst: hinderlijk (Ria sluit de pagina, komt morgen terug, moet opnieuw wachten; bij het speelgeld is dat zwaar). Stappen: Thuisprint-set maken, wachten, pagina herladen. Screenshot: `img/oma-ria/p1-done.jpg` (de klaar-status vooraf).
2. **Bewerking vlak voor sluiten gaat verloren.** Waar: editor. Ik veranderde een vaknaam en sloot de browser 0,3 seconde later: bij heropenen stond de oude naam er weer. Met 2,5 seconde wachten bleef de naam staan. Verwacht: opslaan zodra je typt of bij sluiten. Ernst: klein (een mens sluit niet zo snel, maar bij een tab sluiten direct na typen kan het). Stappen: naam typen, direct tab sluiten. Geen screenshot (alleen in de data te zien).
3. **Titel in het kleine bord afgekapt.** Waar: editor, Editie, mini-bord links. "Opa Henks mooiste plekken" staat in het kleine bord als "Opa Henks mooiste ple...", terwijl het grote voorbeeld en de PDF de hele titel tonen. Verwacht: gelijk. Ernst: klein. Screenshot: `img/oma-ria/e3-edition.jpg`.
4. **Pionnenkop in de PDF.** Waar: Pionnen-PDF van edities 2. Kop zegt "Pionnen 1 t/m 8", terwijl er maar 5 pionnen op het vel staan (ik had er 3 weggehaald). Ernst: klein. Screenshot: `img/oma-ria/e2t-1.jpg`.
5. **Menu "Pion weghalen" overlapt de waarschuwing.** Waar: Doos, pion, knop met drie puntjes. Het menu hangt over de gele waarschuwing en leest slecht. Ernst: klein. Screenshot: `img/oma-ria/e2-pion-menu.jpg`.
6. **"Bord vergroten" doet iets anders dan de naam zegt.** Waar: editor, knop onder het mini-bord. Het zoomt in op een hoek van het mini-bord links en snijdt het af, geen groot bord. Ik verwachtte een groot bord. (Dat bestaat wel, onder "Voorbeeld".) Ernst: hinderlijk, verwarrend. Screenshot: `img/oma-ria/11-bord-groot.jpg`.

Console: geen eigen fouten van de site. Alleen een Bugsnag-sessie die niet verstuurd kon worden (`Request failed with status 0`) en een geweigerde verbinding bij het eerste bezoek.

## UX: wat kan beter

1. **Foto komt niet op het eigendomsbewijs.** Waar: editor, "Vak" en "Eigendomsbewijs" zijn twee tabs met elk een eigen "Afbeelding: Geen / Foto". Ik zette de kerkfoto op het vak, op het eigendomsbewijs stond "Geen" en in de PDF zijn de kaarten kaal (zie `img/oma-ria/e1c-montage.jpg`). Ria verwacht de kerkfoto ook op de kaart. Voorstel: bij een foto op het vak vraag "Ook op het eigendomsbewijs zetten?" of neem hem standaard over, met een schakelaar.
2. **Foto toevoegen kost twee stappen.** Eerst "Foto" kiezen, dan "Foto kiezen". Voor Ria niet vanzelfsprekend. Voorstel: één knop "Foto toevoegen" die direct de bestandskiezer opent. Screenshot: `img/oma-ria/06-editor1.jpg`.
3. **Jargon.** Voorbeelden: "Resolutie 1984 dpi, scherp genoeg", "De foto heeft 102 dpi op dit formaat" (`img/oma-ria/14-klein.jpg`), "Bestel als vinylsticker op maat, wit, mat gelamineerd, herpositioneerbaar" (Drukkerij-set), "uitlijntest", "omslaan over de lange kant", "gespiegeld", "Namen van vakken zijn variabelen" bij de tekstkaarten (`img/oma-ria/17-kaarten.jpg`), "Afloop". Voorstel: gewone woorden, bijvoorbeeld "Deze foto is te klein en wordt wazig in print. Kies een grotere foto."
4. **Printpagina begint op Drukkerij-set.** Ria print thuis; zij ziet eerst "vinylsticker op maat" en moet zelf op Thuisprint-set klikken (`img/oma-ria/22-print.jpg`). Voorstel: onthoud de keuze, of vraag bij de start in de editor "Waar print je?".
5. **Aantal vellen niet duidelijk.** "7 vellen A4 · dubbelzijdig, 9 kaarten per vel" is 16 pagina's (2 voor de test). Ria denkt: 7 vellen. Voorstel: één zin "Je print 16 pagina's, op 8 vellen papier als je dubbelzijdig print".
6. **Speelgeld is zwaar voor thuis.** Het speelgeld is 35 A4's en 17 MB. Op een inkjet is dat veel inkt. Voorstel: bij Thuisprint-set kies je zelf welke biljetten en hoeveel, of een lichte versie (zwart-wit/ minder achtergrond) of de tip "gebruik je eigen speelgeld".
7. **Thuisprint-bord is veel knipwerk.** 4 grote vlakken plus ongeveer 40 losse stickers (`img/oma-ria/e1b-montage.jpg`). Voorstel: leg vooraf uit dat het ruim een avond kost, of toon een eerlijke inschatting in de printpagina.
8. **Veel vakken om te hernoemen.** Er zijn 41 vakken; een dorpsspel van 28 straten kost Ria lang. Voorstel: toets pijl-omlaag/Enter om naar het volgende vak te gaan met de naam al geselecteerd. Ook handig: een lijst-weergave waarin ze alle namen onder elkaar kan typen.
9. **De teller "Bord 0/41" en "Kaarten 3/35".** Wat telt hij? Ik gok: aangepast. Voor Ria niet duidelijk. Voorstel: "12 van 41 vakken aangepast".
10. **Kleinkinderen.** In het familiesjabloon zijn er standaard 8 pionnen en waarschuwt Controle op elke pion zonder foto. Ria heeft 5 kleinkinderen. Ze moet zelf 3 pionnen weghalen via het drietjesmenu. Voorstel: vraag in het begin "Hoeveel spelers?" of laat Controle de waarschuwing pas laten zien na wijziging.
11. **Samen maken.** De link is makkelijk, maar de tekst "De link en alles wat erin zit verdwijnen op 21 december" komt onverwacht. Voor een kerstcadeau zou Ria dat het liefst eerder weten. Screenshot: `img/oma-ria/e3-samen.jpg`.

## Ontwerp

Mooi:
- Homepage, sjabloonkiezer en de printpagina zien er levendig en netjes uit (`img/oma-ria/02-new.jpg`, `img/oma-ria/03b-form.jpg`).
- "Voorbeeld" toont het bord echt mooi, met gele lint, foto's op de vakken en pijl-iconen (`img/oma-ria/12-voorbeeld.jpg`).
- Kaarten en eigendomsbewijzen in de PDF zijn rustig en leesbaar: groot lettertype, kleurbalk bovenaan, hypotheek op de achterkant (`img/oma-ria/e1c-montage.jpg`, `img/oma-ria/e3-montage.jpg`).
- Pionnen met naam en foto zien er leuk uit, alleen klein (`img/oma-ria/e2t-1.jpg`).
- Foto-drukwerk op het bord is scherp (6000 px foto ging goed, geen vertraging).

Goedkoop of niet af:
- De foto op een straatvak is klein op het printbord (ongeveer 12 mm). Mijn gezichtjes zijn nauwelijks te zien. Ria's familiefoto's gaan weinig opvallen.
- Waar een foto staat, komt de beeldtekst ("Kerk Sint-Joris") dwars over het plaatje te staan, naast de eigen naam van het vak. Mijn testfoto's zaten vol tekst, dat is mijn eigen schuld; maar de lange naam "Huis van de burgemeester" wordt op het bord wel erg klein.
- De vier grote middenstukken van het thuisbord zijn grote vlakken effen groen met een stuk lint in het midden (`img/oma-ria/e1b-montage.jpg`): veel inkt voor weinig.
- Speelgeld lijkt op echt (klassiek). Mooi, alleen zijn de eerste vier pagina's allemaal 1-euro-biljetten.
- Preview-tekst in de editor (Vak) is zeer groot en leeg: de vakkaart neemt veel ruimte in met weinig informatie (`img/oma-ria/06-editor1.jpg`).

## Features die ik zou willen

- **Foto automatisch op vak en eigendomsbewijs** (of met één klik naar beide). Waarom: Ria wil één familiefoto per straat, niet twee keer uploaden. Must.
- **Meerdere foto's tegelijk slepen** en de site verdeelt ze over vakken (op volgorde). Waarom: Ria heeft een map met 30 foto's van de familie. Must.
- **Foto rechtstreeks van de telefoon** (QR-code of Samen maken voor foto's van het kleinkind). Waarom: haar foto's staan op haar telefoon, niet op haar computer. Nice (Samen maken is er al, maar niet voor eigen foto's van de eigenaar).
- **Pionnen: aantal spelers kiezen** bij het begin. Waarom: 5 kleinkinderen, geen 8 pionnen. Nice.
- **Eerlijke inschatting van printen en knippen** per set, met een tip "kan ik dit beter laten drukken". Waarom: Ria weet niet dat 35 vellen speelgeld veel is. Must voor een thuisprinter zonder ervaring.
- **Print de klaar-status bewaren** (ook zonder account) en een e-mail of een eigen link. Waarom: bij 17 MB wil je niet opnieuw wachten. Must.
- **Cadeauversie**: een kaartje of omslag met "Voor Emma, Lars en Sophie, van Oma, kerst 2026" op het doosdeksel of de huisregels. Waarom: het is een kerstcadeau. Nice.
- **Grotere letters / eenvoudige modus** op de site voor ouderen. Waarom: Ria leest langzaam; veel teksten zijn klein (het kleine grijze hulptekst in de editor). Nice.
- **Een vrij verhaalveld bij elk vak**, dat op het eigendomsbewijs komt ("Henk viste hier elke zondag"). Waarom: de verhalen bij de plekken zijn het cadeau. Nu kan dat alleen via de kleine regel Plaats. Must voor haar.

## Wat goed werkte

- Sjablonen met een duidelijke eerste keuze, naam en onderdelen op één scherm.
- Opslaan zonder account werkt, ook na sluiten van de browser (editie bleef staan).
- Foto's uploaden van 160 px tot 6000 px: geen crash, de te kleine foto kreeg een duidelijke gele waarschuwing en "Controle" telde hem mee.
- Printen: 30 tot 60 seconden voor bord en kaarten, ruim een minuut voor de volledige set met speelgeld. De PDF's openen goed en hebben de juiste namen, bedragen en euro-teken.
- Instructies per onderdeel (PDF van één pagina) in begrijpelijk Nederlands, behalve het jargon hierboven.
- "Voorbeeld" en "Controle" geven vertrouwen voordat je print.
