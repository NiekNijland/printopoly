# Feedback Heino-test (persona: 19, student, telefoon 390x844, Riso)

Editie: "Heino Monopoly - voor Lars" (id 4e5dde00-11f7-48b7-b3d1-84c5c340bfa8), onderdelen: bord, eigendomsbewijzen, kans/algemeen fonds, pionnen, doosdeksel, later speelgeld. 27 vakken hernoemd (Zwembad De Tippe, Station Heino, Maria-Hemelvaartkerk, Kasteel Het Nijenhuis, VV Heino, enz.), 7 vakfoto's + doosdeksel-foto + foto op de bordmidden-tekst, 4 Kans + 4 Algemeen Fonds teksten, 2 biljetkleuren + banknaam. Thuisprint-set gemaakt en alle PDF's gedownload en bekeken. PDF's en PNG's staan in `scratchpad/feedback/heino/`.

Beperking van de test: de emulatie heeft geen schermtoetsenbord en geen echte aanraking (pinch). Toetsenbord-over-veld en pinch kon ik dus niet beoordelen; slepen met de muis en de zoomknoppen werkten wel. Foto's heb ik met een script op de file-input gezet; fotobestanden zijn synthetisch (3000x4000 jpg).

## Samenvatting

De editor werkt op een telefoon verrassend prettig: vast preview-vlak bovenin, formulier eronder, Vorige/Volgende onderaan om alle vakken af te lopen, live voorbeeld bij elke letter, autosave (herladen bewaart alles), Controle-melding bij een te lage fotoresolutie, undo/redo, speelgeldkleur per biljet. Het bord-PDF, de Kans-kaarten, het speelgeld en het doosdeksel kwamen goed uit de print.

Ernstigste probleem: de eigendomsbewijzen in de PDF (en de miniaturen op de printpagina) hebben nog de standaardnamen (Molenweg, Veldweg, Station Noord, Kerkstraat, ...) terwijl het bord en de editor-preview mijn namen tonen. Ook staan de standaard-Kanskaarten die ik niet aanpaste nog met oude straatnamen ("Wandel naar Raadhuisplein", "Ga naar Station Noord"). Daarnaast: het bord-overzicht in de editor is groen terwijl ik Riso koos (de PDF en het print-overzicht zijn wel roze), 429 bij Printen toont alleen "Er ging iets mis", en foutmeldingen bij foto's staan onder de vouw.

## Bevindingen

### 1. Eigendomsbewijzen in de PDF hebben de oude standaardnamen — blokkerend
- Waar: Printen > Thuisprint-set > kaarten-PDF (`home_cards.pdf`, 15 p.); ook miniatuur "Kaarten en eigendomsbewijzen" op de printpagina.
- Wat: alle 28 eigendomsbewijzen en hypotheekkaartjes tonen de standaardnamen (Molenweg, Veldweg, Station Noord, Kerkstraat, Station Oost, Havenkade, Raadhuisplein, Station Zuid, Kasteellaan, Kroonplein, Beurslaan, Station West...). `pdftotext` bevestigt dat geen enkele eigen naam in de eigendomsbewijzen staat. Bord-PDF heeft de nieuwe namen wel.
- Verwacht: eigendomsbewijs volgt de vaknaam (zoals de editor laat zien: bij Zwembad De Tippe > tab Eigendomsbewijs staat "Zwembad De Tippe" in de preview, en in de intro staat "nodig als je straatnamen verandert").
- Ernst: blokkerend (je print een set waarvan bord en akten niet bij elkaar passen).
- Reproduceren: nieuwe editie met eigendomsbewijzen, hernoem vak 1 naar iets anders, Printen > Thuisprint-set maken, download kaarten-PDF, kijk naar pagina 1.

### 2. Standaardkaarten verwijzen naar oude straatnamen — hinderlijk
- Waar: Kans-kaarten die ik niet herschreef (pdftotext: "Wandel naar Raadhuisplein", "Loop door naar Lindelaan"-achtig, "Ga naar Station Noord").
- Wat: na hernoemen blijven de standaardteksten met de oude namen staan; je moet zelf alle 32 kaarten nalopen. In de editor is dit niet te zien in het kaartenoverzicht (alleen cijfers 1-16, geen tekst).
- Verwacht: namen in kaarttekst volgen de vaknaam, of een waarschuwing in Controle ("kaart 2 noemt 'Raadhuisplein', dat vak bestaat niet meer").
- Ernst: hinderlijk.
- Reproduceren: hernoem Raadhuisplein, open Kans 2 in de editor of bekijk de PDF.

### 3. Bord-overzicht in de editor is groen terwijl thema Riso is — hinderlijk
- Waar: editor, tab Bord (en na herladen).
- Wat: het speelveld toont mintgroen met zwarte titel. De midden-editor (vak "Midden van het bord"), het print-overzicht en de PDF zijn roze met roze titel. Laag heet "Achtergrond: bordgroen" ook bij Riso.
- Verwacht: zelfde kleur overal, laagnaam niet "bordgroen" bij roze thema.
- Ernst: hinderlijk (je twijfelt of Riso wel gekozen is; ik heb in Instellingen moeten kijken).
- Reproduceren: nieuwe editie met Riso, open editor > Bord, vergelijk met "Midden van het bord" en de printpagina.

