# Feedback ronde 4: vader Joost komt terug, nu met een clubsjabloon (Android-telefoon, 360 x 780)

Persona: Joost, 42, doet alles op de bank in korte sessies. Hij was er in ronde 3 al. Zijn drie oude edities stonden nog in zijn browser (zelfde profiel, IndexedDB). Hij gaat weg en komt via Mijn edities terug, uploadt veel dorpsfoto's tegelijk, plakt plaatsnamen, past huren aan en gebruikt het nieuwe sjabloon "Club of vereniging". Thuisprint-set. Testopzet: puppeteer, telefoonprofiel met touch en Android-useragent, elke stap in een nieuwe sessie, echte productie (printopoly.nl). Foto's zijn zelfgemaakte JPEG's van 2000 tot 4000 px, plus een piepklein bestand (120 x 90) en een groot bestand (4032 x 3024).

Gemaakt (drie nieuwe edities, naast de drie oude van ronde 3):
1. **SV Heusden Zaterdag 1.** Sjabloon "Club of vereniging", thema Strak, Nederlands, euro. Aangepast: 4 foto's tegelijk en later 3 en 5 foto's tegelijk op vakken, plaatsnamen per kleurgroep (Het Sportpark, Het Clubhuis, Oud-Heusden), "De kantine" werd "De kantine van Joke". Geprint: Thuisprint-set met alle vijf onderdelen (bord 7 vellen, kaarten 16 pagina's, speelgeld voor 2 tot 4 spelers 24 vellen, pionnen, doosdeksel). Dit duurde 45 seconden. In die PDF staat "Het ClubhuisHet Clubhuis", dat was mijn script (zie "Ontwerp"); de editie is daarna goed gezet maar niet opnieuw geprint.
2. **Dorpsspel Maasdorp.** Sjabloon "Je dorp of wijk", thema Riso, Nederlands, euro. Aangepast: 8 namen in één keer geplakt, 8 foto's in één keer geüpload, vier plaatsnamen per groep, de kerk naar prijs 190 en huur met 1 huis 80. Geprint: Thuisprint-set, bord en kaarten (7 en 16 pagina's). Dit duurde ruim 2 minuten; andere testers printten op hetzelfde moment mee.
3. **Lotte wordt 8.** Sjabloon "Verjaardag", thema Riso (stond zo in het sjabloon), Nederlands, euro. Aangepast: een eigen logo in het midden van het bord, twee namen en twee plaatsnamen. Geprint: bord, kaarten, pionnen en doosdeksel (speelgeld stond niet aan). Dit duurde 12 seconden.

## Samenvatting

Terugkomen is nu prettiger dan in ronde 3. De zes edities staan er na elke sessie, het printen na herladen gaat direct naar de klaar-pagina, en de editor heeft een zoekveld, een echt groot bord met namen en duidelijke meldingen bij een te hoge prijs. Het mooiste vond ik de lijst waarin je 8 namen plakt en die zichzelf over de juiste vakken verdeelt, en het clubsjabloon zelf: Het hoofdveld, De kantine en De lichtmasten hoefde ik niet meer te hernoemen. Het grootste probleem blijft het uploaden van meerdere foto's. Er is nu een melding met de verdeling, maar die staat boven de beeldrand zodra je naar beneden gescrold hebt, je kunt niets ruilen, en een foto van de kerk komt op "Gevangenis (op bezoek)". Het tweede probleem is dat de huur en de hypotheek nog steeds niet meebewegen met de prijs, ook al staat er "volgen vanzelf". Het derde is het vaste voorbeeld bovenaan op de telefoon: het neemt de helft van het scherm en het formulier kruipt eronder.

## Werkt niet (bugs)

Eerst de ronde 3-punten van Joost, hoe ze er nu voor staan.

Opgelost: de te hoge prijs (nu "Maximaal 216. Het bedrag staat nu op 216." in het rood, `img/vader-joost-terug/05-prijs-max.jpg`), "Bord vergroten" (opent nu een groot bord met namen, `03-bord-vergroten.jpg`), de spookstreep boven de kaarten in Mijn edities (weg, `01-mijn-edities.jpg`), de foto die nu ook op het eigendomsbewijs staat (`06-bewijs-met-foto.jpg`), de lange editienaam in de kop (staat op twee regels), het zoekveld, het aantal vellen vóór het maken, en het vervallen van "nog niet gemaakt" na herladen op de printpagina.

