# Feedback ronde 3: Lisa en Tom, designers met een cadeau-editie (iPad 768x1024, ook liggend 1024x768)

Persona: Lisa (29) en Tom (31), Nederlands, werken allebei met vormgeving. Ze maken een bruiloftscadeau voor vrienden (hun relatietijdlijn als straten, een foto van het stel in het bordmidden, een eigen doosdeksel en een uitnodiging voor de spelavond), een huwelijksreis-editie en een jubileumeditie. Ze bestellen bij een drukkerij (Drukkerij-set) en kijken scherp naar het bordmidden, het deksel en het speelgeld. Alles gedaan op een iPad-viewport met touch (headless Chrome, iPad-useragent, 2x).

Gemaakt:

1. **Anna & Bas: ons verhaal**. Sjabloon Bruiloft, thema Klassiek, Nederlands, euro. Aangepast: ondertitel in het midden, foto over het hele midden (couple.jpg, 3000x2000), doosdeksel met foto (Hele vak), 4 straten met foto (Onze eerste date, Ons eerste huisje, De ouders ontmoeten met een piepklein jpg van 300x200, De huwelijksreis), pion 1 en 2 met naam en uitgeknipte PNG, uitnodigingstekst van 3 regels. Onderdelen: bord, eigendomsbewijzen, Kans en Algemeen Fonds, speelgeld, pionnen, deksel, huisregels, uitnodiging. Geprint: de hele Drukkerij-set (bord 4 pagina's, kaarten 122 pagina's, speelgeld 15 vellen, pionnen, deksel, uitnodiging). Ook Samen maken-link gemaakt en getest met een tweede browser als vriend (telefoon).
2. **Honeymoon Tour**. Leeg, thema Riso, English, euro (zelf teruggezet, zie bugs), alle 22 straten hernoemd naar plekken (Lisbon, Porto, Seville, Kyoto, Maldives enzovoort) met landnaam bij "Plaats", foto bij Lisbon en Crete. Onderdelen: bord, kaarten, speelgeld, pionnen, deksel, huisregels, huisjes en hotels, dobbelstenen, uitnodiging. Geprint: bord, kaarten, pionnen, deksel, huisjes en hotels, dobbelstenen. Het speelgeld niet (stond al bij editie 1), alleen bekeken in de editor.
3. **Tien jaar Lisa & Tom**. Sjabloon Verjaardag, thema Strak, Nederlands, eigen munt "Kus" met teken K, ondertitel "10 jaar, 3 verhuizingen, 1 hond", 8 straten hernoemd, foto in het ovaal van het biljet van 100. Geprint: bord, kaarten, pionnen, deksel, uitnodiging. Speelgeld niet geprint, wel bekeken in de editor.

Niet getest: Thuisprint-set, het proefvel, de Engelse interface, een echt HEIC-bestand.

## Samenvatting

Het voelt als een serieus ontwerpgereedschap, niet als een speeltje. De drie thema's zijn mooi en het speelgeld is het mooiste onderdeel: het Riso-biljet en het biljet met foto in het ovaal zien er echt uit. Het bord met foto in het midden werkt, en de hele set was in ongeveer 50 seconden klaar. Het grootste probleem is dat het bordmidden en het deksel net niet het cadeaugevoel halen: het titellint ligt dwars over de gezichten van het stel, het deksel is een kale plaat met een titel, en de foto op de pion wordt boven afgesneden. Op de iPad staand loopt de kop van de site over de rand en de vaste knopbalk onderaan is te breed. Liggend (1024) werkt de editor met drie kolommen goed.

## Werkt niet (bugs)

**1. Kop van de site past niet op iPad staand**
- Waar: elke openbare pagina en de printpagina, 768 breed.
- Wat: "Inloggen met Google" valt half buiten beeld, "Mijn edities" breekt over twee regels, de pagina is horizontaal 940 px breed (scrollWidth 940 bij 768). Liggend is het goed.
- Verwacht: past, of valt terug op het menu zoals op de telefoon.
- Ernst: hinderlijk.
- Stappen: open /nl op 768x1024.
- Screenshot: `img/stel-lisa-tom/01-header-afgesneden-portret.jpg`

**2. Vaste knopbalk "Editie maken" is te breed**
- Waar: Nieuwe editie, iPad staand.
- Wat: de balk is 940 px breed in een scherm van 768. De rode knop loopt aan de rechterkant buiten beeld en niet gecentreerd, en de balk ligt over de voettekst.
- Verwacht: knop binnen beeld.
- Ernst: hinderlijk (de knop is wel te tikken).
- Screenshot: `img/stel-lisa-tom/02-editie-maken-balk.jpg`

