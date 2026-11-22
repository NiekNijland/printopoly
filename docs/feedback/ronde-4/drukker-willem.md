# Feedback ronde 4: drukker die klantbestanden beoordeelt (desktop 1920 × 1200)

Persona: Willem, 55, eigenaar van een drukkerij. Klanten sturen hem de ZIP van Printopoly. Hij kijkt als vakman naar de bestanden: TrimBox en BleedBox, snijtekens, afloop, resolutie, lettertypen, kleur, bestandsgrootte, namen en of de instructies hem alles vertellen.

Gemaakt (alle drie in headless Chrome, 1920 × 1200, met foto's van 3000 tot 4000 px en één piepklein plaatje van 160 px):

1. **Dorp Klassiek**: sjabloon leeg, thema Klassiek, Nederlands, euro. Vier straten kregen een foto (kerk, bakker, station, portret), één straat een piepklein plaatje, een logo (PNG 1800 px) in het midden. Onderdelen: bord en kaarten. Geprint: Drukkerij-set.
2. **Riso Bedrijfsspel**: sjabloon Bedrijf of team, thema Riso, Nederlands, euro. Vier vakken met foto, "Naam met foto" in het midden. Alle elf onderdelen aan (speelgeld, pionnen, doosdeksel, huisregels, spelregelboekje, huisjes en hotels, dobbelstenen, uitnodiging). Geprint: de complete Drukkerij-set, één keer.
3. **Harbour Town**: leeg, thema Strak, Engels, pond. Vier vakken met foto, logo in het midden. Onderdelen: bord en kaarten. Geprint: Drukkerij-set (Print-shop-set) en Thuisprint-set (Home-print set).

Gecontroleerd met pdfinfo -box, pdffonts, pdfimages -list, pdftotext en pdftoppm op 30 tot 300 dpi.

## Samenvatting

Technisch is dit een nette set. Elke pagina met afloop heeft een TrimBox en BleedBox die kloppen met de snijtekens, alle lettertypen zijn ingesloten, foto's zijn teruggebracht naar precies 300 ppi en de bestandsnamen zijn genummerd. Als drukker kan ik dit zonder voorbewerking in mijn workflow zetten. Het grootste probleem is het speelgeld: één PDF van 25 MB zonder TrimBox, en daarmee een ZIP van 25 MB. Het tweede is dat de instructies maten noemen die niet overeenkomen met de PDF (spelregelboekje 154 × 216 mm terwijl de TrimBox A5 is, en de pagina's zijn 167 × 228 mm). Verder mist een bestelblad dat ik als drukker nodig heb: kleurruimte, hoekradius, kaartvolgorde en wat de klant wil dat ik snij.

## Werkt niet (bugs)

**1. Spelregelboekje: maat in de instructies klopt niet met de PDF.** Hinderlijk (een drukker zet hierop zijn offerte).
Waar: `instructies/instructies-spelregelboekje.pdf` en `06-spelregelboekje-printer.pdf`. De instructie zegt "Elke pagina is een eigen pagina van 154 × 216 mm, met 3 mm afloop" en noemt het een A5-boekje. De TrimBox in de PDF is 148,5 × 210 mm (A5), de BleedBox 154 × 216 mm en de pagina zelf 166,5 × 228 mm. De instructie noemt dus de afmeting mét afloop alsof het de eindmaat is. Bij het bord en de kaarten is dit wel goed uitgelegd ("248 × 248 mm, met 3 mm afloop erbij (254 × 254 mm)"). Verwacht: dezelfde zin als bij het bord: "eindformaat A5 148 × 210 mm, 154 × 216 mm met afloop, paginagrootte in de PDF 167 × 228 mm". Stappen: Riso Bedrijfsspel, Drukkerij-set, instructies-spelregelboekje openen en `pdfinfo -box` op het boekje draaien.

