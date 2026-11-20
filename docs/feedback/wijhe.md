# Feedback testgebruiker "Wijhe" (41, ouder, niet erg techy, ongeduldig, eerst telefoon, later tablet)

Geteste editie: "Zaterdagclub" -> gedupliceerd en hernoemd naar "Wijhe, dorp aan de IJssel". Thema Klassiek.
Omgeving: lokaal http://localhost:8090/nl, gedeeld met vier andere testers. Telefoon 375x812, tablet 768x1024.

## Samenvatting

Het aanpassen van straatnamen, foto's en kaarten gaat verrassend vlot, en "Mijn edities", dupliceren, hernoemen en verwijderen zijn duidelijk. De homepage legt in een zin uit wat je krijgt. De grootste problemen:

1. **Het printen lukte niet.** Zowel het bord als de kaarten van de Thuisprint-set kwamen op "MISLUKT" te staan, ook na opnieuw proberen. Oorzaak in de logs: `LARAVEL_PDF_CHROME_BINARY=` is leeg in `.env`, terwijl `/usr/local/bin/chrome-headless-shell` in de container bestaat. Dit is waarschijnlijk een lokaal omgevingsprobleem, maar het geldt voor iedereen die print. Ik heb daardoor geen PDF's kunnen downloaden of bekijken. Mijn oordeel over het thuisprinten is daarom gebaseerd op de printpagina en de Printgids, niet op de PDF's zelf.
2. **De pagina zegt tegelijk "mislukt" en "klaar".** Bij de mislukte onderdelen staat onderaan wel een "Thuisprint-set downloaden (ZIP) ... klaar. Bewaar deze link". De ZIP is volgens de API (`homeZipReady: false`) niet klaar.
3. **Op tablet (768 px) is de editor dezelfde telefoonindeling**: alles onder elkaar, bord links uitgelijnd, rechts een leeg stuk, en het formulier onder een groot voorbeeld dat bijna de helft van het scherm vult.
4. **Het is onduidelijk dat je een vak eerst moet kiezen en dan nog een keer moet tikken** voordat je het kunt bewerken (telefoon).
5. **Op de telefoon staan op het bord geen namen en foto's, alleen kleurstrepen en stippen.** Je ziet pas bij het bewerken wat je gedaan hebt.

## Genummerde bevindingen

### 1. Thuisprint-set maken mislukt (bord en kaarten)
- **Waar:** Printpagina `/nl/editions/<id>/print`, tab Thuisprint-set, knop "Thuisprint-set maken"; daarna `/nl/print/<token>`.
- **Wat gebeurde er:** Na het klikken kreeg ik na enkele seconden bij Bord en bij Kaarten en eigendomsbewijzen het rode label "MISLUKT, OPNIEUW PROBEREN". Een tweede poging via "Opnieuw proberen: Bord" mislukte ook. Console: alleen een 404 op een resource. Server: `ValueError: First element must contain a non-empty program name` (Symfony Process), 8 keer in `storage/logs/laravel.log`. `config('laravel-pdf.chrome.chrome_binary')` is een lege string.
- **Verwachting:** Een PDF per onderdeel en een werkende download.
- **Ernst:** blokkerend (voor de testomgeving; in productie staat de variabele volgens `.env` op `/usr/local/bin/chrome-headless-shell`, dus controleer dat daar wel iets staat).
- **Stappen:** Open een editie, Printen, tab Thuisprint-set, "Thuisprint-set maken", wacht 10 seconden, kijk bij Bord en Kaarten.
- **Aanvullend (hinderlijk):** Een gewone gebruiker krijgt geen reden te zien. "Mislukt, opnieuw proberen" zonder uitleg of tip (probeer later nog eens / neem contact op) laat je ratelen. Een tweede poging die direct weer mislukt zou iets als "Dit lukt nu niet, we kijken ernaar" moeten zeggen.

**Update: na het herstarten van Horizon werkt het.** Bord (7 pagina's A4) en kaarten (15 pagina's A4 liggend) zijn gemaakt, de ZIP bevat 4 bestanden (bord, kaarten, 2x instructies). Opmerking: toen ik "Opnieuw proberen" bij Bord en Kaarten tegelijk aanklikte, mislukte Kaarten nog een keer (zonder nieuwe fout in de log); een tweede poging apart slaagde. Zie de nieuwe bevindingen 24 t/m 30 onderaan. Hieronder de oorspronkelijke notitie.

