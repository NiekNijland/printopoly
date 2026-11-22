# Feedback ronde 5: secretaris buurtvereniging, straatfeest (desktop 1440 × 900)

Persona: Anouk, 45, secretaris van buurtvereniging Zandweerd in Deventer. Ze maakt een editie voor het straatfeest met de straten van de wijk en foto's van de winkels. Ze probeert ook een lege editie en een sjabloon voor de vrijwilligers. Thuis heeft ze een gewone A4-printer. Voor het feest wil ze een mooi bord laten maken bij een drukker. Chrome, headless via een script, site in het Nederlands.

Gemaakt:

| Editie | Start | Thema | Taal | Munt | Wat ik aanpaste | Geprint |
| --- | --- | --- | --- | --- | --- | --- |
| Straatfeest Zandweerd 2026 | sjabloon Dorp of wijk | Klassiek | NL | euro | 22 straatnamen geplakt, 7 winkelfoto's (6 tegelijk), midden "Naam met foto" met groepsfoto plus logo als extra foto, 3 kaartteksten, doosdeksel met eigen regels en foto, uitnodiging met datum, plek en foto | Thuisprint-set: bord, kaarten, uitnodiging, spelregelboekje. Daarna de Drukkerij-set om het bord te bestellen |
| Deventer Binnenstad | Leeg | Riso | NL | euro | 22 straten en 4 stations geplakt, woorden (halte, Buurtnieuws, het cachot, Bank van Deventer), een heel kleine foto en een foto van 12 MB, een extra Kans-kaart van 75 | Thuisprint-set: bord, kaarten, speelgeld (aanbevolen, 2 tot 4 spelers), pionnen |
| Vrijwilligers Buurthuis De Wijkplaats | sjabloon Groep | Strak | NL | eigen munt WP (wijkpunten) | 22 ruimtes van het buurthuis geplakt, 6 pionnen met naam en foto, een kaarttekst | Thuisprint-set: bord, kaarten, pionnen, doosdeksel (tweede run, de eerste had per ongeluk speelgeld, zie bug 5) |

## Samenvatting

Het voelde snel en het ziet er goed uit. Namen plakken en zes winkelfoto's tegelijk plaatsen werkte in een paar seconden, en de nieuwe lijst "6 foto's geplaatst" met een keuzelijst per foto is precies wat ik nodig had. De printpagina is duidelijker dan ik verwachtte: Thuisprint staat al aan, "Nog even nakijken" staat bovenaan en een set is in een halve minuut klaar. Het mooiste vond ik de uitnodiging met de groepsfoto en het bord in panelen voor de drukker. Het grootste probleem: wat er in mijn set zit, zegt de editor anders dan de printpagina, en per sjabloon staat er iets anders aan. Daardoor printte ik bij de derde editie zonder het te merken 24 vellen speelgeld. Verder geeft elke staande foto een waarschuwing die niet klopt.

## Werkt niet (bugs)

1. **Staande foto geeft altijd "De foto bedekt het kader niet helemaal"**
   - Waar: vak van een straat, en daarna in "Nog even nakijken" op de printpagina en als driehoekje in de lijst en op het minibord.
   - Wat: ik zet een staande foto (2000 × 2600 of 2200 × 3000) op een straat. Hij staat op Vullend en vult het kader zichtbaar helemaal. Toch komt meteen de waarschuwing. Bij liggende foto's niet. Bij Bloemist Roos, Lebuinuskerk en de pion van Fatma steeds hetzelfde.
   - Verwacht: geen waarschuwing als de foto het kader vult. Nu weet ik niet wat ik moet verbeteren. Inzoomen of schuiven lost niets zichtbaars op.
   - Ernst: hinderlijk. Iedereen met telefoonfoto's (meestal staand) krijgt dit.
   - Stappen: open een straat, klik Foto, kies een staande JPEG. Zie de gele melding bovenaan het paneel.
   - Vermoeden: `checkPhoto` in `resources/js/lib/checks/checks.ts` rekent met het kader plus afloop (`placementTarget(photo.frame, photo.bleed)`), en de standaardplaatsing van een staande foto dekt die afloop net niet.
   - Screenshot: `img/buurt-anouk/07-e1-portrait-test.jpg`, `img/buurt-anouk/06-e1-print-a.jpg`

