# Feedback ronde 6: Britse grafisch ontwerper, streng op beeld (MacBook 1512 × 982 en venster van 1024 px)

Persona: Tom, 33, grafisch ontwerper in Londen. Hij let op typografie, witruimte, uitlijning, thema's, iconen en de PDF's. Hij gebruikt /en, Engels met ponden.

Gemaakt:

1. Fairline Studio Away Day. Sjabloon Group, thema Sleek, Engels, £. Zes vakken hernoemd (Reception, The Lanyard, Old Street Station, The Crit Wall, Pantone Library, The Plotter). Eigen logo (PNG met transparantie) in het midden, eerst "Across the middle", daarna rechtsboven en diagonaal. Eigen regel op het deksel. Geprint: drukkerijset met bord, kaarten en deksel.
2. London Calling. Leeg, thema Riso, Engels, £. 22 straatnamen in één keer geplakt in het zoekveld, stations en hoeken hernoemd. Eigen woorden: flat/flats, tower block, Tube station, Mind the Gap, Oyster Card, Bank of Hackney, the Tower. Breed logo TOM&CO diagonaal in het midden. Vijf foto's, waarvan één te klein (160 × 120) en één staand. Geprint: thuisset met bord, kaarten, speelgeld, deksel en los het testvel.
3. Ollie & Priya's Big Day. Sjabloon Wedding, thema Classic, Engels, £. Foto over het hele midden, vijf vakken hernoemd, twee vakfoto's, pionnen Ollie (met foto) en Priya, uitnodiging met eigen kop, datum en plaats. Geprint: thuisset met bord, kaarten, pionnen, uitnodiging en spelregelboekje.

Daarnaast een losse lege editie "Repro centre photo" om een fotoprobleem na te lopen.

## Samenvatting

Het maken voelt nu rond. De drie editions waren elk in twintig minuten klaar, en de PDF's kwamen binnen een halve minuut. Het mooiste vind ik de uitnodiging, het spelregelboekje en het Riso-thema: daar zit echt ontwerp in. Het grootste probleem is samenhang. Sleek is strak op het bord, maar het speelgeld en het deksel horen er niet bij, en mijn logo komt alleen op het bord. Ook zijn er te veel verschillende stijlen voor hetzelfde soort knop. Bugs die iets blokkeren heb ik niet gevonden.

## Werkt niet (bugs)

1. Pionnen zijn niet gelijk opgemaakt. Waar: Box, Pawns, en de pionnen-PDF. Een pion met foto krijgt de naam in heel kleine letters onder een kleine foto. Een pion zonder foto krijgt de naam groot. Op een vel naast elkaar ziet dat eruit als een fout. Verwacht: dezelfde naamgrootte, of de foto groter en de naam even zwaar. Ernst: hinderlijk. Stappen: geef pion 1 een foto en pion 2 alleen een naam, bekijk Preview, Pawns. Screenshot: `img/designer-tom/19-pionnen-ongelijk.jpg`.

2. Space-namen in kaartteksten houden een hoofdletter midden in de zin. Waar: kaarten van Wedding en Group. "Go to The wedding car", "Go to The microphone or The champagne". In het Engels leest dat als een fout. Verwacht: "the" klein midden in een zin, of het sjabloon zonder "The" in de naam. Ernst: klein, maar het valt een Britse lezer direct op.

3. De kosten-regel volgt de eigen woorden niet. Waar: vak, Amounts. Ik noemde huizen "flats" en hotels "tower blocks". De huurregels in het paneel en op de kaart doen dat goed ("Rent with 1 flat"), maar het veld heet nog "Building cost per house and hotel". Ernst: klein.

4. Het testvel laat de foto van het vak weg. Waar: testvel van London Calling. Brick Lane heeft een foto, maar op het testvel staat het vak zonder foto. Juist een foto wil ik op ware grootte testen. Ernst: klein. Screenshot: `img/designer-tom/30-pdf-testvel-zonder-foto.jpg`.