**Retry na de melding van de coordinator (17:20-17:21 UTC):** `.env` bevat nu wel `LARAVEL_PDF_CHROME_BINARY=/usr/local/bin/chrome-headless-shell`, maar mijn nieuwe pogingen (bord en kaarten, "Opnieuw proberen") mislukten nog steeds met dezelfde fout. De lopende Horizon-processen in de container zijn gestart om 17:10:41 en dus waarschijnlijk niet herstart; de config in de container las ik nog leeg. Daardoor staan er nog steeds geen PDF's om te beoordelen.

### 2. "Mislukt" en "klaar" tegelijk op dezelfde pagina
- **Waar:** `/nl/print/<token>`, tab Thuisprint-set.
- **Wat gebeurde er:** Bord en Kaarten staan op mislukt, terwijl onderaan de knop "Thuisprint-set downloaden (ZIP)" en de tekst "klaar. Bewaar deze link om ze terug te vinden." staan. De status-API zegt `homeZipReady: false`.
- **Verwachting:** Geen downloadknop zolang er niets te downloaden is; bij gedeeltelijk succes zeggen welke onderdelen wel klaar zijn.
- **Ernst:** hinderlijk (verwarrend, en een lege/kapotte ZIP is een slechte ervaring).
- **Stappen:** zie 1, scroll naar onder.

### 3. Na "Thuisprint-set maken" springt de pagina terug naar de tab Drukkerij-set
- **Waar:** Printpagina, na het klikken.
- **Wat gebeurde er:** De pagina laadt opnieuw op een nieuwe URL (`/nl/print/<token>`), toont de tab "Drukkerij-set" met "Drukkerij-set maken" onderaan en alle onderdelen op "NOG NIET GEMAAKT". De Thuisprint-tab moest ik zelf opnieuw kiezen om de mislukking te zien. In de eerste seconden dacht ik dat er niets gebeurd was.
- **Verwachting:** Blijven op de tab die ik koos, met een zichtbare voortgang ("Bezig met bord...").
- **Ernst:** hinderlijk.
- **Stappen:** Printen, Thuisprint-set, "Thuisprint-set maken".

### 4. Alleen kaarten hebben een vinkje; bord en proefvel niet. Het is niet duidelijk wat "de set" bevat
- **Waar:** Printpagina, Thuisprint-set.
- **Wat gebeurde er:** Ik wilde alleen bord en kaarten. Er staan drie blokken: Proefvel, Bord en Kaarten en eigendomsbewijzen. Alleen Kaarten heeft een vinkje ("Meenemen"). De tekst zegt "Vink uit wat je niet wilt printen", maar bij Bord en Proefvel kan dat niet, en geld, pionnen en doosdeksel staan er helemaal niet (terwijl de Printgids en de homepage ze wel noemen). Ik wist niet of de knop "Thuisprint-set maken" ook het proefvel maakt (dat heeft een eigen "Maken").
- **Verwachting:** Een duidelijke lijst met wat er gemaakt wordt, en uitleg waarom het bord niet af te vinken is ("Het bord is altijd nodig").
- **Ernst:** hinderlijk.
- **Stappen:** zie 1. Vergelijk met de Printgids ("Alleen het bord is verplicht").

### 5. Proefvel: de belangrijkste stap voor thuisprinten staat bovenaan maar wordt niet als eerste stap uitgelegd
- **Waar:** Printpagina, blok "Proefvel": "Print dit thuis en leg het hoekvak op je bord. Past het, bestel dan." en "A4 · liniaal, bankpas en hoekvak".
- **Wat gebeurde er:** Op de Thuisprint-tab staat "Past het, bestel dan", wat een Drukkerij-instructie is; ik print thuis. Niet-techy gebruikers snappen "hoekvak" niet. In de Printgids staat uitleg ("leg een bankpas op de omtrek"), maar op de printpagina niet.
- **Verwachting:** Op de Thuisprint-tab: "Past het, print dan de rest." en een uitleg in één zin wat het proefvel doet.
- **Ernst:** hinderlijk.
- **Stappen:** Printen, tab Thuisprint-set, lees het proefvelblok.

