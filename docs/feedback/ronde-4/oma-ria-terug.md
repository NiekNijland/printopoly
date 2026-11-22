# Feedback ronde 4: oma Ria komt terug voor kerst, dorp en een cadeau voor de buurvrouw (desktop 1440x900)

Persona: Ria, 71, Nederlands, niet technisch, leest langzaam. Was in ronde 3 al op de site. Nu wil ze een kerstspel voor de familie (veel foto's, pionnen met de kleinkinderen), een dorpsspel en een cadeau voor haar buurvrouw. Ze print thuis en wil het geld klein houden.

Opmerking over de test: ik heb met een script (headless Chrome) geklikt, niet met een echte muis. De foto's zijn gegenereerd (kleurverloop, gezichtjes als cirkels, soms met een bijschrift in het plaatje). Wat over lezen en wachten gaat, schat ik vanuit de schermen. Ik heb geen Samen maken-link gemaakt.

Gemaakt (alle drie op https://printopoly.nl/nl, taal Nederlands, munt euro):

1. **Kerst bij Oma Ria 2026**. Sjabloon Familie, thema Klassiek. 12 vakken hernoemd (Huize aan de Dorpsstraat, Oma Ria's keukentafel, De logeerkamer van Emma, De caravan in Zeeland en meer), 8 vakken met familiefoto, 5 pionnen met naam en foto (Emma, Lars, Sophie, Noah, Fleur), Aantal pionnen op 5, een eigen Kans-kaart, twee regels erbij in de huisregels, bij drie eigendomsbewijzen een Verhaal. Hoeveel geld op "Per set" (thuis 2 tot 4 spelers) gelaten. Geprint: Thuisprint-set met bord (7 vellen), kaarten (16 pagina's), speelgeld (24 pagina's, 11,9 MB) en pionnen. Daarna nog een keer, na de verhalen.
2. **Ons dorp Lutten**. Sjabloon Je dorp of wijk, thema Klassiek. 10 namen in één keer geplakt (Oude Kerkstraat, Molenweg, Bakker Jansen, Sint-Joriskerk, Camping Zeeland, Visvijver en meer), 8 vakken met foto (waaronder een piepkleine van 160 px en een van 6000 px), plaatsnaam Lutten. Geprint: Thuisprint-set met bord (7 vellen) en kaarten (16 pagina's).
3. **Buurvrouw Corry wordt 80**. Sjabloon Verjaardag (kwam vanzelf in Riso), 10 namen geplakt (Corry in de Dorpsstraat, Corry's poes Minoes, De moestuin van Corry, Kerkkoor Lutten en meer), 5 foto's, ondertitel "Een cadeau van Ria, 2026", doosdeksel met foto en eigen tekst, pionnen op 4 gezet. Geprint: Thuisprint-set met bord, kaarten, doosdeksel (A3) en pionnen.

## Samenvatting

Het voelt veel rustiger en ruimer dan vorige keer. Wat ik in ronde 3 miste, zit er nu grotendeels in: de foto komt vanzelf ook op het eigendomsbewijs, ik kan het aantal pionnen kiezen, namen typen in de lijst of in één keer plakken, een Verhaal bij een straat zetten, het grote bord is echt groot, en de printpagina onthoudt wat klaar is. Het mooiste vond ik het Verhaal op de achterkant van de kaart en het doosdeksel met een familiefoto als cadeau. Het grootste probleem blijft taal en keuzes voor iemand van 71: "dpi", "vinylsticker op maat", "variabelen" en de printpagina die nog steeds met de Drukkerij-set begint. Het speelgeld is met 24 vellen voor "klein" nog steeds veel inkt. Printen ging snel (30 tot 50 seconden per set).

## Controle van de punten uit ronde 3

| Punt uit ronde 3 | Nu |
| --- | --- |
| Bug 1: printpagina na herladen "0 van 2 klaar" | Opgelost. Herladen brengt me naar de eigen printlink, "4 van 4 klaar" staat er nog. Mijn edities zegt "Thuisprint-set klaar tot 29 nov". |
| Bug 2: bewerking vlak voor sluiten weg | Niet meer gezien. Naam getypt en na 150 ms de pagina gesloten: de naam stond er bij heropenen nog. |
| Bug 3: titel afgekapt in minibord | Opgelost. "Kerst bij Oma Ria 2026" staat op twee regels en "Buurvrouw Corry wordt 80" staat in de kop volledig. |
| Bug 4: pionnenkop "1 t/m 8" | Opgelost voor 5 pionnen ("Pionnen 1 t/m 5"). Zie nieuw punt 2 voor een rest. |
| Bug 5: menu "Pion weghalen" over de waarschuwing | Opgelost, het menu heeft een eigen achtergrond (`img/oma-ria-terug/18-pion-menu.jpg`). |
| Bug 6: "Bord vergroten" | Opgelost. Staat onder het minibord en opent een echt groot bord met de naam in elk vak (`img/oma-ria-terug/10-bord-vergroten.jpg`). |
| UX 1: foto niet op het eigendomsbewijs | Opgelost. Een vinkje "Ook op het eigendomsbewijs" staat standaard aan (`img/oma-ria-terug/03-foto-ook-op-bewijs.jpg`). |
| UX 2: foto toevoegen kost twee stappen | Niet opgelost. Eerst "Foto", dan "Foto kiezen" (`img/oma-ria-terug/02-foto-twee-stappen.jpg`). |
| UX 3: jargon | Grotendeels niet opgelost. "dpi", "vinylsticker op maat, wit, mat gelamineerd, herpositioneerbaar", "uitlijntest" en "variabelen" staan er nog. |
| UX 4: printpagina begint op Drukkerij-set | Niet opgelost (`img/oma-ria-terug/14-print-drukkerij-eerst.jpg`). |
| UX 5: aantal vellen niet duidelijk | Half. Onderaan staat nu "Samen 40 vellen A4, waarvan 24 speelgeld". Bij de kaarten staat nog "7 vellen A4 · dubbelzijdig, 9 kaarten per vel", terwijl het 16 pagina's zijn. |
| UX 6: speelgeld te zwaar | Half. "Hoeveel geld?" bestaat nu, de kleinste stand is nog 24 vellen en 144 biljetten. |
| UX 7: eerlijke inschatting van knippen | Niet gezien. Geen tijd of aantal stickers bij het bord. |
| UX 8: veel vakken hernoemen | Opgelost. Typen in de lijst, Tab naar de volgende, plakken vult de volgende vakken ("10 namen ingevuld."). |
| UX 9: teller "Bord 0/41" | Opgelost, nu "12 aangepast". Zie nieuw punt 8. |
| UX 10: 8 pionnen, 3 wegklikken | Opgelost, een rij 2 tot 8 bij "Aantal pionnen". |
| Ontwerp: foto op het bord klein | Zelfde. Een straatfoto is op het bord ongeveer 12 mm. |
| Ontwerp: grote effen groene vlakken thuisbord | Zelfde (`img/oma-ria-terug/23-pdf-bord-kerst.jpg`). |
| Ontwerp: speelgeld, eerste pagina's alleen 1 euro | Zelfde. Pagina 1 tot 4 zijn biljetten van 1. |
| Wens: één verhaalveld bij een vak | Gedaan als Verhaal op het eigendomsbewijs. |
| Wens: meerdere foto's tegelijk | Gedaan, met een nieuw probleem (zie bug 1). |
| Wens: cadeauversie | Deels. Het doosdeksel kan een foto en eigen tekst, maar het veld heet "Eigen regels". |
| Wens: grotere letters, foto van de telefoon | Niet gezien. |

## Werkt niet (bugs)

1. **Meerdere foto's tegelijk kiezen overschrijft foto's op andere vakken.** Waar: editor, vak, "Foto kiezen". Ik koos bij "De bus naar oma" drie bestanden. De site zette ze op drie vakken, in lijstvolgorde: De bus naar oma, De barbecue van Lars en De trouwfoto van Opa en Oma. Die laatste had al een foto en kreeg een andere. De bus (een station) had een standaardicoon en kreeg een foto. Er staat wel "3 foto's geplaatst" met "Ongedaan maken", maar Ria dacht dat ze één foto voor dit vak koos. Verwacht: een vraag ("Wil je de foto's verdelen over de volgende vakken?") of alleen lege vakken vullen. Ernst: hinderlijk. Stappen: vak openen, Foto, Foto kiezen, 3 bestanden kiezen. Screenshot: `img/oma-ria-terug/20-meerdere-foto-s.jpg`.
2. **Pionnen terugbrengen naar 4 laat "Pion 8" staan als vierde.** Waar: Doos, Aantal pionnen. Ik opende Pion 8 en klikte op 4. De lijst werd Pion 1, 2, 3 en 8 ("Pion 4 van 4" heet "Pion 8"). In de PDF staan ook "Pion 1, 2, 3, 8" en de kop zegt "Pionnen 1 t/m 4". Verwacht: de vier eerste pionnen, of nummering die doorloopt. Ernst: klein. Screenshots: `img/oma-ria-terug/17-pion-8-als-vierde.jpg`, `img/oma-ria-terug/30-pdf-pionnen-pion-8.jpg`.
3. **Foto's op een station laten zich niet weghalen met "Geen".** Waar: editor, station. Een station heeft geen "Geen", alleen "Standaardicoon". Mijn script zocht "Geen" en klikte niets, dus de foto bleef staan. Een mens zou "Standaardicoon" vinden. Ernst: klein, hooguit onduidelijk. Geen screenshot.
4. **Rij "Midden van het bord" onder het zoekveld afgekapt.** Waar: editor, lijst links, na scrollen. De rij "Naam, foto of logo" staat half onder het zoekveld. Ernst: klein. Screenshot: `img/oma-ria-terug/03-foto-ook-op-bewijs.jpg` (linksonder in de lijst).

Console: geen eigen fouten van de site (alleen de Bugsnag-melding, die negeer ik).

## UX: wat kan beter

1. **Foto toevoegen blijft twee stappen** (R3 UX 2). Waar: editor, Afbeelding. "Foto", dan "Foto kiezen". Voorstel: één knop "Foto toevoegen" die direct de bestandskiezer opent. De zin "Je kunt ook een foto hierheen slepen of plakken met ⌘V" is voor Ria onzichtbaar klein en noemt een toets die ze niet kent.
2. **Jargon bij foto's.** Waar: Controle en het vak. "De foto heeft 102 dpi op dit formaat. Kies een grotere foto of zoom minder in." Op het eigendomsbewijs van dezelfde foto staat 75 dpi. Twee getallen, beide onbegrijpelijk. Voorstel: "Deze foto is te klein en wordt wazig in print. Kies een grotere foto." Screenshot: `img/oma-ria-terug/12-kleine-foto-dpi.jpg`, `img/oma-ria-terug/13-controle.jpg`.
3. **"Variabelen" in de kaarteditor.** Waar: Kaarten. "Namen van vakken en woorden zoals station zijn variabelen: ze veranderen mee. Gebruik Invoegen om er een te plaatsen." Ria weet niet wat een variabele is. Voorstel: "Een woord in een grijs blokje past zich aan als je de naam van het vak verandert." Screenshot: `img/oma-ria-terug/08-kaart-variabelen.jpg`.
4. **Printpagina begint met de Drukkerij-set** (R3 UX 4). Ria print thuis. Ze ziet eerst "Bestel als vinylsticker op maat, wit, mat gelamineerd, herpositioneerbaar", "SRA3" en "Proefvel: liniaal, bankpas en hoekvak". Voorstel: onthoud de keuze, of vraag vooraf "Print je thuis of laat je drukken?" Screenshot: `img/oma-ria-terug/14-print-drukkerij-eerst.jpg`.
5. **Vellen of pagina's.** Waar: printpagina, kaarten. "7 vellen A4 · dubbelzijdig" is 16 pagina's op 8 vellen papier. De balk onderaan telt wel eerlijk ("Samen 40 vellen A4"), maar die telt 16 pagina's kaarten als 7. Voorstel: één zin per onderdeel: "16 pagina's. Print dubbelzijdig, dan heb je 8 vellen."
6. **Speelgeld zwaar voor thuis, en het past niet bij 5 pionnen.** Waar: Hoeveel geld?. Ik koos 5 pionnen (Oma plus vijf kleinkinderen is zes spelers) en liet "2 tot 4 spelers" staan, omdat ik het klein wilde houden. Niemand zei dat dit te weinig is voor zes. 24 vellen is ook zo nog veel inkt voor een inkjet. Voorstel: een waarschuwing als het aantal pionnen groter is dan de gekozen stand, plus de tip "Je kunt ook het speelgeld uit je eigen doos gebruiken, zet het vinkje dan uit" en een zwart-wit of lichte variant.
7. **De ene knop maakt alles opnieuw.** Waar: printpagina. Na het toevoegen van de verhalen drukte ik op "Thuisprint-set maken". Dat maakte de hele set opnieuw, ook het speelgeld van 11,9 MB (dus twee keer de zware set, tegen de afspraak in de opdracht; dat was mijn vergissing, maar Ria zou het ook doen). Er is wel een "Maken" per onderdeel, maar Ria ziet niet dat dat sneller is. Voorstel: na een wijziging alleen de onderdelen als "verouderd" tonen die echt veranderd zijn, en de grote knop alleen die opnieuw maken.
8. **Tellers kloppen niet met elkaar.** Waar: editor en Mijn edities. Bij Kerst bij Oma Ria staat in de tabs Bord 14, Kaarten 1 en Doos 6 aangepast (samen 21), terwijl Mijn edities "25 aangepast" zegt. Bij Corry: tabs 11 en 1, Mijn edities 16. Misschien telt de ene iets mee wat de andere niet toont. Voorstel: één telling, of uitleggen wat erbij zit.
9. **Plakken van namen slaat stations en nutsbedrijven stil over.** Waar: lijst, plakken van 10 regels. De melding "10 namen ingevuld." klopt, maar "De bushalte" en "De zonneweide" bleven staan en dat stond nergens. Ria denkt dat er iets misging. Voorstel: "10 namen ingevuld. Stations en nutsbedrijven sla ik over."
10. **Doosdeksel: velden overlappen niet.** Waar: Doosdeksel. De ondertitel van het bord ("Een cadeau van Ria, 2026") komt niet op het deksel, dat zegt nog "Een spel voor 2 tot 8 spelers". Het veld voor de eigen tekst heet "Eigen regels", terwijl het om tekst als "Voor wie is het spel" gaat. Voorstel: de ondertitel overnemen, en het veld "Extra tekst" noemen.
11. **Foto in het eigendomsbewijs begint op "Vullend".** Waar: bewijs met een foto. Een brede familiefoto wordt een smalle strook waarbij de koppen halverwege worden afgesneden; een staande foto (Molenweg) wordt een heel klein plaatje in het kader. Voorstel: voor groepsfoto's standaard "Passend, hele foto", of een kleine voorvertoning van de uitsnede bij het kiezen. Screenshot: `img/oma-ria-terug/26-pdf-bewijzen-dorp.jpg`.
12. **Onderdelen-keuze gaat over "set".** "Per set" bij Hoeveel geld is voor Ria een woord zonder betekenis. De uitleg eronder ("Thuis voor 2 tot 4 spelers, bij de drukkerij de volledige bank") is goed, maar staat in grijs eronder. Voorstel: "Aanbevolen" in plaats van "Per set".

## Ontwerp

Mooi:

- De editor is vriendelijker. De lijst met bolletjes voor "aangepast" werkt: ik zie in één blik wat ik deed (`img/oma-ria-terug/04-editor-na-foto.jpg`).
- Het grote bord ("Voorbeeld" en "Bord vergroten") is mooi en leesbaar, ook met foto's (`img/oma-ria-terug/09-voorbeeld.jpg`, `img/oma-ria-terug/10-bord-vergroten.jpg`).
- Het eigendomsbewijs met Verhaal in schuin lettertype op de achterkant is het mooiste stuk van de hele site voor Ria (`img/oma-ria-terug/29-pdf-verhaal-achterkant.jpg`, `img/oma-ria-terug/19-verhaal.jpg`).
- Het doosdeksel met een foto, de titel in Riso-roze en twee regels tekst is een echt cadeau (`img/oma-ria-terug/27-pdf-deksel.jpg`, `img/oma-ria-terug/21-deksel.jpg`).
- De pionnen met foto en naam zijn leuk en staan recht (`img/oma-ria-terug/24-pdf-pionnen.jpg`).
- De kaarten in de PDF zijn rustig, groot en leesbaar (`img/oma-ria-terug/25-pdf-kaarten-kerst.jpg`).
- Mijn edities met de drie borden en "Thuisprint-set klaar tot 29 nov" is overzichtelijk (`img/oma-ria-terug/22-mijn-edities.jpg`).

Goedkoop of niet af:

- De foto's op het bord zijn klein (ongeveer 12 mm). Een gezichtje is amper te zien. Voor een familiespel is dat de kern (`img/oma-ria-terug/23-pdf-bord-kerst.jpg`).
- De vier grote middenstukken van het thuisbord zijn effen groen of roze met een stuk lint. Veel inkt voor weinig (`img/oma-ria-terug/28-pdf-bord-buurvrouw.jpg`).
- Het vak-voorbeeld in de editor is groot en leeg: een enorme kaart met één naam en één bedrag (`img/oma-ria-terug/01-editor-start.jpg`).
- De pionnen-PDF is één klein strookje op een A4. Prima, alleen vraagt het precies knippen.
- Speelgeld lijkt op echt en ziet er goed uit, maar de eerste vier pagina's zijn alleen biljetten van 1 (`img/oma-ria-terug/31-pdf-speelgeld.jpg`).

## Features die ik zou willen

- **Eén knop "Foto toevoegen"** die direct de bestandskiezer opent. Waarom: Ria zoekt niet naar "Foto kiezen" na "Foto". Must.
- **Meerdere foto's tegelijk, maar met een duidelijke vraag.** Het bestaat al, maar werkt nu onverwacht (bug 1). Een apart scherm "Foto's verdelen" waarin ze de volgorde kan zien en de foto's naar vakken kan slepen. Waarom: ze heeft een map met 30 foto's. Must.
- **Foto rechtstreeks van de telefoon**, bijvoorbeeld met een QR-code. Waarom: haar foto's staan op haar telefoon. Nice.
- **Gewone woorden in plaats van vakjargon**, zonder dpi, vinylsticker en variabelen. Waarom: ze leest langzaam en haakt af bij een woord dat ze niet kent. Must.
- **"Waar print je?" aan het begin** en onthouden. Waarom: ze zit nu eerst op de Drukkerij-set. Must.
- **Een tip en een lichte variant voor het speelgeld**, en een waarschuwing als het geld niet past bij het aantal spelers. Waarom: inktkosten en 24 vellen. Must voor een thuisprinter.
- **Een inschatting van de tijd bij knippen en plakken** ("reken op een avond"). Waarom: ze weet niet hoeveel werk het bord is. Nice.
- **Cadeaukaartje of omslagpagina** met "Voor Emma, Lars en Sophie, van Oma, kerst 2026" in een paar velden. Waarom: het is een kerstcadeau, het deksel is er al bijna. Nice.
- **Grotere letters of een eenvoudige modus** op de site. Waarom: veel hulptekst is klein en grijs. Nice.
- **Grotere foto's op het printbord.** Er bestaat een keuze "Hele vak", maar de foto blijft klein omdat een straatvak maar 12 mm foto toelaat. Een tip bij de foto ("hier past een kleine foto, kies een gezicht dichtbij") of een groter fotovlak zou helpen. Waarom: familiefoto's zijn het hele spel. Must voor dit gebruik.

## Wat goed werkte

- Foto automatisch ook op het eigendomsbewijs, met een vinkje.
- Namen typen in de lijst, Tab naar het volgende vak, en plakken van een rijtje namen.
- Aantal pionnen kiezen in één rij.
- Verhaal op de achterkant van het bewijs.
- Printen was snel: 30 tot 50 seconden per set. De PDF's hebben de juiste namen, foto's, bedragen en euroteken.
- Printpagina onthoudt "klaar" en Mijn edities toont tot wanneer.
- Een piepkleine foto (160 px) kreeg een gele waarschuwing en telt mee in Controle. Een foto van 6000 px kostte geen extra tijd.
- "Controle" in de printbalk met een link naar de editor ("2 meldingen in Controle").