Nog niet opgelost of maar half:

1. **Huur en hypotheek lopen niet mee met de prijs (ronde 3, "Instelbare prijs en hypotheek lopen niet mee").**
   - Waar: vak, Bedragen. De kerk ging van 180 naar 190 en eerder naar 216. De huur bleef € 14 en de hypotheek bleef € 90. In ronde 3 stond hetzelfde (200 met hypotheek 90). Onderaan staat "De huur voor een hele kleurgroep en het aflossen van een hypotheek volgen daar vanzelf uit", dat klopt dus niet voor de eerste huur en de hypotheek zelf.
   - Verwacht: de huren schalen mee, of de tekst zegt wat wel en niet meegaat.
   - Ernst: hinderlijk, want de kaart zegt dan prijs 216 bij een hypotheek die niet de helft is.
   - Screenshot: `12-huur.jpg`.
2. **Meerdere foto's tegelijk: de melding is er, maar je ziet hem niet en je kunt niet kiezen (ronde 3, grootste bug, deels opgelost).**
   - Waar: vak, Afbeelding, Foto kiezen, meerdere bestanden.
   - Wat nu goed is: er komt een lijst "5 foto's geplaatst: Brug.jpg komt op Het oefenveld, enz." met een knop Ongedaan maken, en "Overgeslagen: 1 vak zonder plek voor een foto" (`08-multi-upload-melding.jpg`).
   - Wat niet goed is: (a) de melding staat bovenaan het paneel, maar de pagina blijft staan op het vak waar je was, dus je ziet alleen de foto op het eerste vak en niet de melding (`07-multi-upload-melding-onzichtbaar.jpg`); alleen als je omhoog scrolt zie je hem; (b) de verdeling blijft op volgorde van bestandsnaam, je kunt een foto niet naar een ander vak slepen of ruilen; (c) foto's komen ook op hoeken: "Kerk.jpg komt op Gevangenis (op bezoek)" en bij Maasdorp "groot.jpg" op dezelfde hoek, waar je een foto van een kerk niet verwacht; (d) de verdeling is op volgorde van de bestanden, niet op volgorde van het gevoel (Kerk gaat naar het eerste vak, niet naar "De kerk met de scheve toren").
   - Ernst: hinderlijk. Voorstel: melding vastzetten in beeld met per regel een keuzelijst, en hoeken en "In de cel" overslaan.
3. **De Gevangenis-foto.** Een foto op de hoek "Gevangenis (op bezoek)" komt als klein vierkantje op het bord (`pdf-dorp-bord`, `20-pdf-dorp-bord.jpg`, vel 1, "IMG_0001" met "In de cel"). Het ziet er verloren uit. Ernst: klein.
4. **Plaatsnaam verdubbelt als je in een gevuld veld typt.** Waar: vak, Tekst, Plaats. Het veld is gedeeld met de hele kleurgroep. Als je op een tweede straat van dezelfde kleur tikt en daar typt, staat de eerdere naam er al en wordt jouw tekst erachter geplakt ("Het ClubhuisHet Clubhuis"). Dat gebeurde in mijn script (ik typte zonder alles te selecteren), maar een gewone gebruiker kan het ook overkomen: het veld zegt "geldt voor alle 3 lichtblauwe straten", maar selecteert niet bij tikken, en het eindresultaat staat dan op het bord, de eigendomsbewijzen en in de PDF (`19-pdf-club-rest.jpg`, vel 3 en 4, eigendomsbewijzen "Het ClubhuisHet Clubhuis"). Ernst: klein, wel zichtbaar op papier. Voorstel: bij focus alles selecteren, of bij een tikken op een vak met waarde de tekst markeren.

## UX: wat kan beter