5. Op de 404-pagina en de printgids is "New edition" in de kop een rode, gevulde knop. Op de home, Mijn edities en de printpagina is dezelfde knop zwart omlijnd. Ernst: klein. Screenshot: `img/designer-tom/22-404-rode-knop.jpg`.

Gecontroleerd uit ronde 5, en opgelost:

- R5-01: een staande foto (The Strand) geeft geen melding "bedekt het kader niet" meer.
- R5-02: "Photo over the whole centre" met "Choose photo" toont de foto direct. Bij mijn eerste poging zag ik hem niet, maar dat kwam door hoe mijn script het bestand aanbood. Via de echte fotokiezer werkt het.
- R5-09: een te kleine foto geeft één melding, met een label "Too small" in de lijst.
- R5-10: 22 namen plakken in het zoekveld werkt. Er komt een melding "22 names filled in. 11 spaces of another kind were skipped."
- R5-17: Group heeft geen kantoorgrappen meer, en Wedding heeft geen kaart meer die naar een vak met dezelfde naam wijst.
- R5-20: bij Group staan geld, pionnen, deksel en uitnodiging netjes op "not in your set".
- R5-22: "Village or neighbourhood" past bij 1024 px in de kaart. De munt staat bij een nieuwe editie op £. Ik heb niet kunnen zien of dat onthouden is of komt doordat de taal Engels is.
- R5-23: "My editions" heeft tekst in de kop, en "Continue with" toont alle vier de edities.
- R5-24: "Share your board" toont mijn eigen bord met foto's en woorden. De banner zegt nu "Our own edition".
- R5-25: de ZIP van de drukkerijset heeft het bestelblad.
- R5-26: het testvel toont £ en de eigen naam van het eerste vak.
- R5-28: de uitnodiging heeft velden voor kop, datum, plaats en wat je meeneemt. Leeg laten geeft stippellijnen.
- R5-29: het boekje zegt dat het geld uit je eigen doos komt als je geen geld print. Het deksel past thuis op twee A4's. Het eerste geldvel heeft alle biljetten, niet alleen £1.

Deels opgelost:

- R5-03: de foto over het hele midden zet het gezicht boven de horizontale vouw, maar bij mij kwam het gezicht precies op de verticale vouw (zie `img/designer-tom/28-pdf-bruiloft-gezicht-op-vouw.jpg`). De check voor het printen zegt daar niets over, terwijl hij bij een logo over de vouw wel waarschuwt.

## UX: wat kan beter

1. Mijn logo komt alleen op het bord. Waar: Box lid, kaartachterkanten, uitnodiging. Bij de bedrijfseditie wil ik het logo ook op het deksel en de achterkant van de kaarten. Nu moet ik het logo nog eens als "Photo" uploaden bij het deksel, en op de kaartachterkant kan het alleen als foto die het hele vlak vult. Voorstel: een keuze "Use the edition logo" bij deksel, kaartachterkant en uitnodiging.

2. Het logo in het midden kan niet zonder naad. Waar: Centre, Logo, Place in the centre. Rechtsboven en linksonder zijn de enige plekken zonder waarschuwing. Voor een bedrijfslogo voelt een logo uit het midden scheef. Ik snap de vouw, maar zeg dan bij de keuze zelf waarom het midden niet kan. Nu lees ik het pas na het kiezen, en daarna nog eens op de printpagina.

3. Er zijn vier stijlen voor dezelfde keuze. Board/Cards/Money/Box is een blok met zwarte vulling. General/Look/Words/Board size zijn ronde pillen. None/Photo en Fill/Fit hebben een rode rand binnen een zwarte rand. "Standard" is weer een klein rond knopje. Voorstel: één stijl voor een segmentkeuze en één voor tabs. Screenshot: `img/designer-tom/05-editiepaneel-pills.jpg`.

4. Dezelfde actie heeft verschillende knoppen op de printpagina. "Make test sheet" is een omlijnde knop, "Make just this" is een onderstreepte link, en "How it works" ook. Uitgeschakelde knoppen hebben een stippelrand, die lijkt op een plek om een bestand neer te zetten. Dat zie ik ook bij de min-knop in Preview.