### 6. Home-printinstructies: onvoldoende voor iemand die nog nooit stickers sneed
- **Waar:** `/nl/printgids`, "Bord", "Kaarten en eigendomsbewijzen", "Als er iets misgaat".
- **Wat gebeurde er:** Ik las de gids alsof ik hem thuis zou gebruiken. Wat mist of onduidelijk is:
  - "Print op werkelijke grootte" staat er wel, maar niet hoe. In welke app/dialoog (Chrome, Acrobat, Preview, Windows)? Dit is de plek waar de meeste mensen fout gaan.
  - Voor 7 vellen stickers (ongeveer 40 losse vakken) en 15 vellen kaarten staat er alleen "snijd met een mes langs een liniaal". Geen noemen van een snijmat, een scherp (hobby)mes, een metalen liniaal, of dat je daar een uur voor nodig hebt. Een snijtekenvoorbeeld of een afbeelding ontbreekt.
  - "Vakken 0,5 mm kleiner dan op het bord" wordt genoemd zonder uitleg waarom dat goed is.
  - Het plakken (stap 1-4) is goed, maar de volgorde "begin bij Start en werk langs de rand" staat pas ná de stappen en voor thuis alleen in een los zinnetje.
  - "Vouwkaarten: vouw over de stippellijn en lijm de helften op elkaar": welke lijm? Papier van 160-200 g/m2 past in veel printers niet; zeg dat erbij.
  - Er staat nergens hoeveel papier, inkt en tijd je nodig hebt in totaal (7 + 15 = 22 vellen A4).
- **Verwachting:** Een korte "wat heb je nodig" lijst bovenaan (stickervellen, mes, liniaal, snijmat, lijm, bankpas), en een eenvoudige "zo print je op werkelijke grootte" met screenshots voor de gangbare apps.
- **Ernst:** hinderlijk (idee voor de hulp-teksten).
- **Stappen:** Open `/nl/printgids`.
- **Opmerking:** Ik heb de ZIP/PDF-instructies niet kunnen bekijken door bevinding 1. De PDF-instructies kunnen dit beter oplossen dan de website.

### 7. Telefoon: vak kiezen vereist twee tikken, zonder uitleg
- **Waar:** Editor, tab Bord, lijst onder het bord.
- **Wat gebeurde er:** De eerste tik op "Schoolstraat" markeert alleen het vak (rood randje links, outline op het bord). Pas een tweede tik opent het scherm met Naam, Foto en Layout. Er staat geen hint ("tik nogmaals om te bewerken").
- **Verwachting:** Eén tik opent het bewerken.
- **Ernst:** hinderlijk (impatience-trigger).
- **Stappen:** Editor op 375 px, tik één keer op een vak in de lijst. Ik kan niet uitsluiten dat dit met mijn automatische klik te maken heeft; de tweede tik werkte direct.

### 8. Telefoon: bord is te klein om iets op te lezen
- **Waar:** Editor, tab Bord.
- **Wat gebeurde er:** Het bord op 375 px is ongeveer 330 px breed en toont alleen kleurstrepen en zwarte stippen (stip = "aangepast"). Geen namen, geen foto's. Als je 10 straten hebt veranderd, zie je alleen 17 stippen. De stip (en de lijst met "aangepast") wordt nergens uitgelegd.
- **Verwachting:** Een legenda ("stip = aangepast") of een tik-om-in-te-zoomen.
- **Ernst:** klein.
- **Stappen:** Open een editie op 375 px.

### 9. Telefoon: bewerkformulier krijgt weinig ruimte
- **Waar:** Editor, vak of kaart geopend, 375x812.
- **Wat gebeurde er:** Het voorbeeld van het vak (grote kaart) plus kop en tabs vult de bovenste ~60% van het scherm; Naam en Foto zitten onder de vouw en je moet in een klein vak scrollen. Onderaan zit een vaste balk (Vorige, Controle, Ongedaan maken, Opnieuw, Volgende), dus de bruikbare hoogte is ongeveer 280 px.
- **Verwachting:** Voorbeeld kleiner of inklapbaar tijdens typen, zeker met het toetsenbord open.
- **Ernst:** hinderlijk.
- **Stappen:** Open een vak, kijk hoeveel van het formulier zichtbaar is.

