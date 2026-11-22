# Designcheck

Ronde 1, 20 november. Elke pagina van de lokale app (main, Sail op poort 8090) staat naast het ontwerpbestand in `docs/design/`. De ontwerpbestanden openen lokaal met `docs/design/support.js`: start `python3 -m http.server 8765` in `docs/design` en open bijvoorbeeld `http://127.0.0.1:8765/Main.dc.html`.

Niet te zien zonder Google-gegevens in de lokale `.env`: de knop "Inloggen met Google" en de inlogbanners. Die ontbreken lokaal dus terecht.

## Landing (`/nl`, Main.dc.html)

Komt goed overeen: hero, stappen, sets, bordsticker, vragen en footer.

- Midden van het bord: in het design staat de editienaam groot en diagonaal (B89). In de app is de naam klein en horizontaal, en de twee kaartvakken nemen de diagonaal in.
- De waaier kaarten valt rechts deels over het bord heen en het eigendomsbewijs dekt de Algemeen Fonds-kaart grotendeels af. In het design waaieren ze netjes uit.
- De links "Wat je bestelt" en "Hoe je het print" zijn in het design onderstreept, in de app niet.
- De contentkolom is iets smaller dan in het design (kleine afwijking).

## Printgids (`/nl/printgids`, Printgids.dc.html)

Wijkt flink af.

- In het design heeft elk onderdeel twee kolommen naast elkaar, "Bij de drukkerij" en "Thuis", elk met een korte tekst en een mono-regel met maten. In de app is het één lange tekstkolom.
- In het design staan bij Bord vier kleine illustraties van het plakken (stappen 1 tot 4). Die ontbreken.
- De inhoudsopgave links is in het design onderstreept.
- De tekst in de app is veel langer dan in het design. De inhoud komt uit `resources/content/nl/printgids.md` en dat mag zo blijven, maar de opmaak per onderdeel moet het design volgen.

## Nieuwe editie (`/nl/editions/new`, Nieuwe-editie.dc.html)

Komt goed overeen.

- De drie themaminiaturen zien er in de app hetzelfde uit (alle drie groen met dezelfde kaarten). In het design is Klassiek groen, Riso roze en Strak wit, en zie je het verschil meteen.
- Het gekozen thema heeft in het design een rode rand en een rood "gekozen". In de app is dat grijs.
- De selectievakjes zijn in het design rood (accent), in de app zwart.

## Editor, bord (`/nl/editor/{id}`, Editor.dc.html)

- Het gekozen element in de focusweergave is veel te groot. Het vult de hele hoogte en valt onderaan van het scherm. In het design staat het op een rustige maat met ruimte eromheen. Het moet passen in de beschikbare breedte en hoogte.
- De lay-outkeuze is in het design drie tegels met een miniatuur (Foto in kader, Foto over het hele vak, Alleen tekst). In de app zijn het platte tekstknoppen.
- De lijst per bordzijde heeft in het design per rij een kleurvakje (straatkleur), een stip bij aangepaste vakken en een waarschuwingsteken. In de app staan alleen namen.
- De kopjes per bordzijde ("Start tot Op bezoek") zijn in de app in hoofdletters met een ander woord ("Start tot gevangenis (op bezoek)"). Het design gebruikt gewone letters.

## Editor, kaarten (Editor-kaarten.dc.html)

- Zelfde probleem als bij het bord, maar erger: de kaart wordt zo groot dat de bovenkant ("Kans") buiten beeld valt.
- In het design staan boven de kaart de knoppen "Voorkant / Achterkant".
- De kaarttegels in de zijbalk zijn in het design lichtcyaan (Kans) en lichtmagenta (Algemeen Fonds), met een stip of waarschuwing. In de app zijn ze wit.
- In het veldpaneel toont het design de standaardtekst in een grijs blok met "Terugzetten" erbij.

## Telefoon: bord (Mobiel-bord.dc.html)

Komt redelijk overeen.

- In het midden van het bord staat "Midden". In het design staat daar de editienaam, diagonaal.
- De lijst mist dezelfde kleurvakjes en stippen als op desktop.
- De tabs zijn in het design één gesegmenteerde balk met Bord, Kaarten, Geld en Doos. In de app zijn het losse knoppen met tellers.