**2. Speelgeld heeft geen TrimBox en BleedBox.** Hinderlijk. In `03-speelgeld-printer.pdf` zijn MediaBox, CropBox, BleedBox en TrimBox alle vier gelijk (906,96 × 1276,08 pt = 320 × 450 mm, SRA3). Ook pionnen, huisjes, dobbelstenen en de A4-vellen hebben dit. Het is bewust (geen afloop, eigen snijtekens), maar mijn preflight ziet dan "TrimBox = MediaBox" en geeft een waarschuwing, en een snijplotter die op TrimBox positioneert kan niets met deze bestanden. De snijtekens staan wel op het vel (zie `img/drukker-willem/09-speelgeld-en-doos.jpg`). Voorstel: zet daar ook een TrimBox die het snijkader omvat, of leg in de instructies uit dat die ontbreekt.

**3. Kaartmaat wijkt 0,1 tot 0,2 mm af van 63 × 88.** Klein. TrimBox van de kaarten is 63,11 × 87,84 mm (178,9 × 248,98 pt), niet 63,00 × 88,00. Chrome rondt de paginagrootte af op hele pixels. Bij een kaartensnede merk je dit niet, maar als iemand hem naast een echte kaart legt of een stans bestelt, klopt het net niet. Bord (248,0 mm) en A6-uitnodiging zijn wel exact.

**4. Enter in het naamveld verspringt de selectie.** Klein. In de lijst met vakken typte ik een nieuwe naam bij Molenweg en drukte Enter. De selectie sprong stil naar de volgende straat (Veldweg). Mijn foto daarna kwam op Veldweg terecht en verving daar de kerkfoto. Pas in de printpagina zag ik dat de foto's van de bakker en de kerk verwisseld waren. Waarschijnlijk bedoeld ("Enter naar het volgende vak"), maar met een foto-upload erna is het verraderlijk. Stappen: vak kiezen, naam typen, Enter, foto uploaden. Schermafdruk: `img/drukker-willem/05-bord-panelen.jpg` (De Kerk heeft de bakkerfoto).

## UX: wat kan beter

**Bestelblad of "wat vertel ik de drukker".** De instructies per onderdeel zijn goed, maar ik mis een gezamenlijk blad dat de klant mij kan doorsturen. Wat ik als drukker wil weten en nu niet in de bestanden vind:
- Kleurruimte: de PDF's zijn RGB met een ingesloten ICC-profiel (pdfimages meldt "icc 3 comp"). Nergens staat dat dit sRGB is en dat CMYK-omzetting bij mij gebeurt. Een zin "RGB (sRGB), omzetten naar CMYK door de drukkerij is goed" scheelt mij een mail.
- Hoekradius: de instructie zegt "hoeken afgerond" maar niet hoeveel (3 mm is gangbaar voor 63 × 88).
- Dubbelzijdig: "voor en achter om en om" staat er wel, maar niet of de kaart draai-om-lange-zijde of -korte-zijde is. Bij een kaartenset met 120 pagina's wil ik dat zeker weten.
- Snijden: bij het bord staat niet of de vinylsticker contourgesneden (plotter) of rechtgesneden moet. De snijtekens suggereren recht.
- Opmerking dat de pagina's groter zijn dan het eindformaat (bord 266 mm voor 248 mm eindformaat). Een klant die bij een webshop uploadt, kiest anders "248 × 248" en krijgt een schaalwaarschuwing.
- Aantallen: "4 stuks" en "60 kaarten" staan er. Bij meerdere sets (stepper "1 set") hoort het totaal in de instructies te meekomen.

**Snijtekens raken de afloop.** De snijtekens eindigen precies op de rand van de afloop (BleedBox). Gangbaar is een afstand van minstens 2 tot 3 mm tussen afloop en teken, zodat het teken nooit in beeld kan komen als er iets verschuift. Bij kaarten met een crème achtergrond zie ik het niet snel, bij een donker vlak wel. Zie `img/drukker-willem/07-snijtekens-hoek.jpg`. Het zijn pure RGB-zwarte lijnen van ongeveer 0,25 pt, geen registratiekleur, wat voor RGB-werk prima is.