### 10. Tablet (768 px): geen eigen indeling
- **Waar:** Editor op 768x1024.
- **Wat gebeurde er:** Dezelfde gestapelde telefoonindeling. Het bord is ~400 px breed en links uitgelijnd; rechts blijft ~350 px leeg. De lijst van vakken staat eronder, en bij een geopend vak is het voorbeeld klein en het formulier nog steeds onder de vouw. Printpagina op 768: één kolom met kleine afbeeldingen en veel wit.
- **Verwachting:** Twee kolommen (bord/voorbeeld links, formulier rechts), of in elk geval het bord gecentreerd of groter.
- **Ernst:** hinderlijk.
- **Stappen:** Editor op 768x1024, open een editie en een vak.

### 11. Tabs "Eigendomsbewijs" en "Algemeen Fonds" worden afgekapt op de telefoon (Voorbeeld-pagina)
- **Waar:** `/nl/editions/sample`, tabbalk onder het bord.
- **Wat gebeurde er:** De tabs "Bord / Eigendomsbewijs / Kans / Algemeen Fonds" passen niet op 375 px: "Eigendom" en "Algemeen Fonds" lopen af. Het was niet te zien dat de balk kan scrollen.
- **Verwachting:** Tabs onder elkaar of kleiner/korter ("Akte", "Fonds").
- **Ernst:** klein.
- **Stappen:** Op 375 px "Voorbeeld bekijken" openen, scroll onder het bord.

### 12. Voorbeeld bekijken -> Begin met deze als basis: geen bevestiging dat er nu een eigen kopie is
- **Waar:** `/nl/editions/sample`, knop "Begin met deze als basis".
- **Wat gebeurde er:** Ik kwam meteen in de editor. Bovenin staat "Alleen in deze browser", maar niet "Dit is jouw kopie, je kunt de voorbeeldeditie niet stuk maken". De naam "Zaterdagclub" is het enige signaal dat het een eigen kopie is.
- **Verwachting:** Een korte regel of melding: "Je werkt nu in je eigen kopie".
- **Ernst:** klein.
- **Stappen:** Zie boven.
- **Positief:** De voorbeeldpagina laat in één regel zien wat er al is aangepast ("een paar eigen straten en twee eigen kaarten").

### 13. Elk vak kan hernoemd worden, ook Gevangenis, stations, nutsbedrijven en Algemeen Fonds, zonder waarschuwing
- **Waar:** Editor, via Volgende door de vakken bladeren.
- **Wat gebeurde er:** Ik bladerde met "Volgende" en typte namen. Daarbij heb ik per ongeluk "Gevangenis (op bezoek)", "Elektriciteitsbedrijf", "Station Oost" en een "Algemeen Fonds"-vak overschreven. Ik heb ze zelf teruggezet; daardoor staan ze nu met een stip als "aangepast", ook al zijn ze weer gelijk aan het origineel. Er is geen "Terug naar standaard" op naamniveau dat het stipje weghaalt.
- **Verwachting:** Misschien een hint of een apart label ("Vak: spelregel, naam kan niet/mag wel").
- **Ernst:** klein/idee. (Deels mijn eigen fout door een script; een echte ouder met "Volgende" zou ook per ongeluk iets kunnen overschrijven.)
- **Stappen:** Open een vak, druk op "Volgende" tot je bij Gevangenis bent, typ een naam.

### 14. Kaarten zijn genummerd 1-16 zonder voorbeeldtekst
- **Waar:** Editor, tab Kaarten.
- **Wat gebeurde er:** Een raster met blokjes 1 t/m 16 voor Kans en voor Algemeen Fonds, zonder tekst. Ik moest elk kaartje openen om te weten waar het over gaat. De aangepaste kaart heeft alleen een stipje.
- **Verwachting:** De eerste regels tekst op elk blokje.
- **Ernst:** hinderlijk.
- **Stappen:** Editor -> tab Kaarten.

### 15. Kaartteksten verwijzen naar straten die je hernoemd hebt
- **Waar:** Kans-kaart 2: "Wandel naar Raadhuisplein. Kom je langs Start, dan krijg je 200."
- **Wat gebeurde er:** De standaardkaarten noemen straatnamen uit de standaardeditie. Als je Raadhuisplein hernoemt, blijft de kaart de oude naam gebruiken. Geen waarschuwing in "Controle".
- **Verwachting:** Een waarschuwing in Controle of een zoek-en-vervang.
- **Ernst:** hinderlijk (spelinhoudelijk fout bij het spelen).
- **Stappen:** Hernoem Raadhuisplein, open Kans 2.