**3. Vaste balk op de printpagina heeft een superdunne tekstkolom**
- Waar: printpagina, iPad staand.
- Wat: de uitleg "Voor de PDF's sturen we je editie..." staat in een kolom van ongeveer 170 px en wordt 10 regels hoog. De balk neemt zo een kwart van het scherm in. Liggend is hij netjes.
- Ernst: hinderlijk.
- Screenshot: `img/stel-lisa-tom/19-printbalk-smal-portret.jpg`

**4. Foto op een pion wordt boven afgesneden**
- Waar: Doos, Pion 1 en 2, en in de pionnen-PDF.
- Wat: ik uploadde een uitgeknipte PNG van 800x1200 (hoofd, schouders). Op de pion staat alleen de onderste helft van het hoofd en de romp. Ogen en bovenkant van het hoofd zijn weg. Zoom stond op 100 procent.
- Verwacht: de hele figuur in beeld, of een uitsnede-hulp die laat zien wat wegvalt.
- Ernst: hinderlijk (pionnen met gezichten zijn juist het cadeau).
- Screenshots: `img/stel-lisa-tom/10-pion-editor-hoofd-afgesneden.jpg`, `img/stel-lisa-tom/11-pionnen-pdf.jpg`

**5. Miniatuur op de printpagina en plaatje in de uitnodiging tonen het bordmidden zonder mijn foto**
- Waar: printpagina (bovenin en bij "Bord") en de uitnodiging (editor en PDF).
- Wat: in de editor en in de bord-PDF staat de foto van het stel in het midden. De miniatuur op de printpagina en het bordje op de uitnodiging tonen het gewone groene midden met het gele lint.
- Verwacht: dezelfde tekening als het echte bord. Voor een cadeau wil je juist het uitnodigingsplaatje met jullie foto.
- Ernst: hinderlijk. Op de printpagina denk je eerst dat de foto weg is.
- Screenshots: `img/stel-lisa-tom/24-printpagina-miniatuur-zonder-foto.jpg`, `img/stel-lisa-tom/08-uitnodiging-pdf-zonder-foto-midden.jpg`

**6. Controle meldt een te lage resolutie van de middenfoto niet**
- Waar: Midden van het bord, Afbeelding.
- Wat: onder de foto staat "Resolutie 141 dpi, te laag" (3000 px over 500 mm). De knop Controle bleef op "1" staan, en dat ene ding is de pionnenwaarschuwing. Ik heb de lijst niet na elke stap herladen, dus misschien komt de melding pas later.
- Verwacht: een waarschuwing in Controle, anders mis je hem bij het bestellen.
- Ernst: hinderlijk, onder voorbehoud.

**7. Engelse taal zet de munt op "M"**
- Waar: nieuwe editie met taal English.
- Wat: de editie begon met munt "M" (speelgeldteken) in plaats van euro. Ik zag dat pas in de editor ("Klassiek · English · M"). Ik heb het zelf op euro gezet.
- Verwacht: euro blijven, of in het formulier tonen wat er gebeurt. In het formulier staat "Munt: € euro. Die volgt de taal", dat klopt dan niet.
- Ernst: klein.

**8. Liggend: tabbladen en titel worden afgekapt**
- Waar: editor 1024x768. "Eigendomsbewijs" in de Vak/Eigendomsbewijs-schakelaar is aan de rechterkant afgekapt ("Eigendomsbewi"), en de edititel in de kop is "Anna & ...".
- Ernst: klein.
- Screenshot: `img/stel-lisa-tom/20-liggend-editor.jpg`

**9. Hulptekst bij het bordmidden klopt niet met het beeld**
- Waar: Midden van het bord. De tekst zegt "Rood gearceerd: de vouwlijnen en de vakken voor de kaartstapels." De vouwlijnen zijn beige-grijs gearceerd, alleen de kaartvakken hebben een rode rand.
- Ernst: klein.

## UX: wat kan beter