**Bord heeft geen vinkje op de printpagina.** Op de printpagina staat geen checkbox bij Bord, wel bij Kaarten. In de editor staat "Bord, zit er altijd in", maar op de printpagina zie je dat niet en je vraagt je af of je het bord kunt uitvinken. Voorstel: toon een uitgegrijsd aangevinkt vakje of de tekst "altijd in de set".

**Een Engelse editie geeft een Engelse ZIP.** Bij Harbour Town heet de ZIP `Print-shop-set.zip` en de bestanden `01-board-printer.pdf`, instructies in het Engels. Dat past bij de taal van de editie en is consequent, maar mijn Nederlandse drukkerij krijgt nu een Engels bestand terwijl de klant de site in het Nederlands gebruikte. Voorstel: laat de taal van de instructies en bestandsnamen de taal van de interface volgen, niet van de editie, of laat de klant kiezen.

**ZIP-naam en bestandsnamen bevatten de editienaam niet.** `Drukkerij-set.zip` en `01-bord-printer.pdf`. Als ik tien klanten per dag heb en alles in één map komt, is dat onbruikbaar. De titel zit wel in de PDF-metadata (Title: "Riso Bedrijfsspel"), maar niet in de bestandsnaam. Voorstel: `riso-bedrijfsspel-01-bord.pdf`.

**Controle: 2 zonder duidelijke ernst.** In Dorp Klassiek stond "Controle: 2" voor het piepkleine plaatje van 160 px (printresolutie 102 ppi). Het is een goede waarschuwing, maar de printpagina onderaan zegt alleen "2 meldingen in Controle" als link en laat je gewoon "Drukkerij-set maken" doen. Wil je dat een klant vooraf geblokkeerd wordt of niet? Voor mij is dit een voordeel: ik zie liever zo'n waarschuwing bij hem dan dat ik hem moet geven.

## Ontwerp

**Wat er goed uitziet.** De panelen van het bord (`05-bord-panelen.jpg`) hebben nette snijtekens, een label "Paneel A" tot "Paneel D" in de rand en de panelen stoppen 1 mm voor de vouw. De kaarten hebben een duidelijke zwarte kader binnen de afloop, zodat een kleine snijafwijking niet opvalt. Het speelgeld (`09-speelgeld-en-doos.jpg`) heeft een label per vel met de coupures en ziet er verzorgd uit in Riso-roze. Het doosdeksel en de uitnodiging (`10-boekje-uitnodiging-pionnen.jpg`) hebben dezelfde snijtekens en een vlakke achtergrond tot in de afloop. Het spelregelboekje heeft op de omslag een bleedende roze rand en binnenpagina's met een eigen kader.

**Wat er rommelig of niet af is.** Het logo midden op het bord (mijn rode vierkant met "RT") staat in de editor als ruit en eroverheen loopt het rood-gestreepte vouwraster (`02-editor-logo.jpg`). In de PDF staat het op vier panelen verdeeld en is het gelukkig vlak. Het Thuisprint-bord (`11-thuisprint-strak.jpg`) is verdeeld over zeven A4-vellen met veel leeg papier (bladzijde 1 tot 4 zijn grotendeels wit met een rode hoek). Voor thuis is dat logisch, maar een knipper zou graag zien dat de lege delen kleiner zijn.