## Mijn edities (`/nl/editions`, Mijn-edities.dc.html)

Komt goed overeen. De inlogbanner ontbreekt lokaal omdat Google niet is ingesteld.


## Ronde 2

20 november, tweede check. Lokale app (Sail op poort 9590) naast `Editor-geld`, `Editor-doos`, `Staten`, `Mobiel-landing`, `Mobiel-edities`, `Editor-mobiel`, `Mobiel-bord` en `Stijlgids`, op 1440 en 390 px. Download, Drukwerk en de printpagina vallen buiten deze ronde (andere agent).

### Ronde 1: sindsdien opgelost (nagelopen)

- Midden van het bord: editienaam groot en diagonaal, in alle thema's (B89, B109). Opgelost.
- Kaartenwaaier en eigendomsbewijs op de landing liggen niet meer over elkaar. Opgelost (B103).
- Printgids: twee kolommen per onderdeel, plakillustraties, inhoudsopgave. Opgelost.
- Nieuwe editie: drie verschillende themaminiaturen met een rode rand en "gekozen". Opgelost.
- Editor: focusweergave past in beeld, lay-outtegels met miniatuur, kleurvakjes en stippen in de lijst, gewone letters bij de bordzijden, Voorkant/Achterkant boven de kaart, gekleurde kaarttegels. Opgelost.
- Telefoon: gesegmenteerde tabbalk Bord / Kaarten / Geld / Doos. Opgelost.

### Gevonden en gefixt

- Rechterpaneel van de editor stopte halverwege (daaronder de tafelkleur). Nu vult het de hele hoogte.
- Doosdeksel: de knop "Foto toevoegen" stak buiten het paneel. De twee knoppen breken nu af.
- Geld: de lijst had geen kleurvakje per biljet. Elk biljet heeft er nu een, in de gekozen kleur. Pionnen hebben een rond vakje, zoals in het design.
- Geselecteerde rij in alle lijsten (bord, geld, doos): rode balk links zoals in het design, en een lichte hover.
- Kopje "Pionnen · 4 van 8" stond in hoofdletters (B87). Nu gewone letters.
- Telefoon: de onderbalk liep op 320 px door ("Printen" afgesneden) en de editor vulde niet de hele hoogte, zodat de onderbalk midden in beeld hing. Opgelost.
- Telefoon, focusweergave: de titel stond twee keer (boven het element en in het paneel). Het paneel toont hem nu alleen vanaf 1024 px.
- Mijn edities, lege staat: de kaarten en het biljet lagen over de tekst en de knoppen. De stapel is kleiner en heeft meer ruimte.
- Mijn edities, menu: "Verwijderen" staat in rood.
- Nieuwe editie: bij "Kans en Algemeen Fonds" stond dezelfde tekst twee keer ("Kans en Algemeen Fonds · Kans en Algemeen Fonds"). Nu "de stapels met kaartjes".
- Stijlgids: selectiekleur (drukkersrood) ontbrak. Toegevoegd. Tokens (kleuren, letters, radius 6/12, rand 2 px, focus 3 px met 2 px afstand, knoppen 48 px) komen overeen met `app.css`.
- Header en "Editie maken": zie B121. Op de landing, Mijn edities, Nieuwe editie en de voorbeeldeditie is de headerknop nu omrand.

### Bekende afwijkingen, bewust

- Staten, opslagstatus: de tekst staat zonder gele kader in de editorheader (het ontwerp gebruikt een kader in het losse paneel). De waarschuwingen over privévenster, Safari en volle opslag staan in de statusmachine en komen in de statusregel. Niet los te zien zonder die omstandigheden na te bootsen.
- Staten, foto's: het ontwerp heeft een groot sleepvak met stippellijn. In de app werkt slepen op het hele paneel, met een stippeloutline tijdens het slepen en een korte hint. De stippellijn komt alleen bij slepen (B87: geen gestippelde randen die geen knip- of vouwlijn zijn).
- Staten, accountmenu en inlogbanners: niet te zien zonder Google-gegevens in de lokale `.env`.
- Editor-doos: het ontwerp heeft "Plaatje voor de groepsapp" als lijstrij. Die is er nog niet; de functie hoort bij de QA/functionele kant.
- Editor-geld: het design heeft zes vaste kleurvakjes. De app heeft een vrije kleurkiezer met "Terugzetten" (uit de editor-gaps, B93).

