# Feedback ronde 5: Engelse juf met klasspel, schoolreisje en leeg bord (iPad 1024 × 768 liggend en 768 × 1024 staand, aanraken)

Persona: Emma (31), juf van Year 4 op een basisschool in Manchester. Ze maakt op de iPad een spel voor haar klas (Oak Class), een spel over het schoolreisje naar de dierentuin en een leeg bord waarop de kinderen zelf hun stad tekenen. Alles in het Engels, met ponden. Ze wil drie sets voor de klas, zodat drie tafels tegelijk kunnen spelen. Site in het Engels (`/en`).

Gemaakt:

1. **Oak Class Trading Game.** Sjabloon Groep, Klassiek, Engels, pond. 22 straten via plakken in de eerste rij (plekken in de school), stations en nutsbedrijven hernoemd (The Bus Stop, The Pencil Sharpener …), midden "Naam met foto" met een klassenfoto, ondertitel "Year 4 at St Mary's", foto van de klassenhamster op een straat, 8 kaarten herschreven, drie eigen huisregels, 4 pionnen (Owls, Foxes, Badgers, Hedgehogs). Geprint: Thuisprint-set, 3 sets, met bord, kaarten en akten, speelgeld (2 tot 4 spelers) en pionnen, zonder doosdeksel. Daarna één keer gedupliceerd als "Maple Class Trading Game".
2. **Year 4 Trip to Chester Zoo.** Leeg, Riso, Engels, pond. 22 namen geplakt, stations hernoemd (The Coach, The Zoo Train …), vier foto's tegelijk geüpload (ook een heel kleine van 160 × 120 px), daarna foto's per vak goedgezet, "Foto over het hele midden" met een dierentuinfoto, 4 kaarten herschreven. Geprint: Drukkerij-set, 1 set, bord, kaarten en akten en speelgeld.
3. **Design Your Own Town.** Leeg, Strak, Engels, pond. Alle namen leeggemaakt, beide kaartstapels leeggemaakt, zodat de kinderen zelf schrijven. Geprint: Thuisprint-set, 1 set, bord en kaarten en akten.

## Samenvatting

Op de iPad voelt de site rustig en volwassen. Alles is groot genoeg voor je vinger en ik hoefde nergens te zoomen. Het mooiste was het plakken van 22 namen in één keer: de site vult alleen de straten en slaat stations en kansvakken over. Ook het lege bord voor de kinderen werkte in twee tikken, en de PDF's zagen er netjes uit, met mijn ponden en namen overal. Het grootste probleem is dat het sjabloon Groep voor een school niet past: de helft van de kaarten gaat over koffie, laptops en "reply all". Daarna: een kaart die "ontvangen" is kan ik niet in "betalen" veranderen, en bij het lege bord krijg ik 60 losse meldingen. Printen voor drie sets ging snel (18 seconden), maar 72 vellen speelgeld is veel voor een school.

## Werkt niet (bugs)

1. **Foto die je net uploadt, geeft meteen een waarschuwing.** Waar: straat, Afbeelding, Foto (The Class Pet Hamster). Wat: ik upload een staande foto (2400 × 3200) en krijg direct "The photo doesn't cover the whole frame". Op het scherm lijkt de foto het kader wel te vullen. In IndexedDB staat `cy: 0.333`, de foto staat dus standaard een stuk naar boven geschoven. Pas na één keer + (zoom 110%) gaat de melding weg. Verwacht: een foto die ik niet aanraak, is goed geplaatst. Ernst: hinderlijk. De melding komt ook terug in "Check before you print". Stappen: straat openen, Photo, staande foto kiezen. Screenshots: `img/teacher-emma/06-hamster-waarschuwing.jpg`, `img/teacher-emma/07-hamster-na-zoom.jpg`.
2. **Drukkerij-ZIP mist soms het bestelblad.** Waar: printpagina, Print shop set. Wat: zodra de knop "Download print shop set (ZIP)" verscheen (na "3 of 3 done") heb ik de ZIP gedownload. Daarin zaten de drie PDF's en de instructies, maar geen `00-order-sheet.pdf`. Een minuut later dezelfde link nog eens: nu zat het bestelblad er wel in. Verwacht: de ZIP-knop pas actief als alles klaar is, of het bestelblad altijd erin. Ernst: hinderlijk (wie snel is, staat bij de kopieerwinkel zonder bestelblad). Stappen: Print shop set, Make print shop set, direct op de ZIP tikken.
3. **"Share your board" zegt "Help shape our own edition".** Waar: naammenu, Share your board. Wat: het plaatje heeft bovenaan een rood lint met de tekst van Samen maken, terwijl ik alleen mijn bord wil laten zien aan de ouders. Ook ontbreken de klassenfoto in het midden en de hamsterfoto: het plaatje toont het bord zonder foto's. Verwacht: het bord zoals in Preview, met een neutrale tekst (of de editienaam). Ernst: hinderlijk. Screenshot: `img/teacher-emma/20-deel-je-bord.jpg`.
4. **"Village or neighbourhood" loopt uit de keuzekaart.** Waar: New edition, 1024 px liggend. Wat: het woord "neighbourhood" is breder dan de kaart en wordt door de rand afgesneden. Ernst: klein. Screenshot: `img/teacher-emma/02-village-titel-loopt-uit.jpg`.
5. **Pionnen heten op drie plekken anders.** Editor en Preview zeggen "Pawns", de printpagina zegt "Tokens", het bestelblad zegt "Pawns (…-04-tokens.pdf)". Ernst: klein, maar ik twijfelde even of "Tokens" iets anders was dan mijn pionnen.
6. **Zoekveld belooft plakken, maar plakken daar doet niets.** Waar: lijst links, "Find a space or paste names". Wat: ik plakte mijn lijst van 22 namen in dat veld, want de tekst zegt "paste names". Er gebeurt niets nuttigs: het wordt een zoekopdracht zonder treffers en de lijst is leeg. Plakken werkt wel in de naam van de eerste straat. Verwacht: plakken van meerdere regels in het zoekveld vult de straten, of de tekst zegt waar je moet plakken ("paste names in a row"). Ernst: hinderlijk, dit was het eerste wat ik probeerde. Screenshot: `img/teacher-emma/04-zoekveld-plakken.jpg`.