2. **Editor en printpagina zijn het niet eens over wat er in de set zit**
   - Waar: editor (tab Doos, Geld) tegenover de printpagina.
   - Wat: bij een nieuwe editie toont de editor niets vaag en nergens "niet in je set". De printpagina zegt bij dezelfde editie dat speelgeld, pionnen, deksel, uitnodiging en boekje "Niet in je set" zijn. Pas nadat ik op de printpagina iets aan- of uitvink, toont de editor "niet in je set" bij Doosdeksel en Pionnen.
   - Verwacht: zoals B198 zegt, vanaf het begin dezelfde keuze op beide plekken.
   - Ernst: hinderlijk. Ik werkte aan pionnen en deksel in de veronderstelling dat ze meegingen.
   - Oorzaak: `partsInSet` in `resources/js/lib/editor/print-selection.ts` geeft alle onderdelen terug als er nog geen `printSelection` is. De printpagina gebruikt dan `defaultPrintSelection` uit `resources/js/lib/print/selection.ts`. De editor zou dezelfde standaard moeten gebruiken.
   - Screenshot: `img/buurt-anouk/11-e1-doos.jpg` (voor de printpagina, niets vaag), `img/buurt-anouk/12-e1-doos-faded.jpg` (erna)

3. **Minibord: foto's steken buiten het bord en over de buurvakken**
   - Waar: het kleine bord linksboven in de editor.
   - Wat: foto's op de linker- en rechterkant staan als rechte blokjes over twee vakken heen en steken rechts buiten de rand van het bord. Een staande foto (Lebuinuskerk) bedekt twee vakken.
   - Verwacht: kleine vlakjes binnen hun eigen vak, zoals bij de boven- en onderrij.
   - Ernst: klein, maar het ziet rommelig uit op een plek waar je steeds naar kijkt.
   - Screenshot: `img/buurt-anouk/04-e1-mini-zoom.jpg`, `img/buurt-anouk/03-e1-multi3.jpg`

4. **Extra foto in het midden komt precies op de hoofdfoto**
   - Waar: Midden van het bord, Extra lagen, Extra foto erop.
   - Wat: ik had "Naam met foto" met de groepsfoto. Daarna voegde ik het logo toe met "Extra foto erop". Het logo kwam 108 mm groot linksonder, recht over de groepsfoto. Ik zag de groepsfoto niet eens meer en dacht eerst dat hij weg was.
   - Verwacht: een nieuwe laag op een vrije plek, of kleiner, of in elk geval niet over een andere foto.
   - Ernst: hinderlijk. De laag heet in de lijst ook alleen "Foto · gekozen", dus je ziet niet welke foto het is.
   - Screenshot: `img/buurt-anouk/05-e1-midden-logo.jpg`

5. **Sjabloon Groep zet speelgeld, pionnen en deksel stil aan**
   - Waar: printpagina van een nieuwe editie uit Groep.
   - Wat: bij Dorp of wijk stonden alleen bord en kaarten aan. Bij Groep stonden ook speelgeld (24 vellen), pionnen en doosdeksel aan. Ik vinkte pionnen en deksel aan zoals bij de vorige editie, maar daarmee zette ik ze juist uit. Resultaat: een set met 24 vellen speelgeld en zonder pionnen. Dat zag ik pas aan "Samen 39 vellen A4, waarvan 24 speelgeld".
   - Verwacht: elke nieuwe editie begint met dezelfde set (de thuisset met bord en kaarten), of de printpagina zegt erbij dat het sjabloon iets aanzette.
   - Ernst: hinderlijk. Ik had bijna 24 vellen geld voor niets geprint.
   - Oorzaak: `defaultPrintSelection` neemt de `parts` van het sjabloon over.
   - Screenshot: `img/buurt-anouk/22-e3-make-done.jpg`

6. **"Zoek een vak of plak namen" in het zoekveld, maar plakken werkt daar niet**
   - Waar: zoekveld boven de lijst links.
   - Wat: de tekst in het veld zegt dat je daar namen plakt. Ik plakte mijn lijst van 22 straten in het zoekveld en er gebeurde niets. Plakken werkt alleen in de naam van een vak. Het zoekveld heeft geen `onPaste` (`list-search.tsx`); in een zoekveld worden de regels ook nog aan elkaar geplakt.
   - Verwacht: plakken in het zoekveld vult de straten vanaf de eerste straat, of de hint staat bij de rijen ("Plak een lijst namen in de eerste straat").
   - Ernst: hinderlijk. Dit is voor mij de belangrijkste functie van de hele site.
   - Screenshot: geen apart beeld, te zien in `img/buurt-anouk/01-e1-start.jpg` en elke editor-screenshot.