### 4. Printen: 429 wordt "Er ging iets mis" — hinderlijk
- Waar: Printen > "Thuisprint-set maken".
- Wat: twee keer direct "Er ging iets mis. Probeer het opnieuw." Netwerk: `POST /api/print-jobs` gaf 429 Too Many Requests (rate limit, waarschijnlijk deels door de andere testers op hetzelfde IP). Na ruim een minuut wachten lukte het (201). Er staat nergens "te veel aanvragen, wacht even".
- Verwacht: duidelijke tekst en eventueel hoelang wachten. De knop bleef daarna ook meteen weer klikbaar, wat herhaald klikken uitlokt.
- Ernst: hinderlijk (voor een echte gebruiker zeldzaam, maar de melding stuurt naar nutteloos opnieuw proberen).
- Reproduceren: meerdere keren snel achter elkaar op de maakknop tikken.

### 5. Na het maken val je terug op de tab "Drukkerij-set" — hinderlijk
- Waar: `/nl/print/<token>` na "Thuisprint-set maken" en bij herladen.
- Wat: ik maakte de Thuisprint-set maar de pagina opent op Drukkerij-set, waar alles "NOG NIET GEMAAKT" blijft staan. Pas na handmatig naar Thuisprint-set wisselen zie ik KLAAR / PDF / Instructies. Ik dacht even dat het was mislukt.
- Verwacht: tab van de gemaakte set openen, of op beide tabs aangeven dat er resultaten zijn.
- Ernst: hinderlijk.
- Reproduceren: Thuisprint-set maken, wachten, kijk welke tab open staat; herlaad.

### 6. Printpagina-miniaturen tonen standaardinhoud, niet mijn editie — klein
- Waar: Printen, miniaturen bij Kaarten/eigendomsbewijzen en Speelgeld.
- Wat: toont Kans "Draai om en loop recht naar Start", deed "Molenweg", biljetten 5 en 100 in standaardkleur (mijn 100-biljet is groen, thumb is blauw). Bord- en doosdeksel-miniatuur kloppen wel.
- Ernst: klein (verwarrend, hangt samen met 1).

### 7. Foutmelding bij fotobestand staat onder de vouw en is vaag — hinderlijk
- Waar: vak- of kaarteditor, "Foto kiezen".
- Wat: een nep-.heic (willekeurige bytes) of .tiff geeft "IMG_9999.heic kan niet: kies een JPEG, PNG, WebP of HEIC." De melding staat helemaal onderin het scrollende formulier (ca. 900 px van de bovenkant, buiten beeld, het paneel is op een telefoon maar ca. 300 px hoog). Zonder scrollen lijkt er niets te gebeuren. Voor de .heic-naam met rommelinhoud staat er ook "kies HEIC", terwijl het bestand HEIC heette; beter "dit bestand is beschadigd of geen echte HEIC".
- Een echte JPEG met .heic-naam werd wel gewoon geaccepteerd (goed).
- Verwacht: melding in beeld (scroll erheen, toast of naast de knop).
- Ernst: hinderlijk.
- Reproduceren: Foto kiezen > .tiff; scroll niet; kijk of je iets ziet.

### 8. Vakeditor: halve scherm is preview, formulierpaneel maar ca. 300 px hoog — klein
- Waar: editor, elk vak/kaart/biljet op 390x844.
- Wat: de preview neemt de bovenste helft in, het formulier eronder laat ongeveer 3-4 velden tegelijk zien. Het paneel onthoudt zijn scrollpositie tussen vakken, dus na "Volgende" sta je midden in het formulier en zie je de Naam niet (ik moest elke keer terugscrollen; ik heb er voor mijn script een scroll-naar-veld-hulp bij gebruikt).
- Verwacht: na Volgende scroll terug naar boven, of de preview kleiner/inklapbaar bij typen.
- Ernst: hinderlijk (50+ keer doen bij 40 vakken).

### 9. Tikdoelen en handvatten — klein
- Handvatten voor schalen/draaien van tekst- of foto-lagen op de bordmidden en het doosdeksel zijn ca. 12-14 px; op een telefoon met een duim bijna niet te raken. De "Foto draaien"-knop (⟳) heeft een heel klein icoon in een grote knop en geen label. Pinch kon ik niet testen; zoomknoppen (+/-) en slider werken (10% per tik).
- Nieuwe tekstlaag landt precies over de bordtitel; verslepen met de muis werkte.
- Ernst: klein.

