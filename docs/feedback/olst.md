# Feedback Printopoly: testeditie "Olst, dorp aan de IJssel"

Tester: docent (52), laptop 1280 px, veel toetsenbord, thema Strak, schoolfeest, wil bij de drukkerij laten printen.
Editie-id: 0dd7a93b-6ad8-4bf3-9e7b-c69ca57f7c55. Gedownloade bestanden en PNG's staan in
`/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly/08bf87c2-2f81-4fd8-88d6-54bc7cbea685/scratchpad/feedback/olst/`
(`zipx/` = Drukkerij-ZIP uitgepakt, `home/` = Thuisprint-bestanden + proefvel, `png/` = voorbeeldpagina's).

## Samenvatting

Wat ik deed: editie met alle onderdelen aangemaakt (Strak), 26 vakken hernoemd naar Olst (Olsterveer, Boskamp, Fortmond, Huize Ter Spille, enz., twee tot zes woorden lang), 10 vakfoto's (2400 x 1600 px) plus een foto bij een eigendomsbewijs, het geldbiljet, het doosdeksel en een pion, 3 eigen kaarten (waarvan één van 500 tekens), huisregels, banknaam. "Andere maat" geprobeerd en weer standaard gezet. Drukkerij-set, Thuisprint-set en proefvel gemaakt en alles gedownload (losse PDF's, instructies, beide ZIP's). Daarna de site in het Engels bekeken.

Het goede nieuws: de editor werkt prettig, de dpi-melding klopt (110 dpi = "te laag"), de maatvoering van de PDF's klopt met de Printgids (bord 254 x 254 mm, kaarten 69 x 94 mm met afloop, SRA3 320 x 450 mm, lid 273 mm, 7 / 15 / 35 vellen thuis), de instructiepagina's zijn duidelijk geschreven, lange namen en een lange kaarttekst krimpen netjes in het vak.

Het grote probleem: **de eigendomsbewijzen in de print-PDF's hebben nog de oude standaardnamen** (Molenweg, Veldweg, Station Noord ...) terwijl het bord de nieuwe namen heeft. Ook de standaard-kaartteksten (die ik niet aanpaste) verwijzen naar vakken die niet meer bestaan ("Maak een uitstapje naar Station Noord", "Ga naar Kroonplein"). Wie zo bestelt, krijgt een spel dat niet klopt. Daarnaast: de PDF's van de bordpanelen hebben geen A/B/C/D-label terwijl de instructies daar steeds naar verwijzen, en de "plaatje voor de groepsapp" uit de Printgids zit niet in de sets.

Omgevingsopmerking: in het begin faalden alle printjobs door een lege Chrome-pad in .env en een oud Horizon-proces met verouderde env. Dat is door de coördinator verholpen; na herstart werkte alles. Toch zie ik daarin een UX-bevinding (nr. 8).

## Bevindingen

### 1. Eigendomsbewijzen in de PDF hebben de oude namen (blokkerend)
- Waar: Printen > Drukkerij-set of Thuisprint-set > "Kaarten en eigendomsbewijzen" (beide PDF's) en het voorbeeld op de printpagina.
- Wat gebeurde: de 28 eigendomsbewijzen heten in de PDF nog Molenweg, Veldweg, Station Noord, Kerkstraat, Schoolstraat, Beekstraat, Lindelaan enz. De foto die ik bij het eigendomsbewijs van vak 31 zette staat er wel op, maar onder de naam "Koningslaan" in plaats van "Landgoed Groot Hoenlo en Huize Ter Spille". `pdftotext` op `zipx/02-kaarten-...-printer.pdf` laat het zien (pagina 1 = "Molenweg", pagina 45 = "Koningslaan"). Ook het kaartvoorbeeld op de printpagina toont "Eigendomsbewijs Molenweg" en voor Kans 1 de oude standaardtekst, terwijl ik die in de editor had aangepast.
- In de editor zelf is het wel goed: de Eigendomsbewijs-weergave van Veerweg toont "Veerweg" en het bord heeft de nieuwe namen. Alleen de printroute (en het voorbeeld op de printpagina) gebruikt de standaardwaarden.
- Verwacht: namen op de bewijzen gelijk aan de vakken op het bord (en dezelfde als in de editor).
- Ook in het proefvel: de proefprint van een gewoon vak toont "Molenweg", niet een naam uit mijn editie.
- Reproduceren: nieuwe editie; vak 1 hernoemen (via toetsenbord, dus geen scriptartefact) naar "Veerweg"; Printen > Drukkerij-set maken > kaarten-PDF openen: pagina 1 is nog "Molenweg".

### 2. Standaardkaarten verwijzen naar vakken die niet meer bestaan (hinderlijk, op het randje van blokkerend)
- Waar: Kaarten > Kans, niet-aangepaste kaarten; ook in het grijze blok "Standaardkaart ... Wat er gebeurt: Ga naar het laatste rode vak (Raadhuisplein)".
- Wat: in de PDF staan kaarten als "Maak een uitstapje naar Station Noord. Kom je langs Start, dan krijg je 200." (pag. 81) en "Ga naar Kroonplein, het duurste vak van het bord." (pag. 87), terwijl die vakken nu "Station Olst" en "Molen van Boskamp" heten. In de editor zegt het grijze "Standaardkaart"-blok bij Kans 3 nog "Loop door naar Lindelaan" (mijn Fortmond) en bij Kans 2 "(Raadhuisplein)".
- Verwacht: kaarten die een vak noemen volgen de hernoeming, of er is een waarschuwing in Controle ("deze kaart noemt een vak dat niet meer bestaat").
- Reproduceren: hernoem Kroonplein, print, zoek "Kroonplein" in de kaarten-PDF.

### 3. Bordpanelen in de Drukkerij-PDF hebben geen A/B/C/D-label (hinderlijk, bijna blokkerend voor het plakken)
- Waar: `01-bord-printer.pdf` (4 pagina's van 254 x 254 mm); Printgids > Bord > Plakken; `instructies-bord.pdf`.
- Wat: de instructies zeggen "Leg paneel A tegen de buitenhoek ... doe hetzelfde met B, C en D", de Printgids toont A-D in een illustratie, maar op de pagina's zelf staat geen letter (`pdftotext` geeft alleen vaknamen). Pagina 1 is de hoek Vrij parkeren, pagina 4 de hoek Start; het is voor een drukkerij of gebruiker niet te zien welk paneel "A" is. De Thuisprint-vellen hebben wel labels ("Bord 1" ... "Bord 7").
- Verwacht: een klein label (A/B/C/D) of paginavolgorde A-D die in de instructies staat, buiten de snijlijn of in de afloop.
- Reproduceren: Drukkerij-set maken, 01-bord-printer.pdf openen.

### 4. "Plaatje voor de groepsapp" zit niet in de sets (hinderlijk)
- Waar: Printgids ("Bij de sets zit ook een afbeelding van je bord om te delen: een PNG van 1080 x 1080 px"), EN idem. De Drukkerij-ZIP (10 bestanden) en de Thuisprint-ZIP (10 bestanden) bevatten alleen 5 PDF's + 5 instructie-PDF's; ik vond ook geen aparte downloadlink op de printpagina.
- Verwacht: PNG in de ZIP of de tekst aanpassen.

### 5. Instructie "Past het deksel op A4, gebruik dan A4" klopt niet (klein tot hinderlijk)
- Waar: `instructies-doosdeksel.pdf` versus Printgids (die zegt: past het niet op A4, gebruik A3).
- Wat: een deksel van ca. 267 x 267 mm past nooit op A4 (210 x 297). De instructie-PDF laat een keuze lijken. De Thuisprint-PDF is terecht A3 (841,9 x 1191 pt). De twee teksten spreken elkaar tegen in formulering.
- Verwacht: "het deksel is A3" of dezelfde tekst als in de gids.

### 6. Printpagina: tab springt terug en statussen lijken "nog niet gemaakt" (hinderlijk)
- Waar: Printen > tab "Thuisprint-set" > "Thuisprint-set maken".
- Wat: na de klik laadt `/nl/print/<token>` met de tab **Drukkerij-set** actief en zes keer "NOG NIET GEMAAKT" en de knop "Drukkerij-set maken". Het thuis-resultaat bestaat wel (de PDF-links verschijnen pas als je zelf weer op de tab "Thuisprint-set" klikt), maar je ziet dat niet. Na ruim een minuut wachten leek er niets te gebeuren.
- Verwacht: de gekozen tab blijft actief, of de pagina opent op de set die je net gemaakt hebt.

### 7. Foutstatus en downloadlink tegelijk (hinderlijk)
- Waar: printpagina tijdens de storing (lege Chrome-pad).
- Wat: alle vijf onderdelen stonden op "MISLUKT, OPNIEUW PROBEREN", terwijl er onderaan wel "Drukkerij-set downloaden (ZIP)" stond en de tekst "Je kunt deze pagina sluiten. De bestanden staan 7 dagen klaar." Dat is tegenstrijdig; een gebruiker zou een lege of kapotte ZIP downloaden.
- Verwacht: ZIP-knop en "pagina sluiten"-tekst alleen als er iets gelukt is, anders een foutmelding met "probeer opnieuw" als geheel.

### 8. Foutmelding zonder oorzaak of uitleg (klein)
- Waar: idem. "Mislukt, opnieuw proberen" is duidelijk, maar vermeldt niet of het aan de site ligt of aan mijn editie. Per onderdeel een "Opnieuw proberen: Bord"-knop (goed gelabeld voor screenreaders, positief). Idee: een algemene "probeer later opnieuw / neem contact op" onder de lijst na twee mislukte pogingen.

### 9. Drukkerij-PDF: geen TrimBox/BleedBox (idee)
- `pdfinfo -box`: MediaBox = BleedBox = TrimBox = 720 x 720 pt. De drukkerij moet zelf rekenen dat de afloop 3 mm is. Een correcte TrimBox (248 mm) zou geautomatiseerde preflight bij drukkerijen laten slagen. Kaarten zijn 196,08 x 265,92 pt (69,2 x 93,8 mm): 63 x 88 + 2 x 3 mm, correct, maar de ronding naar hele punten is te zien.

### 10. Instructie-PDF's zijn voor beide sets identiek en noemen geen proefvel (klein)
- `instructies-*.pdf` bevatten steeds Drukkerij- en Thuisprint-tekst samen, ook in de Drukkerij-ZIP. Voor een drukkerij-bestelling is het dus een A4 met ook huisinstructies. Verder staat de proefvel-stap (die de Printgids als eerste noemt) niet in de instructies, en de ZIP bevat het proefvel niet (wel terecht volgens de gids, maar dan moet de printpagina duidelijker zeggen: "Het proefvel zit niet in de ZIP; maak het apart"). Er is ook geen overzicht "wat bestel ik" (bestelbon) in de ZIP; ik moest zelf de bestelnotities uit vijf PDF's halen.

### 11. Drukkerij-set: nummering van losse downloads vs ZIP (klein)
- Losse downloads heten `bord-printer.pdf` enz., in de ZIP `01-bord-printer.pdf` enz. Niet fout, wel wat inconsistent.

### 12. Toetsenbord: Controle-popup sluit niet met Escape en is niet bereikbaar met Tab (hinderlijk)
- Waar: editor, knop "Controle: n".
- Wat: Enter/klik opent de popup (aria-expanded=true). Escape sluit niet; focus blijft op de knop. Tab gaat naar "Ongedaan maken", niet in de popup (de popup staat in de DOM aan het einde van `main`, na alle bordvakken en velden). Een toetsenbordgebruiker kan de meldingen dus niet openen/sluiten en kan niet naar het genoemde vak springen. Tweede klik op de knop sluit hem wel.
- Verwacht: popup krijgt focus, Escape sluit, focus terug naar de knop, items zijn knoppen die naar het vak springen.

### 13. Toetsenbord: focus na sluiten instellingen-dialoog valt op BODY (klein, onder voorbehoud)
- Instellingen openen (muisklik op de titel), Escape: dialoog sluit goed (focus-trap werkt, Tab loopt rond), maar `document.activeElement` is daarna BODY; Shift+Tab springt dan naar het einde van de pagina. Mogelijk komt dit door muisklik in deze WebKit-pane; controleer met Enter op de knop.

### 14. Toetsenbord: radiogroepen zijn niet echte radio's (klein)
- Layout-keuze (Foto in kader / Hele vak / Alleen tekst) heeft role=radio maar elke knop is een eigen tabstop; pijltoetsen doen niets. Thema-keuze op "Editie maken" werkt wel met pijltjes (goed). Verder: de weergave-tablist "Vak / Eigendomsbewijs" is zelf focusbaar (div zonder zichtbare focusring), tweede tab bereik je niet met Tab (waarschijnlijk roving, maar pijl rechts testte ik niet uitgebreid).

### 15. Thema-keuze: toegankelijke naam is een hele bordvoorbeeldtekst (klein)
- Op Editie maken is de accessible name van elk themakaartje de volledige tekst van het miniatuurbord (alle 40 vaknamen). `read_page` toont ze als `radio "on"`. Een screenreader leest een alinea voor. Verwacht: aria-label "Klassiek / Riso / Strak".

### 16. Lange namen: geen waarschuwing in Controle, lettertype wordt piepklein (hinderlijk)
- "Waterschap Drents Overijsselse Delta" (36 tekens) en "Landgoed Groot Hoenlo en Huize Ter Spille" (41 tekens) geven Controle: 0. Op het bord (PDF, 254 mm paneel) worden ze met een zeer klein lettertype in drie of vier regels gezet (zie `png/b70-2.png`); leesbaar maar duidelijk kleiner dan de rest, op het printvak een foto van 20 mm breed ernaast. De landing belooft "tekst die niet past, zie je meteen". Verwacht: een melding zodra de tekst onder een minimale corpsgrootte (bv. 5 pt) krimpt.
- Langere kaarttekst (500 tekens) past ook zonder melding; goed leesbaar op de kaart.

### 17. Andere bordmaat: validatie goed, labels onduidelijk, geen bovengrens (klein / idee)
- Waar: Instellingen > Bord > Andere maat.
- Wat: velden "A: buitenmaat", "B: hoekvak", "C: rand" zonder tekening die laat zien wat A/B/C zijn. De regel "Een gewoon vak is 32,78 mm breed" helpt wel. 500/70/0 gaf 40 mm; 432/63,5/5 gaf 32,78; 100/63,5/5 gaf de foutmelding "Hoekvak plus 9 vakken past niet in 90 mm ..." (goed, role=alert, velden aria-invalid). 1000 mm wordt zonder waarschuwing geaccepteerd (95,89 mm vak, Controle sprong naar 3). Na terug naar Modern vierkant waren de PDF-maten weer 248 mm.
- Verwacht: een kleine tekening met A, B, C erop, en een redelijke bovengrens of een melding "dit is groter dan A0".
- Opmerking: de tekst "Een ouder of ander bord. Je meet het op met een liniaal" is helder.

### 18. Eigendomsbewijs-weergave heet in het paneel "Vak" (klein)
- In de editor, tab Eigendomsbewijs, staat onder de titel nog "Vak" en de layout-knoppen zeggen "Hele kaart" (bij Vak: "Hele vak"). De layout-instelling van het eigendomsbewijs staat los van die van het vak (goed), maar het paneel zou "Eigendomsbewijs" moeten zeggen.

### 19. Editor: de eerste klik op een tab kan "niets doen" (klein)
- Via een synthetische klik veranderde de weergave niet; met een echte klik wel. Waarschijnlijk testartefact. Niet reproduceerbaar met een echte klik.

### 20. Foto-controle werkt, maar de dpi-maat betreft één plek (klein)
- Bij 2400 px zegt de editor "Resolutie 1355 dpi, scherp genoeg", een foto van 300 px 169 dpi en een foto van 200 px "110 dpi, te laag" (Controle: 1, melding met vaknaam: goed). Maar dezelfde foto levert op het bord (PDF) en op het eigendomsbewijs verschillende dpi's op (PDF-afbeeldingen: 169 en 110 dpi op het bord). De melding noemt alleen "Den Nul · Bord". Als dezelfde foto bij vak en eigendomsbewijs gebruikt wordt, zou je graag zien waar hij te klein is. Klein; het kan ook kloppen.

### 21. Geld: biljet van 1 en foto-print (klein)
- De Printgids noemt biljetten van 1, 5, 10, 20, 50, 100 en 500 (210 stuks). De voorbeeldkaarten op de landing tonen 5/10/20/50/100/500, nooit 1. Prima, maar het euro-teken bij "Biljet van 1" met foto is een beetje druk: het cirkeltje met foto en "€ 1" overlappen bijna. Verder prima. De SRA3-vellen hebben bovenin een label "Speelgeld: € 1" dat in de snijtekens kan vallen (`png/money-01.png`).

### 22. Pionnen: lege pionnen krijgen toch een volle pagina (klein)
- Alle 8 pionnen worden geprint, ook zonder foto; pion 2-8 zijn alleen "Pion 2" in tekst. Een melding "7 pionnen hebben geen foto, wil je ze overslaan?" zou nuttig zijn.

### 23. Doosdeksel heeft een zwart kader op de snijlijn (vraag/klein)
- Op `png/lid-1.png` loopt een zwarte rand op 3 mm van de paginarand (de snijlijn). Op een sticker die zo gesneden wordt, zou dit een zwarte rand of een scheve rand worden. Bedoeld als randdesign of snijhulp? Niet duidelijk; de bordpanelen en kaarten hebben dit niet.

### 24. Engels (klein)
- Kleurnaam "Roze" (en "Bruin"/"Groen" waarschijnlijk ook) blijft Nederlands in de EN-interface (alleen "Roze" gezien bij Den Nul).
- Printgids EN zegt "Review list in the editor", de knop heet "Check: 1"; en "work along the edge ... start at Go" terwijl het bord "Start" zegt (landingstekst: "Collect M200 when you pass Start"). Kies één term (Start/Go, Check/Review).
- Landing EN: voorbeeldkaart "You lose the pot at cards. Pay Jan 50." is vertaald maar het voorbeeld heet in NL "Jans Bierkelder"; prima. "pawns" voor "pionnen": in het Engels is "tokens" gebruikelijker bij dit spel.
- URL: `/en/printgids` geeft 404, `/en/print-guide` werkt (taalwissel-link klopt wel). Consoleregel: 1 x "Failed to load resource: 404" (veroorzaakt door deze URL).
- Voor het overige leest de Engelse tekst goed: "Degrease the board", "backing paper", "bleed", "SRA3" ok.
- De EN-editor toont NL-inhoud wanneer de bordtaal NL is ("Just visiting to Vrij parkeren" in de lijstlabels, "What happens: Ga naar Start en ontvang 200"): inhoudelijk logisch, maar de mengvorm in de ARIA-labels van de lijst ("Start to Just visiting") is onhandig.

### 25. Positief / observaties
- Autosave en undo/redo werken, "Alleen in deze browser" is duidelijk.
- Tab-volgorde in de editor is logisch (kop > onderdelen > lijst > weergave > layout > velden); pijltjestoetsen lopen door de bordvakken (listbox "pijltjestoetsen lopen langs de vakken"), Escape sluit de instellingen.
- Dialoog "Andere maat" bevat een goede foutmelding met uitleg in mm.
- Huisregels: lege fotoplaats in de editor is een grijs blok, maar in de PDF verdwijnt het (goed).
- Consolefouten: alleen de 404 van /en/printgids; verder geen fouten in de editor of printpagina.

## Prioriteit (mijn top 5)
1. Eigendomsbewijzen (en proefvel) hebben oude namen in print-PDF's (nr. 1, blokkerend).
2. Standaardkaarten noemen vakken die niet meer bestaan (nr. 2).
3. Bordpanelen A-D niet gelabeld, instructies verwijzen er wel naar (nr. 3).
4. Printpagina: foutstatus + ZIP-knop tegelijk, tabreset na Thuisprint-set maken (nr. 6, 7).
5. Controle-popup niet toetsenbord-toegankelijk (nr. 12) en geen waarschuwing bij krimpende lange namen (nr. 16).
