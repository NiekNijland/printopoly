# Feedback ronde 3: Raj, office manager, teamspel en klantevent (desktop 1920x1080, Engelse UI)

Persona: Raj, 38, office manager bij een internationaal bedrijf. Wil een teamspel waar collega's blij mee zijn, met afdelingen als straten, het bedrijfslogo, eigen munt en huiskleuren. Kijkt als professional: kan ik dit uitdelen zonder me te schamen?

Gemaakt:

1. **NOVA Team Building**. Sjabloon "Company or team", thema Sleek, taal English. Eigen munt "Credits" met teken "Cr". Accentkleur #0B3D91. Alle acht straatkleuren vervangen (marine, staalblauw, teal, amber, rood, grijs, groen, paars). 28 spaties hernoemd naar afdelingen en kantoren (Reception, Finance, Sales EMEA, Engineering, Executive Board, Amsterdam HQ, enzovoort). Logo als eigen afbeelding op Start en Free Parking, foto's op Reception, Sales EMEA en Executive Board, een piepkleine foto (60x40) op Finance. Eén Chance-kaart herschreven. Speelgeld, doosdeksel en regelboekje aangezet, logo als laag op het deksel. Geprint: print shop set (bord, kaarten, geld, deksel, regelboekje) met ZIP.
2. **Client Summit 2027**. Leeg sjabloon, thema Classic, English, munt £. Tien spaties hernoemd naar zalen (Welcome Desk, Keynote Hall, Demo Zone, enzovoort), drie foto's. Uitnodiging, dobbelstenen en huizen aangezet. Geprint: home print set (bord op A4, kaarten, vouwmodellen, dobbelstenen, uitnodiging) met ZIP.
3. **Dave's Farewell**. Sjabloon "Birthday", thema Riso, English, munt M (standaard). Alleen vijf spaties hernoemd. Geprint: print shop set (bord, kaarten, pionnen, deksel) met ZIP.

## Samenvatting

Het maken zelf voelt goed en snel. Hernoemen, kleuren kiezen, een eigen munt en foto's plaatsen ging zonder uitleg, en de PDF's komen binnen een halve minuut. Het mooiste is het Classic-thema en het Riso-thema: levendig en af. Sleek is voor een bedrijf logischer, maar ziet er kaal uit: een wit bord met een zwarte balk. Het grootste probleem voor mijn doel: de eigen munt en huiskleuren werken niet overal. Het regelboekje in de PDF zegt nog steeds euro's, het Voorbeeld-scherm toont nog de standaardkleuren en euro's, en een logo wordt afgesneden. Er is geen plek voor het logo in het midden van het bord. Ik zou het bord met het logo niet uitdelen zonder het eerst na te lopen.

## Werkt niet (bugs)

**1. Regelboekje negeert eigen munt (hinderlijk, bijna blokkerend voor zakelijk gebruik)**
- Waar: PDF "Rules booklet" van editie 1 (munt Credits, "Cr").
- Wat: de tekst zegt "Everyone gets €1,500 ... 2 × €500 ...", "collect €200 from Start", "pay €50", ook de prijzentabel kop zegt "PRICE €". Borden, kaarten en geld zeggen wel "Cr".
- Verwacht: overal Cr. Bij een eigen munt moet het regelboekje de eigen naam en teken gebruiken, en liefst ook "Credits" in lopende tekst.
- Stappen: Edition, General, munt "Own currency", naam Credits, teken Cr. Zet Rules booklet aan, print het, lees pagina 3 en de tabel achterin.
- Screenshot: `img/office-raj/16-pdf-regelboekje-euro.jpg`.

**2. Voorbeeld-scherm toont niet mijn instellingen (hinderlijk)**
- Waar: knop "Preview" in de editor, tab Board.
- Wat: het bord in Preview toont "€200" in plaats van "Cr 200", de standaardkleuren van de straatgroepen (bruin, lichtblauw, roze, oranje, rood) in plaats van mijn kleuren, en grijze pijlen in plaats van de accentkleur. De hernoemde straten staan er wel goed in. De editor zelf en de PDF zijn wel goed.
- Verwacht: Preview gelijk aan editor en PDF.
- Screenshot: `img/office-raj/07-voorbeeld-oude-munt.jpg` (vergelijk met `06-bord-editor.jpg`).

