# Feedback Lemelerveld (EN-editie, thema Riso, euro)

Tester: ontwerper, 28, 1920x1080 en 1024 px, Chrome-pane (tab-15). Editie "Lemelerveld" (id ca7b058d-300c-474c-a407-9774978d2193), alle onderdelen aan. PDF's staan in `/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly/08bf87c2-2f81-4fd8-88d6-54bc7cbea685/scratchpad/feedback/lemelerveld/` (board, cards, money, tokens, box_lid, instr-*, printer.zip).

## Samenvatting

De site zelf oogt verzorgd: rustige landing, duidelijke stappen, een editor die op 1024 px zelfs prettiger leest dan op 1920. Twee dingen blokkeren een echte gebruiker echter: (1) een editie met meer dan 20 unieke foto's kan niet geprint worden ("Something went wrong"), en (2) de gedrukte eigendomsbewijzen (28 stuks) hebben nog de standaardnamen (Mill Lane, North Station...) terwijl bord en editor mijn Lemelerveld-namen tonen. Daarnaast: Nederlandse tekst op de Engelse site (profielnaam "Modern vierkant", foutmelding van de API), mini-bord in de editor volgt het Riso-thema niet, print-thumbnail van kaarten toont de oorspronkelijke namen, en de Riso-uitstraling in de PDF is vlak (zachtroze achtergrond + felle kleurbalken, geen Riso-karakter). De Controle meldde nul bij een foto van 300x200 px en bij een naam van zes regels.

Opmerking over de omgeving: ik deelde IP en browserprofiel met vier andere testers. Printen gaf daardoor ook 429 (throttle 6/min) en 422; die twee heb ik apart gemarkeerd. De coördinator meldde dat een lege Chrome-pad in .env printjobs liet falen; dat staat niet in mijn 422 (die had een andere oorzaak, zie 1).

## Bevindingen