- **Vast voorbeeld neemt de helft van het scherm in.** Waar: vak openen op de telefoon (Vak en Eigendomsbewijs). Bovenin staat een voorbeeld van 420 px hoog met een beige vlak eromheen, en het kleine kaartje is maar 90 px breed. Het formulier eronder heeft zo ongeveer 380 px zichtbaar (`17-preview-neemt-helft.jpg`, `12-huur.jpg`). Voorstel: het voorbeeld inklappen tot één regel zodra je scrolt, of het kaartje groter laten vullen en het beige vlak kleiner maken.
- **Printpagina opent altijd op Drukkerij-set.** Joost print thuis, maar elke keer begint de pagina op Drukkerij-set en moet hij naar Thuisprint-set tikken (`15-print-club.jpg` is na die tik). Voorstel: onthoud de laatste keuze per editie.
- **Printbalk is op de telefoon nog steeds twee rijen, 190 px.** Een rij met "Samen 40 vellen A4 en 1 vel A3" en "2 meldingen", dan de teller met de knop. Het is beter dan ronde 3, want de uitleg is weg en de vellen staan er vóór het maken. Voorstel: tot één rij terugbrengen op de telefoon.
- **ZIP is nog de hoofdknop.** Waar: klaar-pagina. De vaste balk zegt "Downloaden" (de ZIP). Per onderdeel staan PDF, Delen en Instructies, dat is goed op de telefoon (`16-print-klaar-lotte.jpg`). Voorstel: de balk noemt "Alles als ZIP" of toont eerst "Open alle PDF's".
- **Het minibord in de editor is op de telefoon nog een lege tekening zonder namen (ronde 3).** Het grote bord (knop "Bord vergroten") heeft ze wel, dus het kan nu. Het begint op Start en is breder dan het scherm, wat nu lukt door te scrollen (`03-bord-vergroten.jpg`). Het minibord zelf toont nog steeds geen namen of foto's. Voorstel: laat de kleine versie kleur en foto's tonen, de grote doet de rest.
- **Geen overzicht van kleurgroepen (ronde 3, wens).** Plaatsnaam en huurschaal per kleur staan nog steeds alleen in het vak zelf. Joost doet precies dit. Hij zocht en vond geen scherm met acht regels (kleur, plaatsnaam). Voorstel: een lijst "Kleurgroepen" in het editiepaneel.
- **Huur aanpassen blijft een lange lijst (ronde 3).** "Huur, 6 regels" is standaard ingeklapt (goed), maar na Tonen zijn het zes losse blokken met een stappenknop voor elk (`12-huur.jpg`). Er is geen schuifje "duurder of goedkoper". Voorstel: één schuif per kleurgroep boven de lijst.
- **De editienaam wordt in de vakkop afgekapt.** "Straat · oranje · Dorpsspel Maasdo…" in de ondertitel van een vak. Klein.
- **Resolutie-regel.** "Resolutie 1778 dpi, scherp genoeg" en "2540 dpi" zijn getallen waar Joost niets mee kan en die niet erg geloofwaardig zijn voor een foto in 1,7 cm. Voorstel: alleen "Scherp genoeg" of een stoplicht tonen.
- **Foto-waarschuwing mist nog een stap (ronde 3).** Controle toont "De foto heeft 76 dpi op dit formaat. Kies een grotere foto of zoom minder in." (`09-controle.jpg`) en dat klopt, ook voor het eigendomsbewijs. Er is geen knop "Andere foto" in de regel. Of een tik op de regel het vak opent heb ik dit keer niet nagekeken.
- **Verjaardagsjabloon past bij volwassenen.** "Lotte wordt 8" opent met "Het rijbewijs", "De eerste auto" en "De wereldreis". Voor een kind is dat niet de bedoeling. Voorstel: een rij "voor kinderen" bij het sjabloon of een andere set vakken.
- **Sjabloon "Club of vereniging" werkt goed**, maar de eigendomsbewijzen die erbij komen zeggen "Huur met 1 station" voor de supportersbus. Dat is het woord van het spel, dus logisch, maar voor een sportclub had ik "bus" verwacht. Klein.

## Ontwerp

