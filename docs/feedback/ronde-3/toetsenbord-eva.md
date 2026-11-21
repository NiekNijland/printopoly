# Feedback ronde 3: Eva, toetsenbord en slechtziend (desktop 1440x900 op 150% zoom)

Persona: Eva, 45, slechtziend en RSI. Werkt alleen met het toetsenbord (Tab, pijltjes, Enter, Esc, de sneltoetsen achter `?`). Soms een schermlezer. Maakt edities voor haar boekenclub en haar familie, past veel bedragen en teksten aan en gebruikt ongedaan maken veel.

Hoe ik gemeten heb: puppeteer met Chrome. 150% zoom op 1440x900 is een venster van 960x600 CSS-pixels (deviceScaleFactor 1,5). Daarna ook 125% (1152x720). Ik heb de toegankelijkheidsboom (`page.accessibility.snapshot()`), de focusvolgorde, focusringen, contrast en dialogen gemeten. Er is geen echte schermlezer gebruikt. Wat ik over schermlezers zeg komt uit de boom en uit wat er in aria-live-gebieden verschijnt.

Gemaakt:
1. **Boekenclub De Lezers**: sjabloon Vriendengroep, thema Riso, Nederlands, euro. Aangepast: 11 vaknamen, 4 prijzen, 4 Kanskaarten, een foto op Bibliotheek Noord, de woorden Huis/Hotel/Bank, Controle bekeken. Geprint: thuisprint-set (bord 7 vel, kaarten, pionnen).
2. **Familie Van den Berg**: sjabloon Familie, thema Klassiek, Nederlands, euro. Aangepast: 6 vaknamen (ook een lange), 2 prijzen, 4 kaarten, 3 foto's op vakken (waaronder een piepkleine), een foto in het ovaal van het biljet van 20. Geprint: thuisprint-set met bord, kaarten, speelgeld (35 vel) en pionnen.
3. **Grandma Toos' 80th**: leeg begonnen, thema Riso, taal English, eigen munt "T". Aangepast: 3 namen, 1 prijs, speelgeld en doosdeksel aangezet, een foto van 400x300 px op het doosdeksel. Geprint: drukkerij-set (bord, kaarten, speelgeld, doosdeksel). Let op: dit was mijn tweede speelgeldrun (de drukkerij-set zet speelgeld standaard aan en ik zag dat te laat). Verder één run per set.

Ook: een eerste, rommelige editie (verkeerde vakken hernoemd door een fout in mijn script) heb ik via het menu verwijderd. Dat verwijderen werkte goed. Een vriendenlink voor Boekenclub gemaakt en in een tweede profiel geopend.

## Samenvatting

De site is voor het toetsenbord veel beter dan ik verwachtte. Focusringen zijn overal dik en zichtbaar, dialogen houden de focus vast, er zijn sneltoetsen met een uitzetknop, en de tekst-op-achtergrond-contrasten van de echte interface halen de norm. De PDF's zien er mooi uit en de printpagina meldt voortgang netjes via aria-live. Het grootste probleem is zoom: op 150% (960 px breed) schakelt de editor naar de telefoonindeling. Dan is de voorvertoning van een vak nog geen 100 px breed, terwijl het scherm 1440 px breed is. Het tweede probleem is dat de focus op veel plekken naar `body` valt (na Esc, na een foto uploaden, na een pijltjestoets in de bordlijst), en dan werken de losse-letter-sneltoetsen op de verkeerde plek. Het derde: ongedaan maken doet wat het moet, maar laat niet zien of horen wat het ongedaan maakte.

## Werkt niet (bugs)

**1. Op 150% zoom krijg je de telefoonindeling met een piepkleine voorvertoning.** Hinderlijk, voor mijn persona bijna blokkerend.
- Waar: editor, vensterbreedte onder 1024 CSS-pixels (1440 px op 150% is 960).
- Wat: het bord is ca. 300 px breed, het vak in de detailweergave ca. 70 px breed. De voorvertoning krijgt 360 px hoogte van de 600 en het formulier eronder krijgt maar 1,5 veld zichtbaar. Voor iemand die zoomt omdat ze slecht ziet, is dit het omgekeerde van wat ze nodig heeft.
- Verwacht: bij 960 px nog de driekoloms-indeling (of twee kolommen), of een voorvertoning die de ruimte gebruikt.
- Stappen: venster 960x600, open een editie, kies een vak en druk op Enter.
- Screenshots: `img/toetsenbord-eva/150pct-editor-telefoonindeling.jpg`, `150pct-detail-kleine-preview.jpg`, `150pct-formulier-klein.jpg`.