7. **Plakken in de rij Start hernoemt de hoeken**
   - Waar: lijst links, eerste rij is Start.
   - Wat: de eerste rij in de lijst is Start. Plak je daar je straatnamen, dan krijgen Start, Op bezoek, Vrij parkeren en Ga naar de gevangenis straatnamen. De melding "4 namen ingevuld. 23 vakken van een andere soort zijn overgeslagen. 18 regels bleven over." is eerlijk, en Ongedaan maken herstelt het.
   - Verwacht: een lijst met meer regels dan er hoeken zijn, begint bij de eerste straat. Of de vraag "Bedoel je de straten?".
   - Ernst: klein.
   - Screenshot: `img/buurt-anouk/02-e1-paste.jpg`

8. **Spelregelboekje noemt speelgeld in de doos terwijl het niet in de set zit** (nog open uit ronde 4, Hans bug 34)
   - Waar: boekje, hoofdstuk 1 en Doel en opstellen.
   - Wat: "speelgeld voor 2 tot 4 spelers (144 biljetten)" en "Je speelt met 2 tot 4 spelers: zoveel speelgeld zit er in de doos", terwijl ik geen speelgeld print en mijn eigen oude geld gebruik.
   - Ernst: klein.
   - Screenshot: `img/buurt-anouk/14-e1-pdf-boekje-uitnodiging.jpg`

9. **Doosdeksel thuis alleen op A3** (nog open uit ronde 4, Fatima UX 3)
   - Waar: printpagina, Doosdeksel in de Thuisprint-set: "1 vel A3".
   - Wat: ik heb alleen een A4-printer. Er staat geen andere keuze of uitleg.
   - Ernst: klein.

## UX: wat kan beter

1. **Waar bestel ik een mooi bord?** Ik wilde een stevig bord laten maken voor het feest. De Drukkerij-set geeft vier vinylstickers van 248 mm voor een bord dat je al hebt. Dat staat er goed. Maar ik vind nergens wat ik moet doen als ik geen oud bord heb of een echt bord wil, behalve karton van een verhuisdoos in de printgids. Ook staat nergens welk soort drukker dit doet of wat het ongeveer kost. Voorstel: in de printgids bij het bord één alinea "Een heel bord laten maken" (bijvoorbeeld als stevig vouwkarton of forex bij een drukker), en een voorbeeld van wat je zoekt ("vinylsticker op maat, mat, herpositioneerbaar").
2. **Hoeveel uitnodigingen?** Thuis krijg ik 4 kaarten per A4, bij de drukker "1 kaart A6". Voor de straat heb ik er 80 nodig. Ik zie niet waar ik het aantal opgeef. Voorstel: bij Uitnodiging een eigen aantal, of in de rij "bestel er zoveel als je wilt, het bestand is één kaart".
3. **Foto's tegelijk op naam laten vallen.** Bij zes foto's ging kapper.jpg naar Potgieterstraat en niet naar Kapsalon Knip. Met de keuzelijsten heb ik het in een halve minuut goed gezet, prima. Maar als de bestandsnaam op een vaknaam lijkt, mag de site dat zelf al doen.
4. **"Bewaar deze link om ze terug te vinden."** Welke link? Er staat geen link bij. Ik neem aan dat het de adresbalk is. Voorstel: "Bewaar het adres van deze pagina" of een knop Kopieer link.
5. **Twee meldingen voor één foto.** De kleine foto van de Brink geeft twee regels in "Nog even nakijken": een voor het vak en een voor het eigendomsbewijs. Dat stond in ronde 4 al als voorstel (UX 2): één melding met "ook op het eigendomsbewijs".
6. **Deel je bord zonder foto's.** Het plaatje voor de groepsapp laat mijn bord zien zonder winkelfoto's, zonder groepsfoto en zonder logo. Voor de buurtapp zijn juist die foto's het leuke. Er staat ook "Bedenk mee aan onze eigen editie" op, terwijl ik niemand vraag mee te denken. Voorstel: foto's mee in het plaatje, en een kopregel die past bij delen ("Ons eigen spel van de buurt").
7. **Foto op het eigendomsbewijs.** De winkelfoto staat op het bewijs als smalle strook uit het midden. Het bord met "Bakker Jansen" op de gevel valt eraf. In de PDF worden de huurregels op kaarten met foto kleiner dan op kaarten zonder foto. Voorstel: de strook iets hoger, of standaard het bovenste deel van de foto.
8. **"Sleep om te verschuiven, knijp om te zoomen"** staat ook op de desktop. Knijpen kan ik daar niet. Op desktop: "scroll om te zoomen" of plus en min.
9. **Spelregelboekje: "Vouw de vellen in het midden en niet ze."** Ik las eerst "en niet" als ontkenning. Beter: "en zet er twee nietjes in".
10. **"1 boekje en 1 stuk"** in de balk van de Drukkerij-set. Wat is "1 stuk"? Het is de uitnodiging. Beter: "1 uitnodiging".
11. **Pionnen in de lijst tonen geen foto.** Na zes pionnen met foto zie ik links nog steeds zes lege rondjes. Een klein fotootje in het rondje zou helpen.