**3. Logo als "Own image" wordt afgesneden (hinderlijk)**
- Waar: spaties Start en Free Parking, knop "Own image", en ook op het doosdeksel als hoofdafbeelding.
- Wat: mijn ronde logo (800x800, transparant) wordt als vlak gevuld en bijgesneden, dus "NOVA" onderaan is half weg en de ring is afgekapt. Zoom kan niet onder 100%, dus ik kan het logo niet helemaal in beeld krijgen. Na "Own image" staat de knop "Photo" geselecteerd, dus het verschil tussen de twee is niet te zien.
- Verwacht: een eigen afbeelding (logo) wordt helemaal getoond, met "passend" in plaats van "vullend".
- Screenshot: `img/office-raj/04-logo-start-bijgesneden.jpg`, PDF: `img/office-raj/15-pdf-bord-editie1.jpg` (Free Parking en Start).
- Als laag op het doosdeksel (Extra layers, Add photo) werkt het logo wel goed: `08-doos-deksel-logo.jpg`.

**4. Printfout "Too many requests" is bijna onzichtbaar (hinderlijk)**
- Waar: printpagina, na "Make home print set".
- Wat: twee keer kreeg ik 429 (de teller blijft op "0 of 5 done"). De melding "Too many requests. Wait a minute and try again." staat helemaal onderaan de pagina, onder de vaste balk, buiten beeld. Op het scherm gebeurt niets zichtbaars. Ik zou denken dat het kapot is. Een tweede poging na een paar minuten werkte direct (20 seconden).
- Verwacht: de melding bij de knop zelf, en de teller niet op "0 of 5" laten staan.
- Kanttekening: andere testers printten tegelijk vanaf hetzelfde IP-adres, dus de limiet kan door ons komen. De zichtbaarheid blijft een punt.
- Screenshot: `img/office-raj/11-te-veel-verzoeken.jpg`.

**5. Uitnodiging zegt "GAME NIGHT" en is niet aan te passen (klein tot hinderlijk)**
- Waar: Invitation in het home print set van het klantevent.
- Wat: bovenin staat vast "GAME NIGHT", daaronder "You are invited" en "When / Where / Bring". In de editor staat geen Invitation-onderdeel (Box bevat alleen deksel, pionnen en huisregels), dus ik kan het niet wijzigen. Voor een klantevent klopt "Game night" niet.
- Verwacht: tekst aanpasbaar, of de kop weglaten.
- Screenshot: `img/office-raj/17-pdf-uitnodiging-game-night.jpg`, `14-box-geen-uitnodiging.jpg`.

**6. Kaarttekst: standaardtekst noemt geen munt (klein)**
- Waar: Chance-kaart 1, "A new day, a fresh start. Go to Start. Collect 200 from the bank." met eigen munt Cr.
- Wat: "200" zonder "Cr". Andere plekken tonen wel "Cr 200". Inconsistent.

## UX: wat kan beter

- **Logo in het midden van het bord ontbreekt.** Bij General staat alleen naam en ondertitel, in een zwarte balk. Een bedrijfslogo in het midden, naast of in plaats van de balk, is het eerste wat een bedrijf zoekt. Nu moest ik het logo op Start en Free Parking kwijt, en daar wordt het afgesneden (zie bug 3). Voorstel: veld "Logo in de midden" bij Edition, General of Look.
- **"Own image" en "Photo" zijn niet te onderscheiden.** Na een upload staat "Photo" actief. Leg uit of voeg samen, en geef bij een logo een kader-keuze (Framed / Full) zoals bij straten.
- **Accentkleur raakt weinig.** Bij Sleek kleurt de accentkleur alleen de pijlen en de deksel-titel. De zwarte middenbalk blijft zwart. Voor een bedrijfsstijl wil ik de balk in mijn kleur.
- **Palet voor straatgroepen.** Je kiest uit twaalf vaste vlakken of typt een hex. Handig dat hex kan. Maar de kleur van een hele groep verandert, ook bij de straten van die groep op kaarten en akten, dat is goed, alleen niet zichtbaar in Preview (bug 2).
- **Board-onderdeel heeft geen vinkje op de printpagina.** Kaarten en extra's hebben een vinkje, het bord niet. Ik wist niet of het bord wel of niet meegaat bij "Make print shop set". (Het ging wel mee.) Geef het bord een vinkje of leg uit dat het altijd meegaat.
- **"Make" is een link, "Make test sheet" een knop.** Zelfde soort actie, twee stijlen. Ook is het per-onderdeel "Make" weinig opvallend.
- **Het sticky balkje onderaan de printpagina bedekt de kop "Extra printing"** en de eerste rij eronder, zeker op 1080 hoog. Je moet scrollen om te zien dat er meer is.
- **Sjabloon "Birthday" voor een afscheid.** De sjabloonvoorbeeldtekst (geboortehuis, eerste schooldag) past niet bij een collega-afscheid. Een sjabloon "Farewell" of "Leaving party" zou bij mijn persona passen.
- **Check-teller telt alleen waarschuwingen over afbeeldingen en pionnen.** Prima. De waarschuwing bij een foto met 34 dpi is helder (zie `05-lage-resolutie-waarschuwing.jpg`), maar ik kan toch nog printen zonder bevestiging. Is dat de bedoeling? Voor een bedrijf is een extra "weet je het zeker" bij Print aan te raden.
- **Instructie-PDF's in de ZIP zijn kaal** (Arial, zwart-wit, een pagina). Prima functioneel, maar naast een mooi bord voelt het niet af en er staat geen bedrijfsnaam of de editienaam op.
- **Autosave is stil.** Ik zag alleen "Only in this browser, 19:22". Als ik te snel de pagina sloot ging een wijziging verloren (valuta bleef op euro). Een kleine "Saved" bevestiging helpt.