## UX: wat kan beter

1. **Sjabloon Groep past niet bij een klas.** Groep zegt "For a club, society, school, company or team", dus ik koos het. Maar de kaarten gaan over volwassenen op kantoor: "You spill coffee on a laptop", "You hit 'reply all' by mistake", "The printer is broken again", "You buy coffee for everyone", en de huisregel "fetches drinks for the table". Voor 8-jarigen moest ik dat allemaal herschrijven. Voorstel: Groep echt neutraal maken (geen koffie, drank of kantoor) of de beschrijving "school" weghalen. Screenshot: `img/teacher-emma/08-kaarten-groep-sjabloon.jpg`.
2. **Betalen of ontvangen ligt vast.** Ik schreef "You spend all your money in the gift shop. Pay £50." op een kaart die toevallig een ontvangkaart was. Twee waarschuwingen, goed uitgelegd, maar de enige uitweg is het bedrag onderaan uitzetten. Dan klopt de tekst, maar de kaart verliest zijn bedragbalk. Voorstel: een schakelaar Pay / Collect bij het bedrag. Nu moet ik eerst zoeken welke kaart een betaalkaart is. Screenshot: `img/teacher-emma/09-betalen-op-ontvangkaart.jpg`.
3. **60 meldingen bij een bewust leeg bord.** Ik maakte met "Clear all names on the board" en "Clear all Chance cards" een leeg spel voor de kinderen. Op de printpagina staan daarna 60 losse meldingen ("This card has no text yet", één per kaart en per naam), en "Make home print set" staat pas ver onder dat blok. Voorstel: meldingen van dezelfde soort samenvoegen ("32 cards have no text") en ze niet tonen als ik zelf heb leeggemaakt. Screenshot: `img/teacher-emma/16-zestig-meldingen.jpg`.
4. **Een kaart zonder bedrag na herschrijven.** Chance 14 was "You bring cake for everyone. Pay…" met het bedrag als blokje in de tekst. Toen ik de tekst verving door "You bring cupcakes for your birthday.", verdween het bedrag helemaal en zei geen enkele melding iets. De kaart doet nu niets meer. Voorstel: een melding als een kaart zijn bedrag kwijtraakt.
5. **Preview zit staand in een menu.** Liggend staat Preview naast Print. Staand is de knop weg en zit hij in het naammenu, tussen Make it together en Keyboard shortcuts. Ik zocht hem rechtsboven. Voorstel: Preview staand ook als knop, desnoods als icoon. Screenshot: `img/teacher-emma/15-naammenu-staand.jpg`.
6. **Naammenu op de iPad.** "Keyboard shortcuts ?" staat erin terwijl ik geen toetsenbord heb, en bij Duplicate staat "A copy for another couple or group". "Couple" past niet bij een juf die een parallelklas maakt. Ook "Bord vergroten" zegt "The arrow keys walk along the board" op een aanraakscherm.
7. **Standaard onderdelen verschillen per sjabloon zonder uitleg.** Bij Groep stonden speelgeld, pionnen en doosdeksel aan (5 onderdelen), bij Leeg alleen bord en kaarten (2). Op de printpagina zie je dat wel, maar ik verwachtte bij beide hetzelfde. Een regel als "Money is off because you use the money from your own box" zou helpen.
8. **Thuisprint met A3 en "order".** Het doosdeksel bij de Thuisprint-set is één vel A3. Mijn printer op school kan A3, thuis niet; de balk telt "40 sheets of A4 and 1 sheet of A3" zonder te zeggen dat dat het deksel is. En de test sheet zegt bij Thuisprint "If it fits, order", terwijl ik zelf print.
9. **Lijst van foto's na meerdere tegelijk.** De mapping is duidelijk en ik kon per foto een vak kiezen. Maar de eerste foto ging op het vak dat open stond (The Gift Shop) en niet waar ik hem wilde. "Skipped: 3 spaces that already have a photo, are another kind or have no place for a photo" zegt niet welke drie. Voorstel: de overgeslagen vakken bij naam noemen. Screenshot: `img/teacher-emma/12-meerdere-fotos.jpg`.
10. **Een te kleine foto meldt zich dubbel.** De foto van 160 × 120 px staat twee keer in "Check before you print": één keer voor het vak en één keer voor de akte. Eén regel met "(also on the title deed)" is genoeg.
11. **Staand: placeholder afgekapt.** "Find a space or paste nar" in het zoekveld op 768 px. Klein.