- **Het midden van het bord is moeilijk te vinden.** Je komt er alleen door op "Bord vergroten" te tikken en dan midden op het bord. In de lijst met 40 vakken staat geen regel "Midden". Dit is het onderdeel waar wij het meest voor kwamen. Voorstel: een regel "Midden van het bord" bovenaan de lijst, en een eigen knop "Foto in het midden" in het hoofdscherm.
- **Op de vergrote kaart ligt de knop "Vak kiezen" over de titel.** In de vergrote weergave drukt hij op de titel in het midden. Screenshot: `img/stel-lisa-tom/26-groot-bord-vak-kiezen-knop.jpg`.
- **De foto in het midden kies je in twee stappen.** Eerst "Foto over het hele midden", dan pas verschijnt "Foto kiezen". Dat is logisch als je het weet, maar na het kiezen van de optie gebeurt er niets zichtbaars. Verplaatsen kan alleen met vier pijlknoppen en een zoomschuif. Op een iPad verwacht je slepen en knijpen. Voorstel: slepen en twee vingers in het voorbeeld.
- **Voorbeeldbord in het Editiepaneel is klein op iPad staand.** Het plakt bovenin vast en neemt een derde van het scherm in, terwijl het bord maar 320 px breed is en straatnamen niet te lezen zijn. De formulieren eronder scrollen in een venster van ongeveer 380 px hoog. Liggend is dit veel beter. Voorstel: staand ook twee kolommen vanaf 768, of het bord inklapbaar.
- **"Leeg" en "Verjaardag" geven een set zonder speelgeld, deksel en huisregels.** Bij Leeg moest ik speelgeld, deksel en huisregels zelf aanvinken in Onderdelen. Bij Verjaardag ook speelgeld, deksel en huisregels. De tekst in het formulier zegt wel "Wat je niet kiest, sla je over". Maar je verwacht bij "Leeg" ("De standaardeditie") een volledige set. Voorstel: standaard alles aan voor Leeg, of in het formulier tonen wat er niet in zit.
- **Acht pionnen zijn het minimum in de set en geven een waarschuwing.** "8 pionnen hebben nog geen foto" bleef de hele tijd in Controle staan terwijl we een cadeau voor twee spelers maken. Ik heb niet gevonden hoe je het aantal pionnen verkleint. Voorstel: aantal pionnen instelbaar, of de waarschuwing pas bij Printen.
- **Foto op een straat in "Hele vak" met een donkere foto**: zie Ontwerp. De editor laat niet zien dat de prijs onleesbaar wordt.
- **Bij een eigen munt staat alleen het teken op het biljet.** Mijn munt heette "Kus" en op het biljet staat "K 100". De naam van de munt komt nergens terug. Voorstel: naam onder het bedrag in plaats van het woord "Speelgeld", of een veld daarvoor.
- **Rate limit bij snel achter elkaar klikken.** Als je meerdere "Maken"-knoppen snel indrukt komt "Te veel aanvragen. Wacht een minuut" en staat de balk op "0 van 6 klaar". De melding is duidelijk. Zelf zou ik "Drukkerij-set maken" gebruiken, dat ging in één keer goed. Klein.
- **Samen maken**: het werkt goed (link, vriend stuurt een foto met voornaam, bij de maker staat "Wacht op jou (1)"). Bij een bijdrage met foto en naamvoorstel stond in de lijst alleen "Van Sanne · Met foto". Of het naamvoorstel binnen het vak zichtbaar is heb ik niet bekeken.

## Ontwerp

Mooi:
- **Speelgeld.** Het beste van de site. De guilloche, de ovale kaders en de rode of blauwe strook met onze naam zien er echt als geld uit. Het Riso-biljet in roze en het biljet met de foto in het ovaal (K 100, donkerblauw) zijn precies wat wij zochten. Screenshots: `img/stel-lisa-tom/12-geld-pdf-klassiek.jpg`, `13-geld-riso-editor.jpg`, `14-geld-foto-in-ovaal.jpg`.
- **De drie thema's.** Riso is levendig, Strak is rustig en kloppend, Klassiek is warm. De bord-PDF's zien er professioneel uit (`07-bord-pdf-bruiloft.jpg`, `15-bord-pdf-riso.jpg`, `17-bord-pdf-strak.jpg`). De straatnamen zijn goed leesbaar, de pictogrammen helder.
- **Foto op het bord.** In kader (Onze eerste date) ziet er netjes uit. De foto over het hele midden vult het bord goed.
- **Uitnodiging.** Mooie kleine kaart, de drie regels "Wanneer / Waar / Neem mee" staan er goed op (`08-uitnodiging-pdf-zonder-foto-midden.jpg`).