## Responsiveness

Veegtest met een script (puppeteer, headless Chrome) op 320, 360, 390, 414, 768, 1024, 1280 en 1440 px, NL en EN: alle openbare pagina's, Mijn edities, Nieuwe editie, voorbeeldeditie, de editor met elk tabblad, het telefoonmenu en de instellingen. Per pagina is gecontroleerd op horizontaal scrollen (`scrollWidth > innerWidth`), elementen buiten beeld en bedieningselementen kleiner dan 44 px.

- Landing: de bankpas bij de bordsticker stak 4 px buiten het scherm en gaf horizontaal scrollen op telefoons. De sectie knipt nu horizontaal af.
- Editor 768 tot 1023 px: het drie-koloms grid kneep het midden samen tot een streepje van 70 px. De editor gebruikt de telefoonindeling nu tot 1024 px (lijst, dan één element met paneel en onderbalk) en het drie-koloms grid vanaf 1024 px. Dat geldt ook voor de editorheader.
- Editor-header op 320 en 360 px: de terugpijl stak buiten beeld en een lange editienaam duwde de rest weg. Naam wordt afgekapt, de terugknop is 48 px breed.
- Editor, onderbalk op 320 px: knoppen krijgen minder opvulling en ruimte onder 380 px.
- Segmentbalk (Vak / Eigendomsbewijs) werd op 320 px afgesneden. Kleinere letter onder 360 px.
- Tap-targets onder 44 px verholpen: inhoudsopgave van de printgids (40), tekstlinks op de landing en contactpagina (24), "Onderdelen kiezen of overslaan" (40) en "Terugzetten" (32).
- Gecontroleerd en in orde: landing (gekantelde items blijven binnen het scherm), printgids, vragen, privacy, voorwaarden, contact, Mijn edities, Nieuwe editie, voorbeeldeditie, dialogen, header en telefoonmenu in NL en EN op alle breedtes. Na de fixes geeft de veegtest geen overloop en geen te kleine bedieningselementen meer.

## Ronde 3 (integratie B138)

21 november, eindcheck voor de deploy. Branch `integratie-b138` lokaal (Sail op poort 11990) met productie-assets, Horizon en Reverb aan en de PDF's via `chrome-headless-shell`. Elke pagina is bekeken op 1440 en 390 px, de editor ook op 320 px, naast de mockups in `docs/design/integratie/` en §3 van `docs/design/integratie-evaluatie.md`. Een script (puppeteer, headless Chrome) controleerde per scherm op horizontaal scrollen, knoppen buiten beeld en bedieningselementen kleiner dan 44 px. Daarna een functionele test van begin tot eind, met een tweede browser voor de vriendenpagina. Schermen staan in `docs/design/integratie/gebouwd/eindcheck/`.

### Bugs uit §6 van de evaluatie

1. Ondertitel met vertaalsleutel bij spelregelboekje, huisjes en hotels en dobbelstenen: weg.
2. Kop over twee regels op 1440 px: weg, de kop is één regel.
3. Tabs half boven de rand na laden: weg, alleen de lijst scrolt.
4. "Foto plakken" buiten het paneel: weg, Andere foto en Plakken staan naast de miniatuur in het paneel.
5. Accentkleur toonde Inkt als gekozen: weg, Uiterlijk toont Pijlen (rood) en Doosdeksel (inkt) als kleuren van het thema.
6. Tekst over belastingbedragen in Woorden: weg, de dialoog bestaat niet meer en de sectie noemt geen bedragen.
7. Munteken in de miniaturen: in orde, de kaartjes in de themategels, op Nieuwe editie en op de printpagina tonen het teken.
8. Voorbeeld zonder tabs voor het extra drukwerk: weg, alle elf onderdelen hebben een tab.
9. Leeg veld Verhaal bij Start: weg, een hoek heeft Naam en Korte tekst.
10. Toetsenbordhints op een telefoon: weg, op 390 px met touch staat er geen ⌘V meer, alleen de knop Plakken.
11. Banknaam telde als aangepast biljet: weg, na het wijzigen van de banknaam blijft Geld op 0/7.
12. Voorbeeld en Samen maken onbereikbaar op een telefoon: weg, het naammenu heeft Editie-instellingen, Samen maken, Voorbeeld, Dupliceren en Naar Mijn edities.
13. Printpagina zonder editienaam en zonder huisregels: weg, de kop is "Eindcheck printen" met miniatuur, en bij Kaarten en eigendomsbewijzen staat "Met de huisregelskaart".
14. Gemaakte bestanden onder Mijn edities: deels. De regel "Drukkerij-set klaar tot …" komt alleen voor edities in een account. Zonder inloggen weet Mijn edities niet welke printopdracht bij welke editie hoort, dus daar staat niets. Zie Open voor Niek.

