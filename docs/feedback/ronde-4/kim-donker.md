# Feedback ronde 4: Kim, developer met migraine, donkere modus, weinig beweging, hoog contrast (desktop 1920 × 1080)

Persona: Kim, 29, developer. Heeft migraine. Zet het besturingssysteem op donkere modus en minder beweging, soms op Windows hoog contrast (forced colors). Werkt bijna alleen met het toetsenbord. Engelse interface. Test op https://printopoly.nl, release 09ce9c0, met headless Chrome (puppeteer). Mediafuncties met `prefers-color-scheme: dark`, `prefers-reduced-motion: reduce` en, voor de tweede ronde, `forced-colors: active`. Windows-user agent en `navigator.platform` op Win32, zodat sneltoetsen met Ctrl getoond worden.

Gemaakt (3 edities, allemaal Engels, allemaal een eigen script met toetsenbord als eerste route):

1. **Raid Night Estate**. Sjabloon "Group of friends", thema Riso, taal Engels, munt £. Alle 22 straatnamen in één keer geplakt in de lijst (zie UX 1), stations en nutsbedrijven met de hand hernoemd (Lag Express, Wi-Fi Station, Router Rave Co., Energy Drink Co.), 8 pionnen laten staan. Geprint: print shop set met bord, kaarten en pionnen (3 van 3 klaar in 8 seconden). Gecontroleerd: bord (4 pagina's), kaarten (122 pagina's voor 61 kaarten) en pionnenvel.
2. **Utrecht Rondje**. Sjabloon "Your village or neighbourhood", thema Classic, taal Engels, munt € (gekozen bij Nieuwe editie). 22 straatnamen geplakt (Oudegracht, Neude, Domplein), 6 stations en nutsbedrijven hernoemd. Drie foto's: een brede foto op Oudegracht, een piepklein bestand (200 × 120 px) op Neude, een staand portret op Domplein. Geprint: eerst print shop set (bord en kaarten), daarna home print set (bord 7 A4's, kaarten 16 A4's). Beide gecontroleerd.
3. **Dev Team Tycoon**. Sjabloon "Company or team", thema Sleek (kwam van het sjabloon), taal Engels, munt £. 22 straatnamen geplakt, 6 hernoemd, eigen logo (PNG) in het midden van het bord. Daarna alle onderdelen aangezet: speelgeld, doosdeksel, regelboekje, huizen en hotels, dobbelstenen en uitnodiging. Geprint: print shop set twee keer (eerst bord en kaarten, daarna alle 8 onderdelen, 8 van 8 klaar in 24 seconden). Geld, deksel, regelboekje en bord gecontroleerd.

Een kleine kanttekening voor wie de edities terugkijkt: Utrecht Rondje heeft nu op Neude de naam "X". Dat komt van mijn test met Ctrl+Z en Ctrl+Y, niet van de site. Daardoor staat de printstatus van die editie op "out of date".

## Samenvatting

Het toetsenbord werkt beter dan ik van een editor met zoveel losse delen verwacht had. J en K lopen door de lijst, F2 gaat naar de naam, Esc en Enter brengen je terug, Ctrl+Z, Ctrl+S en Ctrl+P doen wat het zegt. Het plakken van een lijst namen (22 straten in één keer) is het mooiste wat ik tegenkwam. Beweging is geen probleem: met "minder beweging" draaien er nergens animaties. Het grote gat is donkere modus. De site kent die niet. Wie de OS-voorkeur op donker heeft, krijgt een beige pagina met een donkere voettekst en een witte kop, en een editor die ook bij een donker systeem even licht blijft. In Windows hoog contrast ziet de site er over het algemeen goed uit, maar de gekozen stand van schakelaars (tabs, Bord/Kaarten/Doos, Print shop set/Home print set) en het minibord verdwijnen. Printen werkte drie keer zonder haperen en de PDF's zagen er goed uit.

## Werkt niet (bugs)

1. **Hoog contrast: de gekozen stand van schakelaars is niet te zien.**
   Waar: editor (Board / Cards / Box, Space / Title deed, None / Photo, de gekozen rij in de lijst), printpagina (Print shop set / Home print set), taalschakelaar NL / EN op elke pagina.
   Wat: met `forced-colors: active` worden achtergrondkleuren weggehaald. Wat nu alleen met een donkere vulling of een rode rand de gekozen stand laat zien, ziet er hetzelfde uit als de niet gekozen stand. Ik kan in de editor niet zien welk tabblad open staat. Op de printpagina ziet "Print shop set | Home print set" er hetzelfde uit, ook als de ene gekozen is.
   Verwacht: een stand die ook zonder kleur te zien is (bijvoorbeeld een dikke onderrand of `aria-selected` met `Highlight`/`CanvasText` in `forced-colors`).
   Ernst: hinderlijk (voor wie hoog contrast gebruikt, bij tabs bijna blokkerend).
   Stappen: Chrome DevTools, Rendering, "Emulate CSS media feature forced-colors: active", open een editor.
   Screenshots: `img/kim-donker/fc-editor.jpg`, `img/kim-donker/fc-print.jpg`.