Nog open uit ronde 4:

- Bug 25 (Hans, Sophie): het voorbeeld bij "Own lines" van het deksel zegt bij Groep "For the whole group, season 2027". Beter dan Kerst, maar "season" past niet bij een klas.
- Bug 16 (Bert): Bord vergroten past nu op de iPad, liggend en staand. Opgelost.
- Bug 38 (Carlos): de Engelse hint gebruikt nu de juiste munt ("Pay £50 for your language course"). Opgelost.

## Ontwerp

Mooi: de landing en Nieuwe editie zien er vrolijk en verzorgd uit, de sjabloonkaarten met een klein bordje zijn duidelijk. Op 768 px staand staat onderaan een vaste balk met naam en "Create edition", dat werkt fijn met de duim. De editor met drie kolommen liggend is rustig, en de printpagina met per onderdeel een plaatje, het papier en "Make just this" leest als een checklist. De Preview van het klasbord vond ik echt leuk om te laten zien (`img/teacher-emma/22-voorbeeld-klasbord.jpg`). Het lege bord in Strak is precies wat ik voor de kinderen wilde (`img/teacher-emma/17-leeg-bord.jpg`).

Minder: de keuzekaart Leeg op Nieuwe editie is twee breed, maar het plaatje neemt de helft en de tekst staat los ernaast; dat oogt leeg. Liggend op 1024 staat op de landing de grote tekst links en rechts veel lege ruimte; de mooie illustratie begint pas onder de vouw. "Check before you print" en de vaste balk onderaan nemen samen liggend ongeveer de helft van het scherm.

PDF's: bord, kaarten en geld zien er goed uit. Namen, ponden, klassenfoto, hamster en ondertitel staan er allemaal op (`img/teacher-emma/24-pdf-bord-klas.jpg`). Bij de akte met de hamsterfoto wordt de huurtabel veel kleiner dan bij de andere akten; voor kinderen is dat lastig te lezen (`img/teacher-emma/25-pdf-akten-hamster.jpg`). De lege akten met een gekleurde, lege balk zijn perfect om op te schrijven (`img/teacher-emma/26-pdf-lege-akten.jpg`). De instructie zegt duidelijk "You are making 3 sets … print everything 3 times". Het drukkerijbord in 4 panelen van 248 mm is netjes (`img/teacher-emma/27-pdf-drukkerij-panelen.jpg`).

## Features die ik zou willen

1. **Kindvriendelijk klas-sjabloon of kinderkaarten.** Kaarten over de klas, het speelplein, de juf, zonder geld voor drank of koffie. Waarom: Groep is nu voor kantoor en Feest gaat over één verjaardag. Must.
2. **Pay / Collect kunnen omdraaien per kaart.** Waarom: ik bedenk eerst de tekst en dan pas of het betalen of ontvangen is. Must.
3. **Setnummer op de achterkant bij meerdere sets.** Bijvoorbeeld "Set 1", "Set 2", "Set 3" klein op de kaartrug en het geld. Waarom: drie tafels met dezelfde kaarten lopen na één les door elkaar. Must.
4. **Minder speelgeld of geld in zwart-wit.** 3 sets is 72 vellen A4 geld met 432 biljetten. Voor school is dat veel inkt en knipwerk. Een kleinere bank voor kinderen, of biljetten zonder kleurvlak, zou helpen. Nice, maar voor scholen bijna must.
5. **Lege kaarten met schrijflijnen.** Na "Clear all cards" is de kaart helemaal leeg. Een paar lijntjes en een vakje "Pay / Collect £___" zou kinderen helpen zelf kaarten te schrijven. Nice.
6. **Klas- of groepsnamen als lijst voor de pionnen.** Plakken zoals bij straten. Nice.

## Wat goed werkte

- 22 namen plakken in de eerste rij: alleen straten gevuld, stations en kansvakken overgeslagen, met een duidelijke melding.
- Pond en Engels stonden meteen goed via `/en`.
- Bord vergroten past op de iPad, liggend en staand.
- "Not in your set" in de editor na het uitvinken van het doosdeksel op de printpagina: precies waar ik het zag.
- Printen ging snel: 3 sets in 18 seconden, de drukkerij-set ook in 18 seconden.
- Duplicate opent de kopie met de naam geselecteerd, zodat ik meteen "Maple Class" kon typen.
- De printgids heeft een alinea voor "one set for every group in a class" en voor wie geen oud bord heeft.