**2. Na Tab door het instellingenpaneel schuift de hele werkruimte omhoog en blijft onderaan een lege band staan.** Hinderlijk.
- Waar: editor, desktop-indeling, venster 1152x720, Editie (sneltoets `E`).
- Wat: `<main>` (overflow-auto) kreeg scrollTop 108, de linkerkolom 25, en de paneelkolom meer dan 2000. De drie kolommen staan dan 108 px te hoog, de koppen van de kolommen zijn half weg en onderaan is een lege beige band. Het gebeurt als de focus door Tab ver in het paneel komt.
- Verwacht: alleen het paneel scrolt.
- Stappen: open een editie, druk `E`, zet de focus in Naam, Tab 40 keer.
- Screenshot: `img/toetsenbord-eva/layout-verschoven-lege-band.jpg`.

**3. De focus valt vaak naar `body`.** Hinderlijk, bij een schermlezer ernstiger.
- Gemeten gevallen: Esc in de Sneltoetsen-dialoog en in de verwijderdialoog (focus gaat niet terug naar de knop die de dialoog opende, in Mijn edities moet ik dan ~11 keer Tab); Esc in een tekstveld van het kaartpaneel; een foto uploaden (de knop "Foto kiezen" wordt "Andere foto" en de focus verdwijnt); in de telefoonindeling na Enter op een vak (de detailweergave opent, de focus blijft op `body`); in de telefoonindeling na een pijltjestoets in de bordlijst.
- Goed: Controle (Esc) en het verwijderen van een editie zetten de focus wel op een logische plek.
- Waarom erg: met focus op `body` doen losse letters iets. Ik typte per ongeluk tekst op `body` en dat opende o.a. Instellingen en de voorvertoning. Er ging niets stuk, maar met RSI is een verkeerde toets duur.
- Verwacht: na sluiten terug naar de opener, na een weergavewissel naar de kop van het nieuwe scherm, na upload naar de nieuwe knop.

**4. Een bedrag buiten het bereik wordt stil teruggezet.** Hinderlijk.
- Waar: Prijs (en andere bedragen) in het veldenpaneel.
- Wat: ik typte 75 bij een prijs van 60 (toegestaan 48 tot 72) en drukte Enter. Het veld sprong terug naar 60. Er was geen melding en geen vastzetten op 72. Het bereik staat wel onder het veld in kleine tekst ("standaard € 60, 48 tot 72").
- Verwacht: vastzetten op 72 met een melding, of een foutmelding gekoppeld aan het veld (aria-describedby / aria-live).
- Screenshot: `img/toetsenbord-eva/prijs-buiten-bereik.jpg`.

**5. Ongedaan maken en Opnieuw geven geen enkele terugkoppeling.** Hinderlijk, voor mijn persona belangrijk.
- Wat: ik wijzigde drie dingen op drie verschillende vakken en drukte drie keer Ctrl+Z. De selectie bleef op het laatste vak. De tweede en derde stap gingen onzichtbaar terug. Er is geen toast, geen aria-live-tekst ("Naam van De Opel van papa hersteld") en de selectie springt niet naar het vak.
- Ook: na het herladen van de pagina is de ongedaan-geschiedenis weg (de knoppen staan uit). Dat is verwacht, maar niet vermeld.
- Verwacht: de selectie en het tabblad gaan mee naar het gewijzigde vak, plus een korte melding.

**6. In de telefoonindeling doet Enter niet wat de sneltoetslijst belooft.** Klein.
- Wat: de lijst zegt dat F2 of Enter naar het naamveld gaat. In de telefoonindeling opende Enter na `j`/`k` niets. Enter opende alleen een vak als de bordlijst zelf de focus had (via Tab en pijltjes).

**7. Mogelijk verlies bij snel sluiten.** Klein, niet zeker.
- Wat: ik typte vijf Woorden-velden (Huis, Hotel, Bank), tabde weg en sloot de browser binnen een paar seconden. Bij het heropenen waren ze weg. Met 3 seconden wachten bleven ze staan. Het lijkt een bewaarvertraging. Een echte gebruiker die direct de tab sluit kan een woord kwijtraken.

