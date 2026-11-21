# Feedback ronde 3: Henk, bestuurslid korfbalclub (desktop 1366x768)

Persona: Henk, 61, bestuurslid van een korfbalclub. Hij begint leeg, zet alle onderdelen aan, wil 8 pionnen, huisregels en een eigen bordmaat. Op het clubfeest verkoopt hij exemplaren, dus hij print alles en leest elk instructie-PDF na tegen wat hij heeft gemaakt.

Gemaakt:

1. **KV De Korfbal Kampioenen**. Leeg gestart, thema Klassiek, Nederlands, euro. Eigen bordmaat (buitenmaat 480, hoekvak 65, rand 5). Alle 11 onderdelen aan. 28 straten, stations en nutsbedrijven hernoemd naar clubplekken. 8 pionnen met eigen namen, 4 met foto. Doosdeksel met clubfoto. Eigen foto op de spelregelkaft, op twee biljetten (50 en 100) en op twee vakken. Huisregels met 4 regels. Geprint: Drukkerij-set (9 PDF's, inclusief speelgeld, 15 vellen SRA3). Alle PDF's gedownload en bekeken.
2. **KV Jeugdtoernooi**. Leeg gestart, thema Riso, Nederlands. Standaardbord (500 mm). Eigen munt "Korfpunt" met teken "kp". Eigen woorden: kleedkamer(s) voor huis(jes), clubhuis(huizen) voor hotel(s). 9 vakken hernoemd naar jeugdteams. Geprint: Thuisprint-set (zonder speelgeld).
3. **Sponsoren Editie**. Leeg gestart, thema Strak, Nederlands, euro. Eigen maat (520, 70, 0). 8 straten hernoemd naar sponsoren, twee met logofoto. Geprint: Drukkerij-set (zonder speelgeld).

Niet getest: telefoon, Engels, Samen maken, aangepaste kaartteksten, mijn tweede browser als vriend.

## Samenvatting

Het voelt als een gemaakt product: de editor is overzichtelijk, de live voorbeelden kloppen en de PDF's zien er netjes uit. Het mooiste is dat alles meeverandert: een straatnaam komt automatisch in de kaarten, het boekje en de prijslijst. Mijn grootste zorg als clubmens met een verkoopset zijn de dingen waar de PDF's niet met de editor kloppen: de eigen munt staat nog als euro in het spelregelboekje, de printpagina noemt een andere paneelmaat dan de PDF, en acht spelers kunnen niet starten met 30 biljetten per soort. Daarnaast worden foto's bij pionnen en logo's afgesneden en kan ik prijzen maar 20% aanpassen. Bij de eerste printklik kreeg ik twee keer "Te veel aanvragen" (zie opmerking bij bug 8).

## Werkt niet (bugs)

1. **Eigen munt staat nog als euro in het spelregelboekje.** Waar: boekje van KV Jeugdtoernooi (munt "Korfpunt", teken "kp"). Het bord, de kaarten en het geld tonen "kp 200". Het boekje zegt "Iedereen krijgt € 1.500 startgeld: 2 × € 500, ...", "dan krijg je € 200 van de bank" en de prijslijst heeft kop "PRIJS €". Verwacht: overal de eigen munt. Ernst: hinderlijk (de uitleg klopt niet met het spel). Stappen: Editie, Algemeen, Munt op Eigen munt, naam en teken invullen, boekje maken. Screenshot: `img/club-henk/15-pdf-boekje-eigen-munt-euro.jpg`, `img/club-henk/14-eigen-munt-editor.jpg`.
2. **Foto bij een pion wordt bovenaan afgesneden.** Waar: pionnen, "In kader" op 100%. Mijn uitgeknipte figuurtje (hoofd, lijf, PNG met doorzichtige achtergrond) heeft in de editor en in de PDF een half hoofd. Verwacht: hele figuur zichtbaar, het hulptekstje zegt zelf dat een uitgeknipte PNG het mooist is. Ernst: hinderlijk. Screenshots: `img/club-henk/04-pion-foto-afgesneden.jpg`, `img/club-henk/12-pdf-pionnen.jpg`.
3. **Breed logo wordt in een staand vak afgesneden en je kunt niet uitzoomen.** Waar: foto op een vak en biljet. Mijn sponsorlogo "Bakker Jansen" toont als "akker Janse". De zoomschuif begint bij 100%, er is geen "hele foto tonen" of "passend". Verwacht: een optie om het hele logo te laten zien. Ernst: hinderlijk, voor sponsors bijna blokkerend. Screenshot: `img/club-henk/07-logo-foto-afgesneden.jpg`, `img/club-henk/17-pdf-bord-sponsors.jpg`.
4. **Enter in het huisregels-veld doet om de andere keer niets.** Waar: Doos, Huisregels, tekstveld "Regels". Ik typte regel 1, Enter, regel 2, Enter, regel 3, Enter, regel 4. Regel 1 en 2 werden "verenigingskas.Vrij parkeren ...", regel 2 en 3 wel gescheiden, regel 3 en 4 weer samen. Ook bij 400 ms wachten tussen de toetsen (handmatig typen is waarschijnlijk langzamer, maar probeer het). Verwacht: elke Enter maakt een nieuwe regel. Ernst: hinderlijk, de nummering van de kaart klopt dan niet. Screenshot: `img/club-henk/05-huisregels-enter-samengevoegd.jpg`.
5. **Printpagina noemt een andere paneelmaat dan de PDF.** Waar: Printen, Bord. Bij mijn eigen bord van 480 mm staat "4 stuks, elk 248 × 248 mm, 3 mm afloop erbij". De PDF-pagina's zijn 244,1 × 244,1 mm. Bij het standaardbord (500 mm) staat ook 248, dus de tekst lijkt niet mee te veranderen met de maat. Henk bestelt stickers op maat, een verkeerde maat is geld kwijt. Ernst: hinderlijk, mogelijk blokkerend voor bestellen. Screenshot: `img/club-henk/08-print-te-veel-aanvragen.jpg` (maat in de lijst), `img/club-henk/10-pdf-bord-clubeditie.jpg`.
6. **Geld is te weinig voor 8 spelers.** Waar: Speelgeld en boekje. Het boekje zegt dat iedereen start met 2×500, 2×100, 2×50, 6×20, 5×10, 5×5 en 5×1. Er worden 30 biljetten per soort geprint. Met 8 spelers heb je 48 biljetten van 20 en 40 van 1, 5 en 10 nodig. Het spel zegt "2 tot 8 spelers". Verwacht: genoeg biljetten voor het maximum, of de aantallen zelf kunnen kiezen. Ernst: hinderlijk (merk je pas aan tafel). Screenshot: `img/club-henk/13-pdf-speelgeld.jpg`.
7. **Teller "8 van 9 klaar" haalt 9 nooit.** Waar: Printen, onderdeel uitgevinkt (ik vinkte Speelgeld uit). Alle 8 aangevinkte PDF's staan klaar en de download werkt, maar de teller blijft op "8 van 9 klaar" staan. Verwacht: "8 van 8". Bij de thuisprint-set sprong de teller van "0 van 8" naar "1 van 9". Ernst: klein.
8. **"Te veel aanvragen" bij de eerste klik op Maken, zonder vervolg.** Waar: Printen, "Drukkerij-set maken" en "Thuisprint-set maken". Beide keren (andere editie) kreeg ik meteen "Te veel aanvragen. Wacht een minuut en probeer het opnieuw." onderaan de pagina. Die melding staat helemaal onderaan, ver van de vaste knop, en de teller blijft op "0 van 9". Pas na een nieuwe klik zonder wachten (en met 75 seconden pauze) lukte het in 60 seconden. Let op: andere testers gebruiken waarschijnlijk hetzelfde IP-adres, dus dit kan door onze eigen test komen. Het punt blijft: een gewone gebruiker ziet de melding makkelijk niet. Ernst: hinderlijk. Screenshot: `img/club-henk/08-print-te-veel-aanvragen.jpg`.
9. **Pagina scrolt weg tijdens typen in huisregels.** Waar: editor, huisregels. Na veel tekst scrolde de hele pagina omhoog en was onderin een leeg beige vlak te zien terwijl de header weg was. Alleen eenmalig gezien. Ernst: klein.

## UX: wat kan beter

- **"Leeg" is niet leeg.** Waar: Nieuwe editie. Henk koos "Leeg" ("de standaardeditie, je vult alles zelf in") en kreeg Molenweg, Kerkstraat enzovoort met 32 kaarten. Dat is prima, maar ik moest 28 straten één voor één hernoemen. Voorstel: een lijst "alle straten in één keer" waarin je namen onder elkaar plakt, of plak-uit-Excel.
- **A, B en C bij Andere maat zijn onduidelijk.** Waar: Nieuwe editie en editor, Bord. Er staat "A: buitenmaat, B: hoekvak, C: rand" maar geen tekening. Henk heeft een liniaal maar weet niet wat "rand" is. Voorstel: een schetsje met de drie maten erin, en de uitkomst ("een gewoon vak is 37,78 mm") ook als preview.
- **Prijzen mogen maar 20% omhoog of omlaag.** Waar: vak, Bedragen. Ik typte 100 voor een straat van 60, het veld sprong terug naar 60 zonder uitleg. Voor een club die eigen bedragen wil (contributie, sponsorbedrag) is dat krap. Voorstel: toon de melding "maximaal 72" op het moment dat je typt, en laat een "eigen prijzen" optie toe, met de waarschuwing dat het spel dan uit balans raakt.
- **Twee manieren om een foto op het doosdeksel te zetten.** Waar: Doosdeksel. "Afbeelding: Thema | Foto" en daaronder "Foto toevoegen" (losse laag). Na "Foto" bleef bij mij "Thema" actief gemarkeerd en kwam er een losse foto midden op de titel. Voorstel: één knop, en "Andere foto" in plaats van een tweede laag.
- **Lijst "Mijn edities" verspringt.** Waar: Mijn edities. De volgorde volgt de laatste wijziging. Na een aanpassing staat een andere editie bovenaan. Je opent dan makkelijk de verkeerde. Voorstel: vaste volgorde of een duidelijke naam bij het openen.
- **Pionnen-miniatuur toont maar twee namen.** Waar: Printen, kaart Pionnen. Ik heb 8 pionnen, de miniatuur toont er twee. Voorstel: "8 pionnen" in de tekst.
- **Telling op de printpagina.** "9 onderdelen · 61 kaarten" terwijl ik 11 onderdelen aanzette (eigendomsbewijzen, kaarten en huisregels zitten in één set). Verwarrend voor wie iets zoekt dat hij aanzette.
- **Thuisprint-set bevat een doosdeksel op A3.** Henk heeft thuis geen A3-printer. Voorstel: bij de thuisset het deksel op twee A4's of een melding "A3 nodig".
- **Huisregels en regels van het boekje.** Mijn huisregel "drie keer dezelfde worp" botst met "drie keer dubbel is de gevangenis" uit het boekje. Het blad zegt wel "deze afspraken gelden boven de regels van dit boekje". Voorstel: laat het boekje zelf verwijzen naar de huisregels waar ze botsen.

## Ontwerp

- **Editor:** rustig en duidelijk. Tabs Bord, Kaarten, Geld, Doos met tellers ("28/41") zijn handig om te zien wat ik al aangepast heb. De melding "Controle" met uitleg (84 dpi, 47 dpi, 4 pionnen zonder foto) is goed. Foto's met resolutie ("747 dpi, scherp genoeg") zijn precies wat een drukker wil weten.
- **Bord:** Klassiek ziet er mooi uit, Riso vrolijk (roze/felblauw). Strak is netjes maar na een foto wat kaal: het bord is wit met zwarte banner. Straatnamen op de zijkanten zijn klein (bij lange namen als "Rabobank Hoeksche Waard" gaan ze over drie regels). Zie `img/club-henk/10-pdf-bord-clubeditie.jpg` en `img/club-henk/17-pdf-bord-sponsors.jpg`.
- **Speelgeld:** de biljetten zien er echt uit (guilloche, hoekvakjes). Een foto in het ovaal werkt, maar het logo wordt afgesneden (bug 3). Zie `img/club-henk/13-pdf-speelgeld.jpg`.
- **Spelregelboekje:** 16 pagina's A5, duidelijk gezet, veel wit onderaan op de meeste pagina's. Prijslijst klopt met bord en kaarten (nagerekend: huur, hotel, bouw, hypotheek, spoorhuur 25/50/100/200, startgeld 1.500). Zie `img/club-henk/11-pdf-spelregelboekje.jpg`.
- **Pionnen:** de vouwpionnen zonder foto zijn alleen een naam in grote letters, "Pion" onderaan staat in grijs. Zonder foto lijkt het onaf.
- **Thuisbord:** 7 A4's met knipmerken, de hoeken eerst. Zie `img/club-henk/16-pdf-thuisbord-7-paginas.jpg`.
- **Startpagina:** levendig en duidelijk. Zie `img/club-henk/19-startpagina.jpg`.

## Features die ik zou willen

- **Biljetten per soort zelf kiezen, of automatisch genoeg voor het aantal spelers.** Waarom: 8 spelers en 30 biljetten per soort is niet genoeg (bug 6). Must.
- **Logo's passend in het vak ("hele foto tonen", achtergrondkleur kiezen).** Waarom: sponsors willen hun hele logo zien. Must.
- **Meerdere straten tegelijk hernoemen (plakken uit een lijst of Excel).** Waarom: 28 namen invullen duurt lang, een clubbestuur heeft de lijst al. Must.
- **Eigen prijzen buiten de 20% met een waarschuwing.** Waarom: clubs willen bedragen als sponsorprijs of contributie. Nice.
- **Sponsorblok of sponsorpagina in het boekje en op de achterkant van de kaarten.** Waarom: Henk verkoopt de set en wil sponsoren laten betalen. Nice.
- **Exemplaren bestellen of vaste hoeveelheden voor een oplage (50 stuks), met een prijsindicatie bij de drukkerij.** Waarom: verkoop op het clubfeest. Nice.
- **Pion met een voorgemaakt silhouet op basis van een gewone foto (uitknippen in de browser).** Waarom: niemand van de leden heeft een uitgeknipte PNG. Nice.
- **Een "kopieer editie" knop voor een tweede variant (jeugd, senioren) met dezelfde basis.** Waarom: drie edities maken betekende drie keer opnieuw beginnen. Must voor wie meerdere edities maakt.

## Wat goed werkte

- Alles wat je hernoemt loopt mee naar de kaarten, het boekje, de prijslijst en de PDF's.
- De dpi-waarschuwingen en de resolutie bij elke foto.
- De invoegknop in huisregels en kaarttekst ("Invoegen" kiest een vak en blijft meeveranderen).
- Eigen woorden ("kleedkamer", "clubhuis") staan netjes in het boekje.
- PDF's: scherp, juiste formaten (A5 plus afloop, kaarten 63 × 88 plus afloop, SRA3 voor geld), snel gemaakt (rond 60 seconden voor 9 onderdelen).
- "Drukkerij-set klaar tot 28 nov" bij de editie in Mijn edities.