### 1. Print mislukt bij meer dan 20 foto's (PHP `max_file_uploads`)
- Waar: Print-pagina, "Make print shop set" (POST /api/print-jobs).
- Wat: Met 22 unieke foto's in de editie krijg ik "Something went wrong. Please try again." (422, body: "Er ontbreekt een foto van je editie."). Elke retry faalt hetzelfde. Zodra ik foto's weghaal (Ambachtsweg, Free Parking, Pawn 3, dus 19 foto's) slaagt de job meteen. Bij 21 foto's (klient stuurt 21 `photos[...]`) faalt hij nog; bij 20 werkt het. In de container is `max_file_uploads` = 20, terwijl de app-limiet (`anonymous_photos_per_job`) 60 is. PHP laat de bestanden na nummer 20 stilletjes vallen en `assertAllPhotosPresent` ziet ze dan als "ontbrekend".
- Verwacht: tot de eigen limiet (60) werkt het; of anders een duidelijke melding "maximaal 20 foto's" in de editor/Controle.
- Ernst: blokkerend (een fotorijke editie met 8 spaces + pionnen + geld + deksel + kaart komt er snel overheen; 8 straten-foto's alleen is al het halve budget).
- Reproduceren: nieuwe editie, alle onderdelen aan; 21 verschillende foto's toevoegen (spaces, deeds, pionnen, deksel, centrum, regels); Print; Make print shop set. Controle zegt "nothing found".
- Suggestie: `max_file_uploads` verhogen in php.ini (ook in productie/ansible) of foto's in 1 request als zip/batches uploaden; Controle moet dit aantal tellen.

### 2. Gedrukte eigendomsbewijzen tonen de oude standaardnamen
- Waar: cards.pdf (page 1-56) en de thumbnail op de Print-pagina.
- Wat: Alle 28 deeds in de PDF heten nog Mill Lane, Field Road, North Station, Church Street, School Street, Brook Street, Linden Avenue, Electric Company, Oak Avenue, Birch Avenue, East Station, ... Crown Square. Bord (board.pdf) en de editor (Title deed-tab) tonen wel mijn namen (Dorpsstraat, Marktplein...). Ook de "Mortgage"-achterkant heeft de oude naam. Een speler zou dus een bord met "Dorpsstraat" en een akte "Mill Lane" krijgen. Code-aanwijzing: editor zoekt de deed op `space` (element-preview.tsx), print leest `resolved.deeds[index].name` (print/item-art.tsx); lijkt dat de naamoverschrijving niet meekomt in de printdata.
- Verwacht: akte heet zoals de space ("Title deeds · needed if you change street names" zegt dat zelfs).
- Ernst: blokkerend (print is onbruikbaar zonder handmatig 28 akten hernoemen, en dat is niet duidelijk).
- Reproduceren: nieuwe editie, hernoem alle 28 spaces, Print, maak set, open cards.pdf (`pdftotext`). Let op: ik hernoemde met geautomatiseerde invoer (input-events) in plaats van losse toetsaanslagen; de naam komt wel in editor, bord en deed-tab goed terecht, dus het verschil zit tussen editor-state en printdata.

### 3. Foutmelding op de Print-pagina is nietszeggend en deels Nederlands
- Waar: Print-pagina na mislukte job.
- Wat: Elke fout (422 foto ontbreekt, 429 throttle, vermoedelijk ook "te veel actieve jobs") geeft dezelfde gele balk "Something went wrong. Please try again." De API-respons zelf is Nederlands ("Er ontbreekt een foto van je editie...") ook op /en, omdat /api geen locale kent. Console: 10x "Failed to load resource 422/429".
- Verwacht: onderscheid tussen "even wachten, je hebt te vaak gedrukt" (429), "foto ontbreekt/te veel foto's" en echte serverfout; in de taal van de pagina.
- Ernst: hinderlijk (maakt probleem 1 onbegrijpelijk).
- Reproduceren: 7 keer binnen een minuut op Make klikken (429); of probleem 1.

### 4. Nederlandse tekst in de Engelse interface
- Waar: /en/editions/new, sectie "Board": "Modern vierkant" (profielnaam). Verder bij het openen van Nieuwe editie: alle thema-previews (Classic/Riso/Sleek) tonen kort Nederlandse spacenamen ("Algemeen Fonds", "Molenweg", "€ 60") terwijl taal op English staat en de naam al "Our edition" is; pas na een klik wisselt de preview naar mijn naam, de spacenamen in het thema-blok blijven in de pagina-tekst Nederlands. Ook in de lijst "My editions" (van anderen) stond "Onze editie".
- Verwacht: alles Engels op /en.
- Ernst: klein.
- Reproduceren: /en/editions/new, onderaan Board, en `get_page_text` toont de NL-previews.

### 5. Controle ziet niets bij duidelijke kwaliteitsproblemen
- Waar: Check-knop (rechtsboven). Melding: "nothing found. Checked: photo sharpness, text and board size."
- Wat: (a) foto van 300x200 px op een space (169 dpi, label "sharp enough"); (b) naam van 6 regels ("Industrieterrein Zuid Bedrijvenpark Febriek Lemelerveld Noord") op een straat; (c) een deed in "Photo in frame" zonder foto toont een leeg beige vlak; (d) House rules-kaart zonder foto toont een grijs vlak; (e) pionnen 3-8 zonder foto. Niets werd gemeld.
- Verwacht: (a) waarschuwing onder ~200-300 dpi voor drukwerk (169 dpi als "sharp enough" is te mild voor een printshop); (b) tekst-past-niet waarschuwing; (c)/(d) lege fotokader; (e) hoeft niet.
- Ernst: hinderlijk.
- Reproduceren: zie hierboven; Check tonen via de knop.
- Idee: de 20-fotolimiet (1) en een niet-doorgenomen deed-foto horen hier ook in.

### 6. Mini-bord in de editor volgt het Riso-thema niet
- Waar: Editor, linkerkolom, mini-bord (en Board-overzicht).
- Wat: Mini-bord is groen met bleke spaces (Classic-kleuren), terwijl het centrum-canvas en de PDF roze zijn (Riso). Ook laat het mini-bord mijn centrumlagen (tekst, foto) niet zien; het centrum blijft leeg. Laagnaam "Background: board green" terwijl het roze is.
- Verwacht: overzicht = wat je print.
- Ernst: klein (verwarrend voor wie in één oogopslag het bord wil beoordelen).
- Reproduceren: nieuwe editie met Riso, centrumlaag toevoegen.

### 7. Bordoverzicht in de editor is erg klein op een groot scherm
- Waar: Editor 1920x1080, linkerkolom.
- Wat: Het mini-bord is ongeveer 130 px en lijst met spaces toont ~10 rijen; de rest van het scherm is voorbeeld van één space. Een ontwerper wil zijn hele bord groter zien (en klikbaar). Het centrum is te vinden door op het mini-bord te klikken; dat is nergens aangegeven ("Centre of the board" ontbreekt in de lijst).
- Ernst: idee/hinderlijk.

### 8. Riso-thema in print is vlak
- Waar: board.pdf, cards.pdf, box_lid.pdf.
- Wat: Riso = zachtroze achtergrond (#fff2f6-achtig) en felle gesatureerde kleurbalken (magenta, geel, blauw, rood), maar zonder kenmerken die Riso herkenbaar maken (korrel/halftone, bijna-overlap van twee inktkleuren, beperkt palet). Eigendomsbewijzen en Mortgage-achterkanten zijn wit met zwarte lijnen (geen Riso). Geldbiljetten zijn standaard beige/pastel. Ook Chance en Community Chest blijven lichtblauw/roze (Classic-achtig). Kleurmatching tussen bord (felle balken) en kaarten is dus niet consistent.
- Verwacht: een thema dat het hele pakket doorvoert.
- Ernst: idee.

### 9. Eigendomsbewijzen: Title deed-tab bewerkt andere layout dan de Space-tab
- Waar: Editor, Space/Title deed-schakelaar.
- Wat: Rechterpaneel blijft "Marktplein / Space" heten, ook op Title deed-tab. Layout, foto en zwart-wit staan er los per tab (Space: foto in kader; Deed: "Text only"). Verwacht is dat de deed de foto van de space overneemt of dat het paneel zegt "Title deed".
- Ernst: klein.
- Reproduceren: space met foto, tab Title deed: layout "Text only", foto leeg.

### 10. Layout-opties: maar twee
- Waar: Spaces, deeds, kaarten: "Photo in frame" en "Text only".
- Wat: Geen full-bleed, geen foto links/rechts, geen kleurkeuze voor tekstlagen in het centrum (alleen tekst, grootte, draaiing); ook geen lettertypekeuze. Deksel: foto ligt in een kader, niet full-bleed. Start-hoek: foto vervangt de richtingspijl, dus de spelrichting verdwijnt van het bord.
- Ernst: idee.

### 11. Standaardkaarten verwijzen naar oude namen en blijven Engelse standaardtekst
- Waar: Cards, Chance 2 ("Stroll over to Town Hall Square...", "Advance to the last red space (Town Hall Square)"), "Go to the nearest station" enz.
- Wat: Na hernoemen van Town Hall Square -> Dorpsplein en de stations verwijst de standaardtekst nog naar de oude naam. Ook staat bij een eigen kaart de naam van de oude standaard onder "Standard card" (handig), maar die tekst volgt de rename niet.
- Ernst: hinderlijk.

### 12. Print-pagina: thumbnail en termen
- Waar: /en/editions/.../print.
- Wat: (a) Thumbnail van "Cards and deeds" toont "Mill Lane / Chance: Turn around..." ook na mijn wijzigingen (alleen de lijst met 61 kaarten klopt). (b) Onderdeel heet "Tokens" op de printpagina en "Pawns" in editor en guide. (c) Het 8x tonen van pionnen: standaard worden 8 pionnen geprint waarvan 6 leeg/zonder foto, zonder keuze hoeveel. (d) "3 mm bleed on top" bij Board verwart. (e) Test sheet staat bovenaan met knop "Make" maar zonder vinkje; wie print-shop set maakt krijgt geen proefvel (staat wel in tekst, goed). (f) In de job-pagina wordt Home-set bij print-shop set wel gelijk zichtbaar maar niet nodig.
- Ernst: klein.

### 13. Instructie-PDF's zijn kaal en onduidelijk over aantallen
- Waar: instr-board/cards/money/tokens/box_lid.pdf.
- Wat: Eén pagina Arial/Helvetica zonder logo, editienaam of thema; bevat zowel print-shop als home-print uitleg ook als alleen de print-shop set gemaakt is. Cards-instructie zegt "60 cards (61 with the house rules card)" terwijl mijn PDF 61 kaarten heeft (122 pagina's); de printshop-bestelling moet één getal hebben.
- Verwacht: huisstijl, juiste aantal voor mijn editie, alleen mijn set.
- Ernst: klein/idee.

### 14. PDF-details die goed zijn (en kleine puntjes)
- Goed: fonts ingebed (League Spartan, Instrument Sans), board 4x 254x254 mm (3 mm bleed), kaarten 69x94 mm (bleed), geld op SRA3 met snijmarkeringen, tekstlaag in het centrum zonder het witte kader dat de editor als selectie toont, 6-regelige lange naam past binnen de space, lage-dpi foto's worden niet geweigerd.
- Klein: straatnamen op het bord zijn heel klein gezet (op 60 dpi vrijwel onleesbaar, op 150 dpi ok), lange namen zoals "Energiecoöperatie Lemelerveld" breken midden in het woord over twee regels in een nog kleinere maat. "Play money: €1" kopregel op de geldvellen zit vlak tegen de snijmarkering. Pionkaarten hebben een crèmekleurige vulling, niet wit (valt op tegen wit papier); foto's in pionnen worden bovenaan afgesneden. Foto's in space-kaders krijgen rotatie mee zodat tekst in de foto ondersteboven staat (verwacht gedrag, wel duidelijk).

### 15. Overige pagina's (landing, guide, FAQ, privacy, terms, contact)
- Goed: heldere hero, duidelijke 4 stappen, FAQ en Print guide zijn nuttig. Contactpagina met drie kaarten ziet er netjes uit; footer met kleurbalk past bij thema.
- Klein: (a) Terms noemen abuse@printopoly.nl, Contact zegt "Email the same address" maar toont alleen hallo@printopoly.nl, tegenstrijdig. (b) Op 1024 px staat de hero-illustratie onder de vouw (eerste scherm is alleen tekst); pagina-header-illustraties op guide/FAQ/privacy/terms zijn zo vaag (lage opacity) dat ze een leeg vlak lijken; op 1920 is de hero-kolom smal (±350 px tekst) met veel lege ruimte rechts. (c) Print guide blok "Start with the proof sheet" toont een lege groene rechthoek zolang illustratie nog niet gefaded is. (d) Pagina-titels voor sommige routes zijn kort "Printopoly" tot de pagina geladen is (tabtitel flikkert).
- Ernst: klein.

### 16. Editor-stale veld (onder voorbehoud)
- Waar: Rechterpaneel (Name/Amount) na wisselen van selectie, wanneer het veld focus had of via geautomatiseerde invoer was gevuld.
- Wat: Naamveld bleef "Dorpsfeest Square" tonen terwijl Kanaalbrug geselecteerd was, en bij kaart "Amount" bleef -50 staan terwijl de kaart "Collect €150" toonde. Na herladen klopte alles. Bij gewone muis/toetsenbord-invoer zag ik het niet; waarschijnlijk een artefact van mijn testmethode, daarom laag vertrouwen.
- Ernst: klein.

## Consolecontrole
Alleen "Failed to load resource" 422 (4x-6x) en 429 (4x), allemaal van /api/print-jobs. Geen JS-fouten.

## Wat ik heb gedaan (kort)
- 28 spaces hernoemd naar Lemelerveld (Dorpsstraat, Kerkstraat, Kanaalpark, Handelsweg, Ambachtsweg, Parallelstraat, 't Febriek, Lemelerberg, Kanaalkade, Marktplein, Vechtdijk, Kanaalbrug, Sportpark Lemelerveld, Dorpsplein, Hoogenweg, Brugstraat, Kerkplein, Beatrixlaan, Zwartewaterweg, Zandweg, Kasteellaan, Dorpsfeest Square; stations en nutsbedrijven omgedoopt). Zoektocht leverde een beperkte straten/bedrijvenlijst op; niet elke naam is geverifieerd.
- Foto's: 13 op spaces/corners (3 later verwijderd i.v.m. probleem 1), 1 deed (zwart-wit), 1 kaart, centrumfoto + eigen tekstlaag, deksel, 3 pionnen (Niek, Sanne), geldbiljet (kleur, banknaam "Vechtdal Bank Lemelerveld"), regelskaart.
- 7 eigen kaarten met bedragen, 6 huisregels, zwart-wit op Kanaalbrug en een deed.
- Printer-set gemaakt na het terugbrengen naar 19 foto's.