5. De vaste balk onderaan de printpagina is bij 1024 px te hoog. In een venster van 700 px hoog neemt hij ongeveer een vijfde in. De regel "1 thing to check" breekt bij 1512 px af op "to / check". In die regel staan een mono-letter en een gewone letter door elkaar. Screenshot: `img/designer-tom/13-printpagina-1024-balk.jpg`.

6. Bij 1024 px is het bord in de editor het kleinste element. Beide zijpanelen zijn breed, het middelste vak is ongeveer 300 px. In het editiepaneel is het bord 200 px. Voorstel: bij smalle vensters het rechterpaneel over het bord laten schuiven, of het linkerpaneel inklapbaar maken. Screenshot: `img/designer-tom/10-editor-1024.jpg`.

7. Twee kleurkiezers voor hetzelfde. Bij Edition, Look krijg je 12 kleuren. Bij een vak, Group colour, krijg je 20 kleuren, waarbij Yellow, Orange, Purple en Green elk twee keer voorkomen met dezelfde naam. Voorstel: één palet, en unieke namen.

8. De volgorde van de sets wisselt. Op de printpagina staat Home print set eerst, in de printgids staat Print-shop set in de linkerkolom. Ik zoek dan steeds de verkeerde kant.

9. In de lijst met kaarten zijn de miniaturen lichtblauw, terwijl de Chance-kaart in Sleek lichtgrijs is. De miniaturen volgen het thema niet. Screenshot: `img/designer-tom/07-kaarten-sleek-blauwe-miniaturen.jpg`.

10. "Note of 1", "Note of 5". Een Brit zegt "£1 note". Ook "Bank of Hackney" staat in het ovaal, maar de verticale strook zegt nog "play money".

11. Het menu van de editie is krap. "Share your board" met ondertitel en daaronder "Duplicate" staan zonder ruimte of lijn tegen elkaar. "A copy for another group or class" klinkt als een tekst voor een leraar, niet voor mij.

12. Het deelplaatje heeft de banner "Our own edition". Voor een bruiloft wil ik daar de naam van de editie zien, of geen banner.

## Ontwerp

Mooi:

- De hero op de home met het bord, de kaarten en de pionnen ziet er verzorgd uit. De kleurstrook bovenaan en onderaan is een sterk merk-element.
- Het Riso-thema is het beste thema. Bord, kaarten, geld en deksel horen echt bij elkaar.
- De uitnodiging is goed opgebouwd: kleine kop in spatiëring, een zware titel, de naam in rood, het bord schuin, de kleurstrook. Vier per A4 met snijlijnen is handig. Screenshot: `img/designer-tom/18-uitnodiging.jpg`.
- Het spelregelboekje is netjes. Hoofdstukken, prijslijst met kleurblokjes en een rustige voorkant. Screenshot: `img/designer-tom/29-pdf-bruiloft-boekje.jpg`.
- De drukkerij-PDF's hebben afloop, snijtekens, een TrimBox en een helder bestelblad. Dat zou ik zo naar een drukker sturen.
- De eigendomsbewijzen in Sleek zijn strak en goed leesbaar.

Goedkoop of niet af:

- Sleek is maar half een thema. Het bord is wit en strak, maar het speelgeld is het klassieke beige biljet met guilloche en sleutel- en huisjes-iconen. Het deksel is een witte vlakte met titel, ondertitel en vier iconen. Dat ziet eruit als een placeholder. Screenshots: `img/designer-tom/08-geld-sleek-klassiek.jpg`, `09-deksel-sleek-zonder-logo.jpg`, `26-pdf-groep-deksel.jpg`.
- Het deksel is in alle thema's leeg. Een titel, een kleine ondertitel en vier iconen in een vlak van 267 mm. Er is geen beeld van het bord, geen patroon, geen logo. Bij Riso idem. Screenshot: `img/designer-tom/17-londen-deksel-leeg.jpg`.
- Te veel lettertypes door elkaar: een zware ronde display-letter, een sans, en een mono voor maten, percentages ("Size 100%", "Zoom 100%"), hex-codes, statuslabels ("NOT MADE YET") en de regel onder de hero. De mono is op zich een leuk drukkerij-accent, maar midden in een zin ("Size of the logo 100%") oogt het als een vergissing.
- De sjabloontegels op de home en op New edition tonen allemaal hetzelfde kleine bord of dezelfde minikaart in een andere achtergrondkleur. Je ziet niet waarin Wedding verschilt van Group. De tegel Blank is dubbel breed met een groot leeg groen vlak. Bij 1024 px breekt "neighbour-hood" af en "View this template" op twee regels. Screenshots: `img/designer-tom/03-nieuwe-editie.jpg`, `04-nieuwe-editie-1024.jpg`.
- Bij 1024 px staat de hero-tekst links met rechts een lege kolom, en het grid met sjablonen is ongelijk (Blank over twee kolommen, daaronder vier). Screenshot: `img/designer-tom/02-landing-1024.jpg`.
- De kaarten op Mijn edities staan elk iets anders scheef. Dat is de keukentafelstijl, maar bij vier kaarten met knoppen erin leest het als een fout in de layout. De knoppen Open en Print staan per kaart op een andere hoogte. Screenshot: `img/designer-tom/20-mijn-edities.jpg`.
- Afbreking in koppen: "THE WEEKLY MEET-UP" breekt op het eigendomsbewijs af als "MEET- / UP". Op de voorkant van het boekje staat "Ollie & / Priya's Big / Day" met "Day" alleen op een regel. Screenshot: `img/designer-tom/11-eigendomsbewijzen-afbreking.jpg`.
- Rechte apostrof: in display-letters wordt "Priya's" niet omgezet naar een gekrulde apostrof. Op de uitnodiging en het boekje valt dat op.
- Het testvel is grotendeels leeg en zegt niet wat je ermee doet. Een regel "Hold the corner against your board" op het vel zelf zou helpen.
- Het bestelblad is in een standaard Arial-achtige letter zonder enige huisstijl. Voor de drukker prima, maar het is het enige stuk dat niet bij de rest hoort.
- Een donkere modus is er niet. Voor mij geen probleem, maar het viel op omdat de rest zo verzorgd is.

## Features die ik zou willen

1. Het logo van de editie op deksel, kaartachterkant en uitnodiging, met één klik. Voor een bedrijfseditie is dat het hele punt. Must.
2. Een echt Sleek-deksel en Sleek-geld: vlak, typografisch, zonder guilloche. Must als Sleek een thema blijft.
3. Een eigen lettertype of in elk geval een keuze uit twee of drie koppen-letters per thema. Bij een bedrijf wil ik de huisletter. Nice.
4. Een eigen kleur voor de achtergrond van het bord en de hoeken, niet alleen per straatgroep. Bij Sleek wil ik bijvoorbeeld de huiskleur navy. Nice.
5. Een SVG-logo. Nu moet ik een PNG exporteren. Nice.
6. Een deksel met het bord als beeld of een foto als vlak, met de titel erover. Must, want het deksel is het eerste wat mensen zien.
7. Een waarschuwing als een gezicht op een vouw valt bij "Photo over the whole centre", net als bij een logo. Nice.

## Wat goed werkte

- Namen plakken in het zoekveld vult 22 straten in één keer.
- Eigen woorden (flat, tower block, Tube station, Mind the Gap, the Tower) komen goed door in kaartteksten, eigendomsbewijzen en het boekje.
- De printserver is snel: alle sets binnen 10 tot 25 seconden.
- De ZIP is goed geordend: bestelblad, genummerde PDF's en een map met instructies.
- De sneltoetsen zijn goed vormgegeven en compleet.
- Preview met tabbladen per onderdeel geeft een goed overzicht voor het printen.
- Opslaan gaat vanzelf en de tijd staat in de kop.