## Ontwerp

- Mooi: **Classic** (editie 2) en **Riso** (editie 3). Warm, levendig, geen dode vlakken. Het bord met de banner midden, de gekleurde Chance en Community Chest kaarten en de pictogrammen ziet er echt als een spel uit.
- Sleek (editie 1) oogt goedkoop en leeg: witte vlakken, zwarte balk, alleen kleur in de randen. Voor een bedrijf zou ik dit kiezen, maar het is niet af. Het woord "The trading game" in de balk blijft ook staan, tenzij je het uitzet.
- De afdelingskleuren in het bord werken goed. De akten (title deeds) met een marineblauwe kop en tabel met "Cr" zien er netjes uit. De prijzen staan helder.
- Speelgeld: mooi opgemaakt, maar de bank heet "Play money" op elk biljet en de kleur is overal beige (alleen de tint verschilt). Geen logo mogelijk behalve "Photo in the oval". Voor een bedrijf: bank "NOVA Bank" instellen kan, onder Words, maar dat vond ik pas laat.
- Foto's op straten op het bord zijn klein maar scherp. Teksten op de bovenste rij staan op z'n kop, zoals bij een echt bord.
- Doosdeksel met logo als laag, titel in mijn blauw en de pictogrammen: dat ziet er goed uit en is het mooiste onderdeel voor mijn bedrijfsbord (`08-doos-deksel-logo.jpg`).
- PDF's: bord (4 panelen met 3 mm afloop) en kaarten (122 pagina's, voor en achter) zijn scherp en complete. Home print set: bord op 7 A4's met losse stickers, snijmarkeringen, uitlijntest voor dubbelzijdig printen. Netjes. Het regelboekje is plat maar leesbaar, de kaften en het hoofdstuk zijn mooi. Pionnen bij editie 3 zijn lege kaartjes met "Pawn 1" tot "Pawn 8" omdat ik geen foto's gaf.

## Features die ik zou willen

- **Logo in het midden van het bord**, en een logo-plek bij Start en op de kaart-achterkant (must).
- **Eigen afbeelding zonder bijsnijden** ("passend", transparant) (must).
- **Bedrijfskleurenset**: één accentkleur die bord, middenbalk, geldbiljetten, regelboekje en kaarten meekleurt, of een "huisstijl"-paneel met 2 tot 3 kleuren en een lettertypekeuze (must voor zakelijk, nice voor de rest).
- **Eigen munt overal** (regelboekje, kaartteksten) (must, zie bug 1).
- **Banknaam standaard "Bank" met bedrijfsnaam**, bijvoorbeeld "NOVA Bank" (nice).
- **Teksten van de uitnodiging aanpasbaar** en een versie voor intern gebruik zonder "Game night" (nice).
- **Meerdere editie-kopieën in één ZIP voor een groot team** met naamlabels per speler, of een eenvoudige "dupliceer editie" om een tweede variant voor een klant te maken (nice). Ik maakte nu drie losse edities vanaf nul.
- **Bulk-import van namen** (plakken van een lijst afdelingen) in plaats van 28 spaties een voor een (nice, voor een kantoor met veel afdelingen zeer fijn).
- **Pdf-export van alle onderdelen als één bestand voor de drukker**, met bestelinformatie, en een PDF-voorbeeld op de printpagina zonder te downloaden (nice).
- **Woordenlijst voor professionele toon**: sjablonen "Office", "Client event", "Farewell" (nice).

## Wat goed werkte

- Aanmaken van een editie met sjabloon en naam: twee klikken.
- Bewerken: spaties kiezen uit de lijst, naam typen, klaar. Het live bord klopt direct.
- Eigen munt met naam en teken, en de waarschuwing bij een foto met te lage resolutie (met dpi erbij).
- Print shop set en home print set: 20 tot 30 seconden voor alles, ZIP met instructie-PDF per onderdeel, duidelijke maten ("4 pieces, 248 x 248 mm, 3 mm bleed").
- Home print set met uitlijntest en snijmarkeringen.
- Extra laag op het doosdeksel (logo slepen en schalen).
- Bord en kaarten in de PDF kloppen met de editor (namen, Cr, kleuren), behalve het regelboekje.