2. **Hoog contrast: het minibord is leeg en de straatkleuren zijn weg.**
   Waar: minibord links in de editor, de kleurbalk van een straat op het voorbeeld, het bord in Voorbeeld (V).
   Wat: het minibord toont alleen een zwart vak met de naam en een kader om het gekozen vak. De kleurgroepen (bruin, lichtblauw, enzovoort) zijn niet meer te zien. In Voorbeeld ontbreken de tegelkleuren, en de zwarte stations- en nutsbedrijf-icoontjes staan donker op zwart en zijn bijna onzichtbaar.
   Verwacht: de bordkleuren zijn inhoud, geen versiering. Met `forced-color-adjust: none` op het bord (of op de kleurblokken) blijft het bord zichtbaar.
   Ernst: hinderlijk.
   Screenshots: `img/kim-donker/fc-editor.jpg`, `img/kim-donker/fc-preview.jpg`.

3. **Focus valt naar de pagina na Esc in Voorbeeld (R3-bug 16, nog niet helemaal opgelost).**
   Waar: editor, dialoog Voorbeeld.
   Wat: Voorbeeld openen met de knop en dan Esc zet de focus op `body`. Bij het menu ⋯ en bij Controle komt de focus wel terug op de opener, dus dat is goed gedaan. Voorbeeld is de uitzondering. Daarna doen losse lettersneltoetsen weer iets (die wachten volgens B179 tot je klikt of Tab drukt, dus de schade is kleiner dan in ronde 3).
   Verwacht: focus terug op de knop Preview.
   Ernst: klein.
   Stappen: Tab naar Preview, Enter, Esc, kijk naar `document.activeElement`.

4. **Enter in een lijstveld bij een actieve zoekopdracht laat de focus verdwijnen.**
   Waar: editor, lijst links, zoekveld "Search a space".
   Wat: zoek op "Oudegracht", Tab, Tab naar het naamveld in de lijst, typ en druk Enter: de focus staat daarna op `body`. Zonder zoekopdracht (naam via F2) komt de focus netjes op de rij terug. Pijl-omlaag in het zoekveld doet niets, en Enter in het zoekveld ook niet. Het resultaat bereik je alleen met Tab (eerst langs de knop "Clear the search").
   Verwacht: Enter in het zoekveld kiest het eerste resultaat, of pijl-omlaag gaat naar het eerste resultaat. Na Enter in een lijstveld blijft de focus op de rij.
   Ernst: hinderlijk (voor toetsenbordgebruikers).

5. **Meerdere sneltoetsen vuren op typen als de focus niet in een veld staat.**
   Waar: editor.
   Wat: na `j` op een vak zonder naamveld (Community Chest, Chance) doet F2 niets, en wat ik daarna typ gaat als lettersneltoetsen door de editor (R, e, p, w en meer). In mijn test is er niets kapotgegaan. Maar voor iemand die denkt in een veld te staan, is het een val. Er is geen zichtbaar teken waar de focus staat als die op de pagina valt (op `body` is er geen focusring).
   Verwacht: de lijst of de rij houdt altijd de focus, en een korte melding als F2 niets kan ("Dit vak heeft geen naam om te veranderen").
   Ernst: klein.

6. **Contrastfouten (klein).**
   Waar: startpagina, de stapnummers 1 tot 4 onder "How to make an edition" (rood `#C8321F` op mintgroen): 4,18 : 1 bij 20 px, onder de 4,5 : 1 voor niet-vette tekst van die maat. Printpagina: de uitgeschakelde knop "Download print shop set (ZIP)" en de tekst "Pawn" op de pionkaart gebruiken 50% inkt en komen op 3,23 : 1.
   Ernst: klein. Mijn contrastscript gaf meer meldingen, maar die waren illustraties met witte tekst op een kleurvlak (kaartjes op de startpagina). Die telde ik niet mee.

## UX: wat kan beter