Rommelig of niet af:
- **Titellint over de gezichten.** Het gele of zwarte lint loopt precies diagonaal door het midden en dus door de gezichten van het stel. Ook de twee kaartvakken (stippellijn) vallen over de foto. Het is niet te verplaatsen, te verkleinen of weg te laten bij een foto. Voor een cadeau is dit het grootste ontwerpprobleem (`04-midden-foto-lint-over-gezichten.jpg`, `07-bord-pdf-bruiloft.jpg`).
- **De ondertitel op het lint is piepklein.** "voor Anna & Bas, 14 juni 2026" is op het geprinte bord ongeveer een paar millimeter hoog. Dit is precies de regel die je als cadeau wilt lezen.
- **Doosdeksel is de zwakste plek.** Een kale plaat met een titel en vier icoontjes, of een foto met een lichte band over het midden. De tekst "Een spel voor 2 tot 8 spelers" is niet te wijzigen (in de editor staat alleen Titel). In "Hele vak" ligt een grote lichte band over onze foto en het onderwerp van de foto verdwijnt (`05-deksel-hele-vak-editor.jpg`, `06-deksel-pdf-bruiloft.jpg`). Het Riso- en Strak-deksel zijn kaal (`16-deksel-pdf-riso.jpg`, `18-deksel-pdf-strak.jpg`).
- **"Hele vak" met een donkere foto.** De prijs en de naam op "De huwelijksreis" (foto van Lissabon) zijn bijna onleesbaar in de bord-PDF. De naam in wit past niet, de prijs gaat verloren. Er zit wel een donkere verloop onder, maar het is te weinig (`07-bord-pdf-bruiloft.jpg`, rechterkant).
- **Lange straatnamen worden piepklein.** "Het studentenkamertje" en "De fiets met zijwieltjes" krimpen tot onleesbaar in het vak (`17-bord-pdf-strak.jpg`). De editor geeft hier geen waarschuwing over.
- **Pionnen**: hoofd afgesneden, zie bugs.
- **Stations tonen "€ 20200"?** In mijn samengestelde schermafbeelding van de vier bordpagina's staan op de stations dubbele prijzen. Dat komt doordat ik de pagina's met de 3 mm afloop naast elkaar plakte, dus geen bug. Toch handig als de printgids laat zien hoe je de vier delen aansluit.
- **De PDF's**: de bord-PDF is 4 pagina's van 254 mm (248 mm plus afloop), het deksel 273 mm met afloop. Ik heb de maten niet tegen een drukkerij gecontroleerd. Wat ik miste: een bestandje of pagina met de specificatie voor de drukker (maat, afloop, kleurprofiel, aantal), zodat je die direct kunt doorsturen.

## Features die ik zou willen

- **Midden van het bord vrij indelen**: lint verplaatsen, kleiner maken of weglaten, kaartvakken verbergen op de foto, tekst onder de foto zetten. Waarom: het stel in het midden is het cadeau. Must.
- **Slepen en knijpen bij foto's op touch**. Waarom: wij werken op de iPad. Must.
- **Deksel met eigen tekstregels en indeling** (ondertitel, datum, handgeschreven bericht, foto zonder band). Waarom: het deksel is het eerste wat de vrienden zien. Must.
- **Aantal pionnen kiezen** en een foto op alle pionnen in één keer. Waarom: wij maken voor 2 tot 6 spelers. Nice.
- **Foto op Kans- en Algemeen Fonds-kaarten** in "Hele vak" met goed leesbare tekst, voor onze herinneringen als kaarten. Nice.
- **Uitnodiging met het echte bord** (mijn eigen midden) en optioneel een foto. Must voor een cadeau.
- **Drukker-informatie op één pagina** (maat, afloop, papier, aantal, kleurprofiel) en een voorbeeld-PDF met de snijlijnen. Waarom: wij bestellen bij een drukkerij. Must.
- **Meerdere exemplaren van één editie bestellen als één pakket** (wij maken er 3: bruiloft, jubileum, een voor onszelf). Nice.
- **Editie delen als alleen-lezen link met voorbeeld** zodat de vrienden het cadeau eerst "uitpakken" op het scherm. Nice.
- **Bijschrift met naam van de munt** op het biljet bij een eigen munt. Nice.
- **Waarschuwing bij onleesbare tekst op een foto** (donkere foto, lange naam). Nice.

## Wat goed werkte

- De sjabloon Bruiloft gaf een echte relatietijdlijn als straten ("Waar het allemaal begon", "Het aanzoek", "Het jawoord"). Dat scheelde veel werk.
- Foto uploaden aan een straat was een kwestie van twee tikken, met meteen een dpi-melding ("1161 dpi, scherp genoeg").
- Speelgeld met foto in het ovaal.
- De printpagina maakte de hele set in ongeveer 50 seconden, met duidelijke statussen per onderdeel en een ZIP.
- Het liggende scherm van de editor (drie kolommen) is overzichtelijk en snel.
- Samen maken met een tweede browser ging zonder account en de bijdrage kwam direct binnen.
- Geen console-errors behalve de Bugsnag-melding in mijn testomgeving.