**PDF-techniek (dit is de kern voor mij).**
- Bord: 4 pagina's, MediaBox 754,08 pt (266 mm), TrimBox 25,51 pt van de rand (9 mm, eindformaat 248 mm), BleedBox 17,01 pt (6 mm, dus 3 mm afloop). Klopt met de snijtekens en de instructie.
- Kaarten: 120 pagina's (122 bij Riso), paginagrootte 81,1 × 105,8 mm, TrimBox 63,1 × 87,8 mm, BleedBox ernaast. Voor en achter om en om.
- Doosdeksel: pagina 285 mm, TrimBox 267 mm. Boekje: 16 pagina's, TrimBox A5. Uitnodiging: TrimBox A6.
- Speelgeld, pionnen, huisjes en hotels, dobbelstenen: geen TrimBox (gelijk aan MediaBox), eigen snijtekens.
- Lettertypen: League Spartan, Instrument Sans en IBM Plex Mono, overal ingesloten en subset (`emb yes, sub yes`). Geen enkel ontbrekend lettertype.
- Afbeeldingen: foto's op 300 ppi (425 × 520 px voor 36 × 44 mm, 638 × 148 px voor de strook op de kaart). Het piepkleine plaatje van 160 px staat op 102 ppi, en dat is precies wat de editor ook waarschuwde. Er wordt dus gedownsampeld naar 300 ppi, niet hoger. Dat is goed (geen kunstmatig opgeblazen foto's), maar het betekent dat een grote foto die later op een groter oppervlak komt, niet de volle 3000 px meekrijgt. Voor deze toepassing prima.
- Kleur: RGB met ICC-profiel (`icc`, 3 componenten, JPEG). Geen CMYK, geen PDF/X, geen OutputIntent. Bewust (B160), en bij kopieerwinkels geen probleem. Bij mij gaat het via mijn RIP.
- Producer: "Skia/PDF m157", PDF 1.4, Creator Chromium, `Tagged: yes`. Voor een drukker oninteressant, wel voorspelbaar.
- Bestandsgrootte: bord 190 tot 220 KB, kaarten 560 tot 580 KB, ZIP van bord en kaarten 380 KB. Speelgeld echter **25,2 MB** voor 22 vellen vector (0 afbeeldingen, 0 patronen volgens mutool) en daardoor een ZIP van 25 MB. Per vel is dat 1,1 MB aan vectorpaden. Mijn RIP verwerkt dit wel, maar een klant die het uploadt via een webformulier met 20 MB-limiet loopt vast. Voorstel: guilloche-patronen als herhaalde vorm of als één afbeelding opslaan, of speelgeld per coupure splitsen.
- Instructies: aparte A4-pdf's per onderdeel, goed leesbaar.

## Features die ik zou willen

- **Bestelblad (PDF of tekst) per set**: editienaam, onderdelen, aantallen, eindmaten, papier, afwerking, kleurruimte, hoekradius en draairichting. Klant kan het in zijn mail of webformulier plakken. Must.
- **TrimBox en snijtekens ook op speelgeld, pionnen, huisjes, dobbelstenen** (of een regel waarom niet). Nice.
- **Kleinere speelgeld-PDF** (onder 10 MB) of per coupure gesplitst. Must voor klanten met een uploadlimiet.
- **Editienaam in ZIP- en bestandsnamen.** Must.
- **Keuze tussen sRGB en CMYK-omzetting** of een zin dat de drukkerij het mag omzetten. Nice (bij RGB-only kan ik zelf omzetten, maar de klant weet dat niet).
- **Snijtekens met afstand tot de afloop** (2 tot 3 mm) en optioneel registratiekleur. Nice.
- **Hoeklijn of stansmal als aparte laag** voor afgeronde kaarten. Nice, voor drukkers met een stans.
- **Taal van de ZIP loskoppelen van de taal van de editie.** Nice.

## Wat goed werkte

- TrimBox en BleedBox kloppen op bord, kaarten, doosdeksel, boekje en uitnodiging, en passen bij de snijtekens.
- Alle lettertypen ingesloten, foto's op 300 ppi, geen verloren afbeeldingen.
- Duidelijke, genummerde bestandsnamen en per onderdeel een aparte instructie-PDF.
- De Thuisprint-set heeft een uitlijntest (voor- en achterkant met kruisen) en legt de dubbelzijdig-keuze goed uit.
- Maken van de set duurde 25 tot 50 seconden voor een volledige set met alles, 25 seconden voor bord en kaarten. Eerder gemaakte bestanden stonden na herladen nog klaar.
- De waarschuwing over het piepkleine plaatje (Controle: 2) kwam op tijd.
- Foto's stonden na het printen op de goede plek, op de plaats die de editor liet zien.

Schermafdrukken: `docs/feedback/ronde-4/img/drukker-willem/` (13 stuks).