1. **Donkere modus ontbreekt.**
   Waar: hele site.
   Wat: bij `prefers-color-scheme: dark` blijft de pagina beige (`#F6F1E4`) met een witte kop, `color-scheme` staat op `normal`, er is geen `<meta name="color-scheme">`, en de browser tekent selects, scrollbalken en formulierknoppen licht. De voettekst is wel donker, dus de pagina knalt tussen wit en zwart. Voor iemand met migraine door fel licht is dat het eerste wat opvalt, in een donkere kamer (de bordafbeeldingen zijn zelf licht en zo bedoeld, dat hoort ook zo).
   Voorstel: zet de pagina-schil (kop, formulierkolommen, dialogen, printpagina) om naar een donkere variant met dezelfde kleuren van het logo als accent. Het bord, de kaarten en de PDF's blijven licht, want dat is het ontwerp van de print. Zet daarbij `color-scheme: light dark` zodat de browser zijn eigen onderdelen mee laat gaan. Een eenvoudige schakelaar "Light / Dark / System" in de kop of onder Editie-instellingen is voldoende; zonder is het toch al een grote stap.
   Hoe belangrijk: voor mij de grootste (must voor deze persona).
   Screenshot: `img/kim-donker/home-dark.jpg`, `img/kim-donker/editor1.jpg` (beide met donker ingesteld).

2. **Eerste Tab op "Nieuwe editie" slaat de skiplink en kop over.**
   Waar: `/en/editions/new`.
   Wat: de naamveld heeft autofocus, dus de eerste Tab gaat naar de taalkeuze. Wie met het toetsenbord begint, mist de sprong-link en de kop. Verder staat de tabvolgorde goed: naam, taal, Theme, Parts, Currency, Create edition.
   Voorstel: geen autofocus, of de skiplink als eerste laten staan (de pagina is nu al kort genoeg).

3. **Het menu ⋯ opent met "Back to standard" als eerste en meteen gefocust.**
   Waar: editor, paneel rechts.
   Wat: wie met het toetsenbord het menu opent en Enter drukt, zet naam en bedragen van dat element terug. Ctrl+Z kan dat herstellen, maar de eerste keuze is de enige destructieve.
   Voorstel: zet "Swap with…" eerst of laat de focus op het menu zelf staan.

4. **De sneltoetslijst is goed, maar lang en je ziet niet welke nu kunnen.**
   Waar: dialoog Keyboard shortcuts (?).
   Wat: de lijst toont Windows- en Linux-sneltoetsen goed (Ctrl+V in plaats van ⌘V, als `navigator.platform` Win32 is). Foto-sneltoetsen (P, R, B, +, −) staan erin ook als er geen foto-element gekozen is. Voorstel: groepeer bovenaan de vijf die je het vaakst gebruikt (J, K, F2, V, Ctrl+P) en grijs de foto-toetsen uit zonder foto.

5. **Er is geen melding dat er veranderingen zijn opgeslagen, behalve de tijd in de kop.**
   Waar: kop.
   Wat: "Only in this browser · 08:00" naast de naam is klein en verandert stil. Ctrl+S geeft kort "Saved". Dat is genoeg. Alleen: de tekst staat niet in een `aria-live`-gebied (ik zag geen live-regio met de melding "22 names filled in." tijdens het plakken, hij verscheen als toast onderaan). Voorstel: zet toasts in `role="status"` voor wie een schermlezer gebruikt (ik heb geen echte schermlezer getest, dus dit is een vermoeden).

6. **Een foto met te lage resolutie krijgt een goede waarschuwing, maar blokkeert niets.**
   Waar: editor en Controle.
   Wat: "Resolution 102 dpi, too low" bij de tiny.jpg en "Check: 2" in geel. Goed. Het bestand komt wel in de PDF (pixelig). Dat is een keuze van de maker, maar een dikke gele balk boven de Print-knop mag ook.

## Ontwerp

Wat mooi is: het bord en de kaarten in alle drie de thema's, de themakeuze als kleine voorbeeldborden, de PDF's. De Riso-set (roze met paars, blauw en geel) is de levendigste, Classic is rustig en leesbaar, Sleek is strak. De bordstroken in de PDF zijn scherp, de kaartranden en het bleed kloppen.

Wat opviel, niet fout maar wel jammer:
- Het speelgeld is in alle thema's beige met sepia, ook bij Sleek (zwart-wit). Dat valt uit de toon bij een zwart-wit bord. `img/kim-donker/ed3-sheet.jpg` (links het geld).
- Op het home-print-bord staat de bordnaam over meerdere A4's verdeeld (Utrecht | Rondje). Dat hoort bij een bord in stukken. De uitleg ernaast is er ook.
- Het logo (PNG, 2 : 1) staat diagonaal op het bord en bedekt de vouwstrepen. Mooi, maar in het vak "Fit, whole photo" staat de zoomregelaar halverwege terwijl er "100%" staat. Een klein verschil. `img/kim-donker/dev-logo2.jpg`.
- De Preview-weergave in hoog contrast is ruim leesbaar, behalve de iconen. Zie bug 2.
- Pionnen heten "Pawn 1" tot "Pawn 8" met een omgekeerde kopie eronder. Duidelijk voor de vouw. Ik heb geen foto op een pion gezet.