Wat ik zocht en wel vond: Thuisprint stond al aan (goed), het proefvel staat bovenaan, Hoeveel geld? staat bij het speelgeld, de uitleg per onderdeel is één link naar de printgids. Niets wat ik miste nu dobbelstenen en huisjes weg zijn: die haal ik uit de oude doos.

## Ontwerp

- Mooi: de landing en Nieuwe editie zien er levendig uit, de sjabloonkaarten met een bordje erop zijn duidelijk. De editor is rustig. Riso en Strak zijn echt anders van sfeer. De printpagina met gekleurde randen per onderdeel en de vaste balk onderaan voelt af.
- PDF's: het thuisbord (7 vellen, elk vak een sticker) is netjes, de groepsfoto in het midden komt scherp. De vier drukkerijpanelen zijn mooi en de foto's staan op 300 ppi. De uitnodiging is het leukste stuk: groepsfoto, kop, bord en mijn datum en plek. Het boekje met prijslijst per kleurgroep is overzichtelijk. Speelgeld met "Bank van Deventer" en de editienaam op de zijkant is leuk. Speelgeld is nu 4,5 MB voor 24 vellen, veel lichter dan in ronde 4.
- Minder: de pionnen-PDF is een vel met zes kleine pionnen bovenaan en verder leeg; de foto's zijn ongeveer 2 cm. Het bestelblad gebruikt een andere, kalere letter dan de rest en heeft bij de thuisset een tweede pagina met alleen drie regels voor de uitnodiging. Het logo met witte achtergrond staat als wit blok op het groene bord (mijn eigen PNG, maar een hint "zet het kader uit" zoals bij Naam met foto zou helpen).
- Screenshots: `img/buurt-anouk/13-e1-pdf-bord-thuis.jpg`, `15-e1-pdf-bord-drukkerij.jpg`, `14-e1-pdf-boekje-uitnodiging.jpg`, `19-e2-pdf-bord-geld-kaarten.jpg`, `21-e3-pdf-deksel-pionnen.jpg`, `16-e1-uitnodiging2.jpg`, `23-mijn.jpg`.

## Features die ik zou willen

- **Een heel bord laten drukken**, niet alleen stickers voor een oud bord. Voor een straatfeest heeft niet iedereen een oud spel. Must.
- **Aantal uitnodigingen kiezen** en een versie om in de brievenbus te doen (A5 of flyer). Must voor een straatfeest.
- **Foto's koppelen op bestandsnaam** bij meerdere foto's tegelijk. Nice.
- **Foto's in "Deel je bord"**, zodat ik de buurt in de app warm maak. Nice.
- **Een tweede, kleinere set voor de kinderhoek**: dezelfde editie maar met minder geld en vier pionnen, zonder te dupliceren. Nice.
- **Drukkerij-set met een paar namen van drukkers of soorten winkels** ("stickerdrukker online", "copyshop met snijmachine"). Nice.

## Wat goed werkte

- Namen plakken in de eerste straat: 22 namen in één keer, met een duidelijke melding.
- Foto in één klik (Foto opent meteen de bestandskiezer), en de lijst "6 foto's geplaatst" met keuzelijsten per foto (ronde 4, bug 7 van Ria en Joost, is opgelost).
- Gewone taal bij een te kleine foto: "Deze foto is te klein en wordt korrelig op papier."
- De waarschuwing bij een kaart als je het bedrag ook in de tekst zet.
- Woorden (halte, Buurtnieuws, het cachot) komen meteen overal door, ook op de stapels op het bord.
- Eigen munt WP werkt op bord, bewijzen en voorbeeld.
- Printen is snel: 33, 27 en 15 seconden, en na een kleine wijziging maakt hij alleen opnieuw wat nodig is (9 seconden).
- Bestandsnamen met de editienaam en een bestelblad in elke ZIP.
- Mijn edities toont per editie welke set klaar is en tot wanneer.