### 10. Doosdeksel: titel is niet te verplaatsen en foto landt erover — klein
- Waar: Doos > Doosdeksel. Lagen: alleen "Foto" en "Achtergrond"; de titel "Heino Monopoly - voor Lars" is vast. Mijn foto (80 mm) landde over de titel en ik kan de titel niet wegschuiven. In de PDF is de titel half bedekt ("Heino Mo… voor Lars"). Controle meldt dit niet ("niets gevonden").
- Verwacht: titel als laag, of Controle-waarschuwing bij overlap.
- Ernst: klein tot hinderlijk (het is het deksel dat je cadeau geeft).

### 11. Checkboxes in Nieuwe editie en Instellingen worden smaller dan de rest — klein
- Waar: scherm Nieuwe editie en dialoog Instellingen, "Wat wil je maken?".
- Wat: de vinkjes bij "Eigendomsbewijzen" en "Kans en Algemeen Fonds" zijn 16 en 14 px breed, de andere 20 px (flex krimpt ze als de omschrijving over twee regels loopt). Tekst staat daardoor ook 2 px verspringend.
- Ernst: klein. Ook: alle checkboxes en radio's hebben als toegankelijke naam "on" (geen label gekoppeld), en de Lay-out-keuzes en kaartnummers (1-16) hebben geen naam (screenreader hoort "1", "2").

### 12. Thema-keuze op Nieuwe editie: tikken lukte niet altijd — klein
- Eerste tik op de kaart "Riso" selecteerde niets in mijn test; selecteren via het radiovinkje werkte. Kan een artefact van de emulatie zijn (mijn coördinaten stonden een tijd verkeerd), maar controleer of de hele themakaart tikbaar is. Ook zag ik tijdens het scrollen een paar keer een leeg scherm in een screenshot (render-vertraging), niet verder gereproduceerd.
- Ernst: klein (niet zeker).

### 13. Slepen op een foto selecteert de afbeelding — klein
- Waar: preview in vakeditor met muis. Na het slepen is de foto en "€ 60" blauw/rood gemarkeerd (browser-selectie) tot je ergens anders klikt. Op een echte telefoon waarschijnlijk niet zichtbaar, op tablet met muis wel.
- Verwacht: `user-select: none` op de preview.

### 14. Kaartenoverzicht toont alleen nummers — idee
- Waar: tab Kaarten: 2 x 16 blokken met alleen "1".."16". Je ziet niet welke kaart je al herschreven hebt of wat er staat. Idee: begin van de tekst in het blokje, of een stipje bij aangepaste kaarten (zoals bij vakken, daar is dat al zo).

### 15. Overig, klein
- Menu (hamburger) duwt de pagina naar beneden in plaats van eroverheen; werkt, wel veel scrollen.
- Escape sluit het Controle-paneel niet duidelijk; het paneel bedekt de tabs Vak/Eigendomsbewijs. Sluiten kan met nogmaals op de Controle-knop tikken.
- Bij "Midden van het bord" staat de titel twee keer ("Midden van het bord" / "Midden van het bord").
- Er is geen deelknop op de printpagina (navigator.share niet beschikbaar in deze browser; ik heb geen deel- of kopieerknop gevonden). Idee: "Kopieer link" om de downloadlink naar mezelf of de drukker te sturen, nu moet ik de URL uit de adresbalk halen.
- Biljet-kleur kiest met de native kleurkiezer, geen paletten of voorbeeldkleuren; werkt, maar op een telefoon lastig om "mooi" te raden. Idee: een rij vaste kleuren.
- Lichtbol-icoon blijft bij "Windmolen Heino" en kan niet gekozen worden. Idee: icoonkeuze bij nutsbedrijven.

## Wat goed werkte
- Live preview bij typen; autosave en herladen bewaarde namen, foto's, kaarten en instellingen; stipje bij aangepaste vakken.
- Foto toevoegen schakelt vanzelf naar "Foto in kader"; resolutie in dpi met "scherp genoeg"; zoom 100-300%; zwart-wit en kwartslag draaien gaven in PDF dezelfde look als de preview (VV Heino-foto).
- Controle waarschuwt correct: 400x600 foto op 300% zoom gaf "Resolutie 94 dpi, te laag", met naam van vak, en wordt weer 0 na herstel.
- Undo/redo werkt (ook na foto verplaatsen).
- Instellingen > Speelgeld aanzetten: nieuwe tab Geld, kleur per biljet, banknaam geldt voor alle biljetten; PDF toont geel 50 en groen 100 met "Spaarbank Heino".
- Snelheid: Thuisprint-set (7+15+35+1+1 pagina's, 685 kB zip) was binnen ongeveer een halve minuut klaar. Foto's van 3000x4000 verwerken in ca. 1-2 s per foto (de 7 s in mijn log was het genereren van het testbeeld). Geen console-errors behalve de twee 429's.
- Print-PDF's: bord (7 A4, snijmarkeringen, foto's op de goede vakken), Kans-kaarten met mijn teksten en rugzijde, speelgeld met banknaam, pionnen, A3-doosdeksel; instructiepagina's per onderdeel zijn duidelijk.

## Console
`read_console_messages`: alleen `Failed to load resource: 429` (2x) tijdens Printen. Verder niets.