- **Mooi:** de landing met "Verder met" (twee edities als knoppen) en Mijn edities met een groen vinkje "Thuisprint-set klaar tot 29 nov" en "verouderd, maak hem opnieuw" na een wijziging (`01-mijn-edities.jpg`). Het grote bord in het venster is overzichtelijk met de naam in elk vak. Het voorbeeld (V) past op de telefoon en toont ook de eerste foto's goed (`10-voorbeeld.jpg`).
- **Mooi:** de PDF's. Het club-bord (Strak) heeft schone vlakken, de kleurbalken zijn goed te knippen, de eigendomsbewijzen hebben een duidelijke kop (`19-pdf-club-rest.jpg`). Het Riso-bord van Maasdorp is levendig, met het titellint over twee vellen (`20-pdf-dorp-bord.jpg`). De uitlijntest, de snijtekens en het speelgeld zijn netjes.
- **Wat minder is:** foto's op het bord zijn nog steeds kleine plaatjes (rond 1,7 cm), zonder rand, naast de naam. De eigen foto van Het materiaalhok ("klein") is een uitgerekt blokje (`18-pdf-club-bord.jpg`, vel 5). Dat is het gevolg van mijn kleine testfoto en de waarschuwing in Controle klopt, maar op papier ziet het er goedkoop uit.
- **Logo in het midden** (B180): begint netjes als Passend en komt in plaats van de naam (`14-logo.jpg`). Op papier loopt het logo over twee vellen (rode cirkel in de hoek van vel 1 en 3, `21-pdf-lotte.jpg`). Dat kan niet anders bij 7 vellen, maar de printgids en de bordinstructie zouden er een zin over mogen hebben, want de logo's gaan er snel scheef uit als je de vellen verkeerd legt.
- **Strak-thema:** nog steeds een goedkope-inkt-variant met veel wit. Voor een club vind ik het prima, het print schoon (zie `18-pdf-club-bord.jpg`).
- **Pionnen-PDF:** "Pion 1 tot en met 8" voor de club staat netjes, maar zonder foto's (die heb ik dit keer niet gebruikt; de gezichtsuitsnede uit ronde 3 heb ik niet opnieuw getest).

## Features die ik zou willen

- **Foto's naar het juiste vak slepen of kiezen na een bulk-upload** (must). Joost heeft acht foto's en wil dat Bakker Jansen op de bakker komt. Een keuzelijst per regel in de melding zou genoeg zijn.
- **Overzicht Kleurgroepen** met plaatsnaam en huurschaal per kleur (must). Zonder kom je niet door acht groepen heen op een telefoon.
- **Huur, hypotheek en prijs schalen samen** (must), of een uitleg waarom niet. Nu zegt de tekst dat ze "vanzelf volgen" en dat doen ze niet.
- **Voorbeeld inklapbaar op de telefoon** (must). Anders blijft het formulier een klein raampje.
- **Printpagina onthoudt Thuisprint of Drukkerij per editie** (nice). Een kleine verandering, wel elke keer een tik.
- **Schuif "duurder of goedkoper" voor de huur** (nice).
- **Sjabloon "Club of vereniging" met varianten** (nice): voetbal, korfbal, tennis, met eigen vakken.
- **Foto op een vak met een gezichtsuitsnede-voorbeeld voor pionnen** (nice, ronde 3).
- **Sjabloon voor kinderverjaardag** (nice).

## Wat goed werkte

- Mijn edities: zes edities, na elke herlaadronde nog aanwezig, met een status die klopt ("klaar tot 29 nov", "verouderd").
- Naamlijst plakken: acht regels in één keer, het toast "8 namen ingevuld" verscheen en straten, stations en nutsbedrijven werden slim overgeslagen.
- Zoeken in de vakkenlijst met "kerk" gaf één regel, direct.
- Prijs te hoog: rode regel "Maximaal 216. Het bedrag staat nu op 216."
- Printen: 12, 45 en ruim 120 seconden (de laatste met meerdere testers tegelijk). Na herladen van de printpagina ging de browser direct naar de klaar-pagina.
- De klaar-pagina heeft per onderdeel PDF, Delen en Instructies; de bordinstructie noemt ook de route zonder stickerpapier.
- Foto's van 4000 px verwerkt in 8 seconden voor 8 foto's, met voortgang "verkleinen…".