**8. Sneltoetslijst klopt niet bij edities zonder Geld.** Klein.
- De lijst noemt "Bord, Kaarten, Geld of Doos 1...4". In Boekenclub (zonder speelgeld) is `3` de Doos. Dat is logisch, maar de lijst en de tabbladen moeten hetzelfde zeggen.

**9. Standaardthema bij Leeg lijkt te verschillen van wat de nieuwe-editiepagina toont.** Klein, niet zeker.
- Bij Grandma Toos' 80th toonde de pagina "Leeg · Klassiek · 3 onderdelen". De gemaakte editie bleek Riso. Ik had de taal op English gezet. Een nieuwe Leeg-editie in het Nederlands werd wel Klassiek. Ik kon de oorzaak niet isoleren.

## UX: wat kan beter

- **Sneltoetsen met losse letters staan standaard aan.** De dialoog zegt zelf dat je ze moet uitzetten bij een schermlezer. Voorstel: laat de keuze bij de eerste keer in de editor zien, of zet losse letters standaard uit en laat Ctrl/Cmd-toetsen aan. Samen met de focusproblemen (punt 3) is dit voor RSI en schermlezers de grootste valkuil.
- **De Controle-popover opent rechtsboven en dekt de voorvertoning en de eerste velden af.** Bij 150% staat hij ver van de knop (onderaan). Voorstel: open hem bij de knop of als zijpaneel, en laat de items naar het vak springen.
- **Een enkele editietitel in de kop wordt afgekapt.** "Alleen in deze browser · 19:24 · Inlog…" en de editienaam ("Boekenclub D…") zijn bij 1152 px al ingekort. De opslagstatus is belangrijk voor mij omdat ik niet zie of het bewaard is.
- **Kopstructuur.** Op de editorpagina is er geen h1 (begint bij h2). Op de landingspagina staat de h2 "Verder met" vóór de h1. Klein, maar schermlezergebruikers navigeren op koppen.
- **Skiplink.** "Naar de inhoud" werkt (hash `#content`), maar de focus blijft op `body`. Chrome verplaatst het startpunt wel, maar de focus-uitvoer is dan leeg.
- **Nieuwe editie.** De focus staat bij het laden al in het naamveld (selectie actief). Handig, maar de sjabloonkeuze staat ervoor. Wie een ander sjabloon wil, moet met Shift+Tab terug. De sjabloonkaarten zijn goed benoemd als radio met omschrijving.
- **Mijn edities.** Twee edities met dezelfde naam zijn alleen te onderscheiden aan "Aangepast: 64". Voorstel: toon tijd, sjabloon of thema in de kaart. De tabvolgorde per kaart is Meer opties, Openen, Printen. Dat is prima, maar de menuknop komt vóór Openen. Voor het toetsenbord zou Openen eerst logischer zijn.
- **Kleine tekst.** Tellingen ("10/41"), de status "nog niet gemaakt", de printspecificaties en de bereiktekst zijn 12 px mono. Bij 150% is dat redelijk, maar het is wel de belangrijkste informatie voor mijn persona. Voorstel: minimaal 14 px, en een instelling "grotere tekst".
- **Bedragen typen.** Tab naar een bedragveld selecteert de inhoud (goed), maar Enter na typen gaat terug naar de bordlijst en laat het resultaat niet zien. Voorstel: Enter vastleggen en blijven, Tab vastleggen en doorgaan.
- **Instructies-pdf in de taal van de editie.** Mijn Engelse editie gaf Engelse instructies terwijl de pagina Nederlands is. Waarschijnlijk bedoeld, maar vertel het erbij.
- **Speelgeld thuis: 35 vel A4.** Het staat niet bij de keuze zelf in beeld. De instructie zegt wel "Overslaan mag". Voorstel: zet het aantal vel op de rij en laat minder biljetten per coupure toe.

## Ontwerp