### Gevonden en gefixt

- Kaarttekst: bij elke toets in het verhaal van een kaart gaf Chrome een fout in de console (`inputType` is leeg bij het `textInput`-event dat React als onBeforeInput doorgeeft). Typen werkte wel, maar Bugsnag zou bij elke toets een melding krijgen. Vet en cursief blokkeren loopt nu via het echte `beforeinput`-event, met een test.
- Fotogereedschap na herladen: was het gekozen element bij het openen van de editor een vak met foto, dan stonden zoom, kwartslag en zwart-wit uit en ontbrak de regel met de resolutie, tot je een ander vak koos. Het kader wordt nu opnieuw gemeten zodra de foto uit de browser geladen is.
- Statusregel in het veldenpaneel: "Dorpsstraat en Kerkpad2 gewisseld" bleef staan bij elk volgend element, ook bij een kaart. De regel hoort nu bij het element waar hij over gaat. Na "Kaart weghalen" gaat hij één keer mee naar de volgende kaart. Met een test.
- Nieuwe editie op 390 px: in de ingeklapte regel Onderdelen liep "eigendomsbewijzen," tegen "Wijzigen" aan. Op een telefoon staat de samenvatting nu op een eigen regel. "kans en algemeen fonds" staat nu met hoofdletters, het zijn namen.
- Telefoon, onderbalk: het waarschuwingsicoon bij Controle werd in het overzicht samengedrukt tot een streepje. Het houdt nu zijn maat, en valt onder 380 px weg zodat "Controle: 1" past naast vorige en volgende.
- Voorbeeld: op 1440 px liepen de elf tabs en de zoomknoppen door elkaar over twee regels, en op 390 px stond Sluiten alleen op een tweede regel. Nu staan titel, zoom en sluiten op één regel en de tabs eronder. Op een telefoon is Sluiten een kruisje.
- Uitnodiging: de ondertitel van het paneel was "Tekst op de uitnodiging", net als het veld eronder. Nu "Uitnodiging", zoals bij de andere extra's.
- Extra lagen: de onderste laag heette altijd "Achtergrond: bordgroen", ook op een kaartrug, een eigendomsbewijs of een doosdeksel met foto. Nu "Achtergrond".
- Het knopje "Standaard" had twee looks (rand inkt in het editiepaneel, lichte rand in het veldenpaneel). Nu overal hetzelfde pilletje.
- Tap-targets onder 44 px verholpen: ongedaan maken en opnieuw in de kop (36), Tonen bij de huren (41 breed), Standaard (32), de springlinks bovenaan het editiepaneel (32), de groepskleuren in Uiterlijk op een telefoon (36, op 320 px 27 breed; nu vier per rij), "Terug naar de editor" (32) en de vinkjes op de printpagina (20). De pilletjes en vinkjes houden hun maat; de knop eromheen is 44 px.

### Functionele test

Editie "Eindcheck" uit het sjabloon "Je dorp of wijk", op 1440 px, daarna herladen en opnieuw geopend in een nieuwe browser:

- Straten hernoemd, foto geüpload en een foto geplakt (paste-event met een PNG): beide staan in het voorbeeld met resolutie.
- Prijs dertig keer omhoog: stopt op 72 (60 plus 20%), de plusknop gaat uit. "Standaard" zet hem terug op 60.
- "Terug naar standaard" in het menu ⋯ vraagt eerst, omdat er een foto bij is, en zet het vak terug.
- Wisselen met… via het menu: naam, foto en eigendomsbewijs gaan mee, prijs en kleur blijven. Ongedaan maken en opnieuw werken, ook op de wissel en op een toegepaste bijdrage.
- Extra Kans-kaart toegevoegd (Kans 17, Controle meldt de lege tekst tot er tekst staat) en een tweede toegevoegd en weer weggehaald via ⋯.
- Munt op dollar en banknaam "Bank van Eindcheck" in het editiepaneel; Speelgeld en Dobbelstenen aangezet.
- Samen maken: link gemaakt. In een tweede browser op 390 px een naam en foto voor een straat gestuurd. In de editor kwam de rode stip op de naam en de rij "Van vrienden 1"; Toepassen zette naam en foto op het vak.
- Na herladen en na een nieuwe browser met hetzelfde profiel staat alles er nog.
- Printpagina: proefvel, bord, kaarten (met de extra kaart) en geld voor beide sets, dobbelstenen voor de drukkerij, en de ZIP van beide sets. Alles klaar zonder fouten in Horizon.
- Migratie banknaam: een editie met de oude sleutel `bank` in een IndexedDB van versie 1 gezet. Bij openen ging de database naar versie 2, stond de naam onder `words.bank` en in Woorden bij "Naam van de bank".

### PDF's

| Bestand | Pagina's | Maat |
| --- | --- | --- |
| Proefvel | 1 | A4 |
| Bord, drukkerij | 4 | 254 × 254 mm |
| Bord, thuis | 7 | A4 |
| Kaarten, drukkerij | 124 | 69 × 94 mm |
| Kaarten, thuis | 16 | A4 |
| Geld, drukkerij | 15 | SRA3 |
| Geld, thuis | 35 | A4 liggend |
| Dobbelstenen | 1 | A4 |

Gecontroleerd met `pdftotext`, `pdfimages` en een render naar PNG (`pdf-*.jpg` in de map): de drie foto's staan op het bord, de extra kaart staat in beide kaartensets (62 kaarten: 33 Kans en Algemeen Fonds, 28 eigendomsbewijzen en de huisregelskaart), overal staat $ en nergens €, en elk biljet zegt "Bank van Eindcheck". De ZIP van de drukkerij heeft vier PDF's en vier instructies, die van thuis drie en drie.

### Bekende afwijkingen

- De speelgeld-PDF is 17 MB per set, door het guillochepatroon als vector. Dat valt binnen de grens per vel uit de printpaginaronde.
- "Terug naar standaard" op een editie uit een sjabloon zet het vak terug naar het standaardspel (Molenweg), niet naar de tekst van het sjabloon.
- Op een desktop zijn de groepskleuren in Uiterlijk 36 px; met een muis is dat genoeg, op een telefoon zijn ze 44 px.
- De sjabloonteksten noemen bedragen zonder munt ("dan krijg je 200 van de bank") en schrijven Start als vaste tekst in plaats van `{space:0}`. De standaardteksten doen dat eerste ook.

### Open voor Niek

Alle zes punten van hieronder zijn in de laatste ronde gebouwd; zie "Laatste ronde".

### Laatste ronde (B177 tot B179)

22 november, op dezelfde stack en met dezelfde edities. Elk punt heeft tests. Schermen gecontroleerd op 1440, 1024, 768, 390 en 320 px en liggend op 844 × 390, met hetzelfde script voor horizontaal scrollen en kleine knoppen (geen bevindingen buiten de skiplink van 1 px). Schermen staan in `docs/design/ronde-3/eindcheck/` als `r4-*.jpg`.