### 16. Veldjes op het bewerkscherm zonder uitleg
- **Waar:** Vak bewerken: "Zwart-wit", "Prijs € 60 · vast", "Bruin", "Terug naar standaard", "Zoom", draai-knop.
- **Wat gebeurde er:** "Zwart-wit" (checkbox) legt niet uit dat dit inkt bespaart. "Prijs ... vast": waarom vast, en kan dat niet anders? "Bruin": is dat een kleurkeuze of alleen informatie (er is geen kleurkiezer)? "Terug naar standaard" weet ik niet of dat alleen de foto of het hele vak terugzet.
- **Verwachting:** Korte uitleg of een (i)-tekst per veld.
- **Ernst:** klein.
- **Stappen:** Open een vak, scroll door het formulier.

### 17. Foto's: werkt goed, maar geen melding van resolutie of grootte
- **Waar:** Foto kiezen bij De Wijhese Molen, Veerweg, Kerkstraat (JPEG's van 4000x3000).
- **Wat gebeurde er:** Upload werkte direct, de foto kwam in het vak (layout schakelde automatisch naar "Foto in kader"). Ik zag geen resultaatmelding. "Controle: 0" bleef 0. Gelukkig, want de foto's zijn groot genoeg. Een nette feedback ("Foto is scherp genoeg") ontbreekt.
- **Verwachting:** Een klein vinkje of "scherp genoeg voor print".
- **Ernst:** idee.
- **Stappen:** Foto kiezen in een vak.

### 18. Mijn edities: lijst is gedeeld in deze browser, volgorde springt
- **Waar:** `/nl/editions`.
- **Wat gebeurde er:** Mijn edities toont editie van vier andere testers ("Raalte Monopoly-avond", "Lemelerveld", "Olst", "Heino"), want de edities staan in de browser. Dat is een gevolg van de testopzet. Wel nuttig om te weten: de volgorde herschikt zich na elke bewerking, dus wat je net duplicate zag direct verspringen. Na "Dupliceren" gebeurde er niets zichtbaars; de kopie stond ineens bovenaan als "Zaterdagclub (kopie)". Een korte melding ("Gekopieerd") ontbreekt.
- **Ernst:** klein.
- **Stappen:** Mijn edities -> menu -> Dupliceren.

### 19. Verwijderen is duidelijk, maar noemt niet wat je kwijtraakt
- **Waar:** Mijn edities -> menu (drie streepjes) -> Verwijderen.
- **Wat gebeurde er:** Dialoog: "Zaterdagclub verwijderen? Deze editie staat alleen in deze browser. Verwijder je hem, dan is hij weg en kan dat niet ongedaan gemaakt worden." Knoppen "Annuleren" en een rode "Verwijderen". Dit is helder en niet eng, de titel noemt de naam. Wat ontbreekt: een hint hoeveel werk je kwijtraakt (22 aanpassingen, 3 foto's), en de focus staat niet op "Annuleren". Geen "ongedaan maken" na het verwijderen.
- **Verwachting:** Goed zoals het is; eventueel "Dit zijn 22 aanpassingen en 3 foto's".
- **Ernst:** klein/idee. (Positief.)
- **Stappen:** Zie boven.

### 20. Het menu "Naam wijzigen" is prettig
- **Waar:** Mijn edities -> menu -> Naam wijzigen.
- **Wat gebeurde er:** Dialoog opent met de naam voorgeselecteerd, Enter slaat op. Prettig.
- **Ernst:** positief.

### 21. Terugkomen na weg te zijn geweest: werk is er nog, maar de homepage vertelt het niet
- **Waar:** Homepage `/nl` na terugkeer.
- **Wat gebeurde er:** Ik navigeerde naar Wikipedia en ging terug. De homepage toont weer alleen "Editie maken" en "Voorbeeld bekijken". Alleen in het menu (hamburger) staat "Mijn edities". Een ouder die even weg was, zou denken dat het werk weg is. De zin "Je werk blijft in deze browser" staat er wel, maar is klein en grijs.
- **Verwachting:** Een knop "Verder met je editie" bovenaan voor terugkerende bezoekers.
- **Ernst:** hinderlijk.
- **Stappen:** Maak een editie, ga naar een andere site, kom terug via het adres.

### 22. Menu op de telefoon: dubbele "Editie maken"
- **Waar:** Homepage op 375 px, hamburgermenu open.
- **Wat gebeurde er:** Het menu schuift de pagina omlaag (geen overlay). In het menu staat "Editie maken" en direct eronder staat opnieuw de grote "Editie maken". Taalknop NL/EN staat onderaan het menu.
- **Ernst:** klein.

### 23. Ruwe randen in de testomgeving
- Mijn tabblad werd tijdens de test twee keer door een ander proces naar een andere poort (9890) gestuurd en de viewport veranderde (390x844). Dit is vermoedelijk een gevolg van gedeeld gebruik van het "voorgrond"-tabblad door meerdere testers en heeft niets met de site te maken.
- Op `/nl/editions/<id>/print` staat (even) tekst van de standaardeditie ("Molenweg, Veldweg, Beekstraat...") in de pagina totdat mijn editie geladen is. Visueel zag ik het niet, maar wel in de paginatekst (get_page_text) in de eerste seconden. Mogelijk een voorbeeldweergave van de standaardeditie voor schermlezers. Klein.
- Console: 1x `Failed to load resource: 404` op de printpagina; verder geen JavaScript-fouten.
- Als ik "Wijhese Molen" zoek, vind ik geen "Den Ouden Rijn" (zoekresultaten noemen "De Wijhese Molen", 1703, stellingmolen, en De Jonge Gerrit). De brief noemde Den Ouden Rijn; ik heb "De Wijhese Molen" gebruikt. Geen bevinding over de site.

### 24. De eigendomsbewijzen in de PDF hebben de oude standaardnamen (Molenweg, Veldweg, Kerkstraat, ...)
- **Waar:** `cards.pdf` (Thuisprint-set), pagina 1 t/m 15; 28 eigendomsbewijzen.
- **Wat gebeurde er:** In de editor toont het tabblad "Eigendomsbewijs" van "Dorpshuis Wijhe" gewoon "Dorpshuis Wijhe". Maar in de PDF staan alle eigendomsbewijzen onder de namen uit de standaardeditie: Molenweg, Veldweg, Kerkstraat, Beekstraat, Lindelaan, Berkenlaan, Schoolstraat, Marktplein, Waterstraat, enz. Geen van mijn 11 nieuwe straatnamen (Van Dedemplein, De Wijhese Molen, Veerweg, Dorpshuis Wijhe, ...) staat op een eigendomsbewijs (`pdftotext` vindt "Molen/Veer/Dedem/Nijenhuis/Herxen" alleen in kaartteksten). Het bord (`board.pdf`) heeft mijn namen wel. Het printpagina-voorbeeld "Eigendomsbewijs" toonde ook "Molenweg".
- **Verwachting:** De eigendomsbewijzen heten zoals de vakken op het bord.
- **Ernst:** blokkerend (een speler pakt een akte "Molenweg" die niet op het bord staat; het spel is zo niet speelbaar).
- **Stappen:** Hernoem een straat, Printen -> Thuisprint-set -> Kaarten maken, open `cards.pdf` en kijk naar de eigendomsbewijzen. Controleer of dit ook voor de Drukkerij-set geldt.

### 25. De PDF-pagina's van het bord: wat moet waar? Geen volgorde of oriëntatie
- **Waar:** `board.pdf`, 7 pagina's A4 staand, elke pagina "Bord 1" t/m "Bord 7" in de kop.
- **Wat gebeurde er:** De vakken staan als losse stickers met snijtekens, maar in verschillende standen: de helft staat 90 graden gedraaid (tekst zijwaarts) omdat ze zo bij de vier zijden van het bord horen. Er staat geen vakkennummer of pijl "dit is de bovenkant" en geen plattegrond in de PDF. Het bord midden (de grote groene vlakken met "Wijhe, dorp aan de IJssel") is over vier vellen verdeeld; de titel loopt over twee pagina's heen ("Wijhe, dorp" op pagina 1, "aan de IJssel" op pagina 4), dus de stukken moet je goed tegen elkaar leggen.
- **Verwachting:** Bij elke sticker een klein nummer of "zijde A/B/C/D" en een overzichtsplaatje op de instructiepagina.
- **Ernst:** hinderlijk.
- **Stappen:** Open `board.pdf` en bekijk pagina 1, 4, 5.

### 26. De instructies-PDF voor het bord bevat ook de Drukkerij-tekst
- **Waar:** `instructies/instructies-bord.pdf` (en kaarten) in de Thuisprint-ZIP.
- **Wat gebeurde er:** Het bestand begint met "Drukkerij-set: Bestel als vinylsticker ... Aantal: 4 stuks ... Upload elke PDF zoals hij is" en pas daarna "Thuisprint-set". Wie thuis print leest eerst iets wat niet voor hem is. Ook "Snijd de stickers uit met een mes langs een liniaal" zonder gereedschapslijst, zoals bij 6.
- **Verwachting:** In de Thuisprint-ZIP alleen de thuis-instructies.
- **Ernst:** klein/hinderlijk.
- **Stappen:** Download de Thuisprint-ZIP, open `instructies/instructies-bord.pdf`.

### 27. Wel goed: de foto's en snijtekens
- Mijn drie foto's staan in de juiste vakken (De Wijhese Molen, Veerweg, Kerkstraat) en zijn scherp en netjes bijgesneden. Snijtekens zitten bij elke sticker, vak-afmeting en afloop kloppen met de uitleg. Kaarten: voor- en achterkant staan naast elkaar met een stippellijn om te vouwen, 4 per A4-vel, en "Kaarten 1/15" in de kop.
- **Ernst:** positief.

### 28. Kaarten-PDF: hypotheek-achterkant is nodig maar niet uitgelegd
- **Waar:** `cards.pdf`, achterkant van de eigendomsbewijzen: "Hypotheek € 30 ... Leg deze kaart ondersteboven neer zodra hij verpand is..." (staat tekstueel zo, ik citeer niet verder).
- **Wat gebeurde er:** Een niet-techy ouder weet niet wat hypotheek is; het staat er wel, maar in klein lettertype (ongeveer 6 pt).
- **Ernst:** idee.

### 29. Papier- en tijdsindruk voor thuisprint ontbreekt
- **Waar:** Printpagina en instructies.
- **Wat gebeurde er:** 7 vellen stickerpapier + 15 vellen 160-200 g/m2 papier, ongeveer 28 vakken uitknippen, 28 kaarten dubbelvouwen en lijmen, plus 32 Kans/Fonds-kaarten. Dat is makkelijk een avond werk. Dit wordt nergens gezegd. Ik weet niet of een gewone thuisprinter 200 g/m2 aankan.
- **Ernst:** idee.

### 30. Eerste keer "mislukt" bij tegelijk opnieuw proberen
- Zie de update bovenaan bevinding 1: bord en kaarten tegelijk opnieuw proberen leverde een tweede mislukking voor de kaarten zonder foutmelding in `laravel.log`; apart opnieuw proberen slaagde. Vermoedelijk een race tussen de twee jobs of de herstart. Ernst: klein tot hinderlijk. Probeer te reproduceren door beide onderdelen vlak na elkaar te starten.

## Wat ik gedaan heb (kort)
- Homepage op 375x812: "Voorbeeld bekijken" -> "Begin met deze als basis" -> editor.
- Hernoemd naar Wijhe-plaatsen: Van Dedemplein, De Wijhese Molen, Kasteel Het Nijenhuis, Camping de IJssel, Herxen, De Jonge Gerrit, Dorpsstraat, Veerweg, Kerkstraat, Zwolseweg, later Dorpshuis Wijhe (tablet). Daarbij heb ik per ongeluk 4 vakken die ik niet wilde aanpassen overschreven en teruggezet (zie 13).
- 3 foto's: molen (De Wijhese Molen), IJssel (Veerweg), schoolgebouw (Kerkstraat).
- 3 Kans-kaarten aangepast (Kans 2, 3 en 4).
- Weggegaan naar Wikipedia, terug via homepage -> menu -> Mijn edities.
- Dupliceren, hernoemen ("Wijhe, dorp aan de IJssel"), origineel verwijderd.
- Tablet 768x1024: kopie bewerkt (Het Clubhuis -> Dorpshuis Wijhe).
- Printen: Thuisprint-set eerst mislukt (omgeving, zie 1), na herstart gelukt: bord en kaarten PDF's gedownload en bekeken (zie 24-30). De Printgids gelezen (zie 6).
- Niet gedaan: geld, pionnen, doosdeksel, proefvel (niet gevraagd).