- Wat mooi was: het spel zelf. De landing, het voorbeeldbord, de Riso-look, het speelgeld met het gegraveerde ovaal (ook met foto) en de eigendomsbewijzen. De vriendenpagina (Samen maken) is warm en duidelijk. De printpagina met voortgang is rustig.
- Focusringen: 3 px, donker op licht en wit op rood. Bij een gekozen radio komt er een dubbele ring. Dat is duidelijk. Op de kaarten van de landing is de ring niet afgesneden. Een van de beste punten.
- Contrast: ik heb alle zichtbare tekst gemeten. Er zijn geen echte fouten in de interface. De meldingen komen alleen uit de gerenderde bord- en kaartvoorbeelden (wit op lichte band in Riso, dat zijn illustraties) en uit de uitgeschakelde "Downloaden (ZIP)"-knop (3,2:1, mag). Het enige echte punt: de rode stapnummers 1 tot 4 op de landing zijn 4,18:1 op lichtgroen, net onder 4,5.
- De groep "Bruin" is in Riso paars in de voorvertoning (preview en bord op groot formaat), maar bruin in het kleine bord links. Dat is verwarrend: de groepsnaam zegt bruin.
- Het midden van het kleine bord in de telefoonindeling kapt de naam af ("Boekenclub D…").
- PDF's: de kaarten, het geld en het doosdeksel zijn scherp en netjes uitgelijnd, met snijtekens. De 42 dpi-foto op het doosdeksel is in de PDF zichtbaar korrelig, en de site waarschuwde er wel voor (zie Wat goed werkte). `img/toetsenbord-eva/pdf-eigendomsbewijzen.jpg`, `pdf-biljet-foto.jpg`, `pdf-doosdeksel-lage-res.jpg`.

## Features die ik zou willen

- **Lijstweergave voor alle namen en bedragen (must).** Ik pas er 40 vaknamen en prijzen aan. Nu is dat 40 keer zoeken, F2, typen, Enter. Een tabel waar ik met pijl omlaag door de namen en bedragen ga (zoals een spreadsheet) scheelt veel toetsaanslagen en dus pijn.
- **Een lijst plakken (must voor mijn persona).** Plak 22 straatnamen uit mijn boekenclub-document en ze vullen de vakken in volgorde.
- **Grote voorvertoning en grotere interface bij zoom (must).** Zie bug 1. Een schakelaar "Grote tekst" en een voorvertoning die de ruimte benut.
- **Een lijst van wijzigingen met ongedaan maken per stap (nice).** "Prijs Café De Pagina 100 naar 110" met een knop terug. Ongedaan maken blijft na herladen bestaan (nice).
- **Aantal biljetten en coupures aanpassen (nice).** Voor een gezin van vier is 30 biljetten per coupure veel en 35 vel is een flinke stapel.
- **Losse sneltoetsen uitgezet voor schermlezers vanzelf (must).** Herken een schermlezer of vraag het bij de eerste keer.
- **Eigen munt met woord erbij (nice).** Ik gaf "Toos-coin" op, in het geld zie je alleen het teken "T". Een naam naast het teken, of zeggen waar de naam wordt gebruikt.
- **Alle teksten van de editie als tekstbestand exporteren en terug importeren (nice).** Om op haar eigen manier na te lezen met een leesregel.

## Wat goed werkte

- Alle 3 de edities lieten zich met alleen het toetsenbord maken, aanpassen en printen. Dat is niet vanzelfsprekend.
- `J/K`, `1` tot `4`, `F2`, `E`, `C`, `V`, `Ctrl+P` en `?` werken. Typen in een veld doet niets met de letters. De Sneltoetsen-dialoog is volledig en heeft een uitzetknop.
- Dialogen: Sneltoetsen, Verwijderen en Voorbeeld houden de focus vast. Verwijderen begint op Annuleren (veilig) en meldt "Editie verwijderd." met focus op een logische plek.
- Het Controle-oordeel zag de lage resolutie van mijn foto: "De foto heeft 42 dpi op dit formaat. Kies een grotere foto of zoom minder in."
- De printvoortgang meldt per onderdeel in een `status`-gebied (wacht, wordt gemaakt, klaar, "3 van 3 klaar"). Een schermlezer hoort dat. Een thuisprintrun duurde 10 tot 45 seconden.
- Namen in de toegankelijkheidsboom zijn goed: "Prijs lager", "Prijs hoger", "Meer opties voor …", "Bibliotheek Noord aangepast", "Naam terug naar standaard", radio's met omschrijving, `lang`-attribuut per taal, geen plaatjes zonder alt.
- Taalwissel van bord en kaarten past de standaardteksten en de munt aan en zegt dat erbij.