PDF's bekeken:
- Raid Night Estate: `img/kim-donker/ed1-sheet.jpg` (bord in vier panelen, de eerste twee deeds met voorkant en achterkant).
- Utrecht Rondje (home print): `img/kim-donker/ed2-sheet.jpg`. Foto op Oudegracht en Domplein goed, de tiny-foto op Neude pixelig maar leesbaar. Het uitlijnblad ("Alignment test, front") is er ook.
- Dev Team Tycoon: geld (22 pagina's), doosdeksel (lege witte plaat met titel en vier icoontjes), regelboekje (16 pagina's, "28 title deeds", "£1,500 to start"). Dit klopt met mijn edities.

## Features die ik zou willen

1. **Donkere modus voor de pagina's rond het bord.** Zie UX 1. Persona: migraine, donkere kamer, OS staat al op donker. Must.
2. **Hoog contrast: kleurloze markeringen voor gekozen stand en bordkleuren.** Zie bug 1 en 2. Persona: Windows hoog contrast. Must voor wie dat gebruikt, voor de rest nice.
3. **Enter in het zoekveld "Search a space" kiest het eerste resultaat.** Toetsenbordsnelheid bij een bord van 40 vakken. Nice.
4. **Een "Paste names" knop of regel zichtbaar bij de lijst**, naast de manier waarop plakken nu stil werkt (je plakt in een naamveld en de volgende straten vullen zich, stations en nutsbedrijven worden overgeslagen). Ik ontdekte dit door het te proberen, na het zien van de toast "22 names filled in.". Op een scherm zonder uitleg weet niemand dat. Het verdient een zin onder het zoekveld of in de sneltoetsen: "Plak een lijst met namen in een naamveld om meerdere straten tegelijk te vullen." Must om het te vinden, want het is het beste van de editor.
5. **Pionnen en geld in de kleuren van het thema (Sleek zwart-wit).** Nice.
6. **Een korte sneltoets voor "volgende waarschuwing in Controle".** Nice.
7. **Echte themaschakelaar (Light / Dark / System) die ook de browserbalk (`theme-color`) volgt.** Nu is `theme-color` vast beige (`#F6F1E4`). Nice.

## Wat goed werkte

- Toetsenbord: J, K, F2, Enter, Esc, V, C, 1 tot 3, Ctrl+Z, Ctrl+Y, Ctrl+S en Ctrl+P werken. Het menu ⋯ bereik je met Tab, Enter opent, pijltjes bewegen, Esc geeft de focus terug.
- Een lijst namen plakken in de lijst vult straten in volgorde en slaat Chance, Community Chest, belasting en stations over.
- Foto kiezen met de toets P opent meteen de bestandskiezer, en een foto op een straat komt ook op het eigendomsbewijs.
- Controle zegt "Resolution 102 dpi, too low" bij het kleine bestand en "Resolution 1693 dpi, sharp enough" bij de grote.
- Minder beweging wordt gerespecteerd: er draaiden bij mij geen animaties op de startpagina, de editor, de printpagina en Mijn edities (gemeten met `document.getAnimations()`). Ik heb dit niet vergeleken met uitgeschakelde "minder beweging", dus ik weet niet of er überhaupt animaties bestaan.
- Printen ging snel: 8, 16 en 24 seconden voor drie sets. De status "READY", de PDF- en Instructions-links en de ZIP waren duidelijk, en "READY" heeft een vinkje naast de kleur (goed voor hoog contrast).
- De focusring is overal een dikke donkere lijn van 3 px met voldoende contrast op de beige achtergrond. In hoog contrast verandert hij mee.
- Mijn edities toont de printstatus per set ("ready until 29 Nov" of "out of date, make it again"), en dat klopte met mijn wijzigingen.
- De Engelse interface is consistent en leest vlot, ook de foutmeldingen en hulpteksten.

## Niet getest

- Geen echte schermlezer, geen echte Windows hoog-contrastthema's (alleen de browseremulatie van `forced-colors: active`; de systeemkleuren in echt Windows kunnen er anders uitzien).
- Geen Samen maken links, geen foto-op-pion, geen Nederlandse site, geen mobiele indeling (dat is niet mijn persona).
- Het gedrag van `Ctrl+A` in sommige velden kon ik in headless Chrome op macOS niet goed nabootsen (dat gaat om Cmd+A), dus daar heb ik geen oordeel over.