- Woorden in kaartteksten (B177). Sjablonen en standaardkaarten hebben `{station}`, `{utility}`, `{house}`, `{hotel}` en `{jail}` in de tekst. De kaarttekst-editor toont ze als chip ("Woord: station") en Invoegen biedt de vijf woorden aan, boven de vakken. "Groep 6 Eindcheck" (gemaakt vóór deze ronde) opende met de nieuwe tekst en zonder één aanpassing in Kaarten: B152 telt 0. Met "bushalte" en "de strafbank" toont de vriendenpagina "Ren naar het dichtstbijzijnde bushalte" en "gratis uit de strafbank". Ook "huis", "hotel" en "de gevangenis" in de sjablonen zijn variabelen geworden: hetzelfde probleem met een eigen woord.
- Tellingen (B178). Tabs: "Bord / 4 aangepast", op 320 px met vier tabs de stip met het getal. Zonder aanpassing staat er niets onder de naam. Mijn edities: "16 aangepast · bewerkt 21 nov", bij 0 "Bewerkt 21 nov".
- Printbalk en Controle (B179). "3 notes in Check" bij Club Endcheck, met link naar `/en/editor/<id>?check=1`; de editor opent met Controle open en haalt `?check=1` uit de adresbalk. Printen blijft kunnen. Zonder meldingen staat er niets.
- Printbalk op de telefoon (B179). 320 × 640: 110 px (17%), 390 × 844: 13%, liggend 15%, 768 en 1024 px 15 tot 20%, 1440 px 13 tot 17%. De schatting is de ingeklapte regel van 44 px hoog; open staat de regel over de server erin. Onder 380 px heet de knop "Set maken". Tussen 768 en 1279 px lag de tekst eerst in een kolom van 80 px naast de knoppen (de balk werd 93% van een iPad staand); nu staan tekst en knoppen daar onder elkaar.
- Menu ⋯ (B179). Opent in het paneel onder de knop en duwt de velden omlaag. Op 1440, 1024 en 768 px ligt het over niets. Pijltjes, Esc terug op de knop, een klik ernaast sluit het.
- Foto op het eigendomsbewijs (B179). De staande foto van "Clubhouse B" staat passend op het bewijs, ingezoomd op de bovenste 55%: het hele gezicht en de schouders, met papier ernaast. De printjob krijgt dezelfde uitsnede. Liggende foto's houden de uitsnede van het vak.
- Logo (B179). "Logo" of "Naam met foto" in het midden zonder foto opent meteen de bestandskiezer.
- Lettersneltoetsen (B179). Na Esc op het venster Sneltoetsen staat de focus op de pagina en doet J niets; na een klik op de pagina weer wel. Bij `?` staat het onder de schakelaar.
- Mijn edities. Tabvolgorde per kaart: Openen, Printen, Dupliceren, menu.

Nog open: "Pion 1 van 8" bij 5 pionnen in de set en "Everyone starts with 1500" zonder munt (zie bekende afwijkingen).

## Ronde 4: shadcn als basis (B195, B196)

22 november, branch `feat/shadcn-basis`. Schermen in `docs/design/ronde-4/feat-shadcn-basis/` (`voor/` en `na/`).

