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