- Thema (B195). `app.css` heeft nu de hele set shadcn-variabelen, gekoppeld aan de huistokens: papier, inkt, drukkersrood voor de primaire knop en de selectie, de tafelkleur voor hover en gemarkeerde items, 2 px inkt voor bediening (`border-input`) en 1 px lijn voor scheidingen (`border`). Radius `md` en `lg` zijn 6 px, `xl` is 12 px; `sm` en `xs` blijven leeg, zodat de kleine kleurvlakjes in de lijst vierkant blijven. Geen schaduwen. `dark:` werkt alleen onder een `.dark`-klasse, die de site niet zet.
- Focus. shadcn tekent focus met een ring zonder afstand. In de componenten zijn die klassen weggehaald, zodat overal de huisfocus geldt: 3 px inkt met 2 px afstand. In een aaneengesloten balk (segmenten, tabs) ligt de rand aan de binnenkant.
- Niets verschoven. Voor en na het thema op 1440 en 390 px gemeten met `compare -fuzz 2%`: Contact, Voorbeeld, Nieuwe editie op 390, de editor en het stationvak zijn pixel voor pixel gelijk. Home en Nieuwe editie op 1440 verschillen ook tussen twee opnames van dezelfde build (de tafel en de sjabloonkaarten bewegen); daar is met het oog vergeleken.
- Bestaande componenten. Button, Dialog, DropdownMenu, Badge en Select volgen de shadcn-opbouw (`data-slot`, `radix-ui`, de shadcn-varianten naast de huisnamen). Select is een dunne laag over shadcn's NativeSelect (B86). SegmentedTabs is shadcn Tabs met de look `segmented`. Bestaande schermen zien er hetzelfde uit; alle tests van de componenten slagen zonder wijziging.
- Keuzerijen (B196). Standaard / Icoon / Eigen / Foto, Geen / Foto, Vullend / Passend, Naam / Naam met foto / Logo en de andere rijen van `ChoiceRow` zijn één segmentbalk (ToggleGroup). Het gekozen segment heeft het rode kader. Op 320 px past de rij van vier op één regel; een lange tekst ("Foto over het hele midden") loopt binnen zijn segment door naar een tweede regel. De korte tekst staat in de volledige naam ("Icoon" in "Ander icoon"), zodat een schermlezer en spraakbediening dezelfde naam gebruiken. Pijltjes lopen door de segmenten, spatie of Enter kiest. In kader / Hele vak is een ToggleGroup met de twee tekeningetjes.
- Icoonkiezer (B196). Onder Icoon staan acht iconen die bij het vak passen, als ToggleGroup in twee rijen van vier. De knop "Zoek uit 285 iconen" opent op een breed scherm een Popover links van het paneel en op een telefoon een Drawer van onderen. Daarin zoek je (Command) op een Nederlands of Engels woord of op de groep, of je bladert door Past bij dit vak, Onze tekeningen en elf groepen. "trein" geeft Trein, Trein van voren en Trein in een tunnel. Pijltjes en Enter kiezen, Esc sluit en de focus gaat terug naar de knop. Een gekozen icoon buiten de acht komt vooraan in de rij.
- Zelfde tekening op het vak en in de print. Een lucide-icoon gaat door dezelfde `SpaceIconArt` als onze eigen iconen, met hetzelfde vak en dezelfde lijndikte (viewBox van 20 bij 20). Een test vergelijkt de positie en maat met die van ons eigen treintje. Een printjob is in deze branch niet gedraaid.
- Bestaande iconen. Opgeslagen ids als `ferry` en `piggy-bank` blijven werken; nieuwe heten `lucide:<naam>`. De server controleert ze tegen hetzelfde JSON-bestand als de editor.

Nog met de hand gemaakt en wel in shadcn (voor de migratie na de merge):

- Selectievakjes: `components/editions/edition-choices.tsx`, `components/print/part-row.tsx`, `components/editor/layer-panel.tsx`, `components/editor/panel/amount-section.tsx`, `style-section.tsx`, `text-section.tsx`, `components/editor/together-section.tsx`, `shortcuts-dialog.tsx`, `edition-panel.tsx` (Checkbox of Switch).
- Keuzerondjes en eigen radiogroepen: `components/editions/template-picker.tsx`, `edition-choices.tsx`, `components/print/money-choice.tsx`, `components/editor/edition-panel.tsx` (thema's, onderdelen), `components/editor/panel/pawn-count-field.tsx`, `components/boxes/friend-form.tsx` (RadioGroup of ToggleGroup).
- Schuifjes: zoom in `components/editor/panel/image-section.tsx`, `layer-panel.tsx`, `style-section.tsx`, `center-background.tsx` (Slider; de tests gebruiken nu `fireEvent.change` op een native range).
- Dialoog op eigen Radix: `components/editor/preview-dialog.tsx` (Dialog, met Tabs).
- Uitklapblokken: `PanelSection` in `components/editor/panel/panel-parts.tsx`, `<details>` in `components/faq-list.tsx`, `components/print/print-bar.tsx` en `text-section.tsx`, en de knoppen met `aria-expanded` in `editions/choice-line.tsx`, `amount-fields.tsx`, `together-section.tsx`, `edition-panel.tsx` (Collapsible of Accordion).
- Menu's: het ⋯-menu in `components/editor/panel/panel-header.tsx` (eigen `role="menu"`), het accountmenu in `components/account-control.tsx`, het taalmenu en de scheidingslijn met kopjes in `components/editor-header.tsx` (DropdownMenu met Label en Separator).
- Eigen tabbalk: `role="tablist"` in `components/editor/editor-workspace.tsx` (Tabs).
- `FieldLabel`, `Field` en `StandardButton` in `components/editor/panel/panel-parts.tsx`: zelfde namen als shadcn's Field, eigen opmaak.
- Input met eenheid (`unit` in `components/ui/input.tsx`): kan InputGroup worden.

