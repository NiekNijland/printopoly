# Feedback ronde 4: weddingplanner die bruidsparen een editie cadeau geeft (iPhone 430 × 932, MacBook 1512 × 982)

Persona: Sophie, 31, weddingplanner. Ze bouwt één basiseditie, dupliceert die voor drie bruidsparen en maakt ze persoonlijk (foto van het stel in het midden, het lint aangepast, tekst op het doosdeksel, kop op de uitnodiging). Ze wil weten of het resultaat mooi genoeg is om weg te geven. Nederlands, Drukkerij-set.

Gemaakt (alles via productie, https://printopoly.nl, release 09ce9c0, Nederlands, munt euro):

| Nr | Naam | Sjabloon | Thema | Wat ik aanpaste | Geprint (Drukkerij-set) |
| --- | --- | --- | --- | --- | --- |
| 1 | Basis Bruiloft Sophie | Bruiloft | Strak | Ondertitel "Ons liefdesverhaal", accent oker (#B8892B), alle 8 straatgroepen in een gedempt palet, deksel met eigen ondertitel en regel | niet geprint, dit is het uitgangspunt |
| 2 | Eva & Tim 14 mei 2027 | kopie van 1 | Strak | Naam, ondertitel "Het huwelijksspel", foto over het hele midden, lint lager en kleiner, deksel met foto (in kader), eigen regels, Uitnodiging en Spelregelboekje aangezet, kop "Eva & Tim gaan trouwen!" | alles: bord, kaarten, speelgeld (volledige bank), deksel, boekje, uitnodiging |
| 3 | Noor & Daan 3 juli 2027 | kopie van 1 | Strak | Naam, foto over het hele midden, lint aangepast, deksel met foto ("Hele vak"), Samen maken geprobeerd (zie bugs) | bord, kaarten, deksel (zonder speelgeld) |
| 4 | Lotte & Sam 21 augustus 2027 | kopie van 1 | Riso | Naam, thema naar Riso, monogram-logo in het midden, deksel met foto | bord, kaarten, deksel (zonder speelgeld) |

Telefoon (430 breed) voor bijna alles, de MacBook voor editie 3, de printpagina en Mijn edities. Elke editie is één keer geprint, de volle set met geld maar één keer (editie 2).

## Samenvatting

Het voelt als een goed bouwpakket voor iemand die geen ontwerper is. Dupliceren, de kleurpaletten per straatgroep en de grote voorbeelden maken dit snel: drie koppels in een uur is haalbaar. Het mooiste is de Strak-editie met gedempte straatkleuren en goud, en het speelgeld met de naam van het stel op elk biljet. Het grootste probleem voor een cadeauproduct is het midden van het bord. Foto, lint en logo staan precies op het kruis van de vier panelen, dus gezichten en tekst worden doorgesneden en je ziet dat pas in de PDF. Samen maken kon ik niet testen: de link maken gaf steeds een 429 (gedeeld IP) met de melding "Dat lukte niet". Of het cadeau-waardig is: bijna. Op het scherm ja, in print nog niet zonder naden door het gezicht en een deksel met erg kleine tekst.

## Werkt niet (bugs)

1. **Printpagina na het maken: onderbalk breder dan de telefoon** (hinderlijk).
   Waar: `/nl/print/<token>?set=printer` op 430 × 932, nadat de set klaar is.
   Wat gebeurde: de knop "Drukkerij-set downloaden (ZIP)" is langer dan "Drukkerij-set maken" en loopt over de rechterrand. De pagina krijgt een layout van 443 px breed (`scrollWidth` 443 bij 430 scherm), alles is net iets uitgezoomd en de tweede rij van de balk (aantal sets en de knop) wordt aan de rechterkant afgesneden.
   Verwacht: de knop past, eventueel met kortere tekst ("Alles downloaden (ZIP)") of onder elkaar.
   Stappen: editie printen op een iPhone-breedte, wachten tot "Klaar", onderkant bekijken.
   Screenshot: `img/weddingplanner-sophie/27-printpagina-resultaat-telefoon-overflow.jpg` en `17-printpagina-klaar-telefoon.jpg`.

2. **Samen maken: "Maak een link" geeft "Dat lukte niet. Probeer het nog eens."** (hinderlijk, maar waarschijnlijk veroorzaakt door het gedeelde IP).
   Waar: editor, Editie, Samen maken, op de MacBook, twee keer na elkaar met een minuut ertussen.
   Wat gebeurde: de server geeft 429 (zichtbaar in de console), de pagina zegt alleen dat het niet lukte en dat je het opnieuw moet proberen. De melding noemt geen reden en geen wachttijd.
   Verwacht: "Je hebt vandaag te veel links gemaakt, probeer het morgen weer" (of de tekst die de printpagina bij 429 gebruikt).
   Gevolg voor mij: ik kon niets met gasten testen, dus geen vriendenpagina, geen voorstellen, geen fotobijdrage. Dat is dus onbeoordeeld.
   Screenshot: `img/weddingplanner-sophie/14-samen-maken-desktop.jpg` (het bord staat in beeld, de knop en de rode melding staan onder de vouw, de melding zie je in de paginatekst).

3. **Controle meldt niets als naam, foto of logo op de vouwlijnen staat** (hinderlijk, past bij "bord is het cadeau").
   Waar: Midden van het bord, de PDF van het bord.
   Wat gebeurde: "Controle: 0", terwijl het lint in editie 2 en 3 over het kruis loopt ("Eva & Ti | m 14 m | ei 2027" staat over vier panelen) en het logo van editie 4 precies op het kruis staat. De editor tekent de vouwlijnen rood gestreept en zegt "Zet daar niets neer", maar dat wordt niet gecontroleerd.
   Verwacht: een Controle-melding "De naam of het logo staat over een vouwlijn", met een knop om te verschuiven.
   Screenshot: `19-pdf-bord-eva-tim.jpg`, `20-pdf-bord-noor-daan.jpg`, `21-pdf-bord-logo-lotte-sam.jpg`.

4. **Lint in de kleine bordweergave breekt op twee regels, in het grote voorbeeld en de PDF op één** (klein).
   Waar: editor, tab Bord (klein bord) bij "Noor & Daan 3 juli 2027".
   Wat gebeurde: klein bord: "Noor & Daan / 3 juli 2027" op twee regels, groot voorbeeld en PDF op één regel.
   Verwacht: dezelfde regelbreking.
   Screenshot: `18-desktop-editor-straat.jpg` (links het kleine bord).

5. **Naam van een kopie groeit: "Basis Bruiloft Sophie (kopie) (kopie) (kopie)"** (klein).
   Waar: Mijn edities, Dupliceren als nieuwe editie, een kopie van een kopie.
   Verwacht: "(kopie 2)" of de bestaande "(kopie)" niet herhalen.
   Screenshot: `06-na-dupliceren.jpg`.

6. **Placeholder van het deksel noemt kerst in een bruiloftseditie** (klein).
   Waar: Doos, Doosdeksel, veld "Eigen regels": grijze tekst "Kerst 2026, voor de hele familie". Bij het Bruiloft-sjabloon hoort een bruiloftsvoorbeeld ("Voor Eva en Tim, 14 mei 2027").

## UX: wat kan beter

1. **Twee losse fotovakken in het midden zijn verwarrend.**
   Waar: Midden van het bord, Afbeelding. De keuzes zijn "Naam / Naam met foto / Logo" en daaronder "Bordgroen / Foto over het hele midden". Als je "Foto over het hele midden" kiest, verandert het voorbeeld niet, want je moet nog een keer "Foto kiezen" doen: de foto die je net voor "Naam met foto" koos wordt niet hergebruikt. Daarna staat de kleine foto nog bovenop de grote tot je terugschakelt naar "Naam". Ik heb dit vier keer opnieuw moeten doen voor ik begreep hoe het zit.
   Voorstel: één fotoveld. Daaronder een keuze "Klein boven de naam" of "Over het hele midden". Gebruik dezelfde foto.
   Screenshot: `07-midden-foto-telefoon.jpg` (grote foto met de kleine nog erbovenop).

2. **Controle zegt wat er mis is, maar niet waar je het oplost.**
   Waar: Controle: 1 bij editie 4. De accentkleur (goud van de Strak-basis) leest slecht op de roze Riso-kleur, mooi gevonden. Het venster heeft alleen "Sluiten", geen "Ga naar Uiterlijk".
   Voorstel: een knop "Aanpassen" die de juiste sectie opent, of de accentkleur automatisch donkerder maken bij een themawissel.
   Screenshot: `04-controle-accent.jpg`.

3. **Een themawissel neemt de oude kleuren half mee.**
   Waar: Uiterlijk, Strak naar Riso in editie 4. De gedempte straatkleuren en het goud van de basis blijven staan, de hoekvakken en Kans worden felroze en lichtblauw. Het geheel is niet meer consistent. "Alles in deze sectie terug naar standaard" is er wel, maar ik wist niet dat ik dat nodig had.
   Voorstel: bij een themawissel vragen "Kleuren van het thema gebruiken?" (ja/nee).

4. **Hoekvakken en kaartkleuren zijn niet aan te passen.**
   Waar: Uiterlijk, Kleur per straatgroep. Er zijn 8 groepen, maar Algemeen Fonds (roze) en Kans (blauw) en de hoekvakken blijven fel. Bij een gedempt Strak-palet vallen ze op.
   Voorstel: twee extra kleurkiezers voor Kans en Algemeen Fonds.
   Screenshot: `02-straatkleuren-telefoon.jpg`.

5. **Dupliceren kan alleen vanuit Mijn edities.**
   Waar: de editor heeft geen "Dupliceren" bij de titel (ik vond het daar niet). Op Mijn edities staat de knop goed zichtbaar op de kaart. Na het dupliceren blijf je op de lijst, met de melding "… (kopie) is gemaakt". De kopie heeft dan nog dezelfde miniatuur als het origineel, dus je moet op de naam letten om de juiste te openen.
   Voorstel: na Dupliceren de nieuwe editie openen, of de nieuwe kaart even markeren.
   Screenshot: `05-mijn-edities-kaart.jpg`, `06-na-dupliceren.jpg`.

6. **De editienaam is ook de zin in het spelregelboekje.**
   Waar: boekje: "Welkom bij Eva & Tim 14 mei 2027" en voorblad "Eva & Tim 14 mei 2027". Als ik de datum in de naam zet (zodat hij op lint, deksel en geld staat) leest het boekje stroef.
   Voorstel: aparte velden "Naam" (Eva & Tim) en "Datum of ondertitel", en de datum alleen waar hij past.
   Screenshot: `24-pdf-boekje-en-kaarten.jpg`.

7. **De Uitnodiging is een speluitnodiging, geen trouwkaart.**
   Waar: Onderdelen, Uitnodiging: "een kaart om vrienden uit te nodigen". Standaardtekst "Je bent uitgenodigd / Spelavond". Ik heb dit gebruikt als "speel mee"-kaartje met kop "Eva & Tim gaan trouwen!". Dat werkt, maar de gouden regel eronder is altijd de editienaam en niet aan te passen.
   Voorstel: de regel onder de kop bewerkbaar maken. En bij het Bruiloft-sjabloon de standaardtekst zelf al passend maken.
   Screenshot: `10-uitnodiging-telefoon.jpg`.

8. **Geld: "Per set" in de editor, "Volledige bank" op de printpagina.**
   Waar: editor Onderdelen, Speelgeld toont "Per set"; op de printpagina staat "Volledige bank" actief (306 biljetten, zoals in de PDF). Beide keuzes bestaan, maar de woorden komen niet overeen.
   Voorstel: dezelfde woorden op beide plekken en de gekozen optie noemen.

9. **Het kleine bord op telefoon toont geen straatnamen.**
   Waar: editor, tab Bord. Alleen kleurvlakken. Voor het kiezen van een straat is dat prima ("Zoek een vak"), maar ik wil snel zien of de naam bij de goede kleur staat. "Bord vergroten" helpt, en op de MacBook is het grote voorbeeld uitstekend.

## Ontwerp

**Wat er mooi uitziet**
- Strak met goud en gedempte straatkleuren is rustig en past bij een bruiloft. Op de Mijn edities-pagina op de MacBook staan de kaarten er als drie echte producten naast elkaar (`26-mijn-edities-desktop.jpg`).
- Het grote voorbeeld van het bord op de MacBook laat alle straatnamen, bedragen en iconen zien. Dat voelt als een drukwerkproef.
- Het speelgeld heeft het stel op elk biljet ("Eva & Tim 14 mei 2027"), donker op crème (`25-pdf-speelgeld.jpg`). Dat is het mooiste cadeaumoment van de set.
- Het deksel met foto en gouden titel (`22-pdf-deksel-eva-tim.jpg`) en de uitnodiging met bord in het midden (`23-pdf-uitnodiging.jpg`) zien er netjes uit. De kleine bordafbeelding op de uitnodiging toont nu ook de foto en de eigen kleuren (ronde 3, bug 5 is opgelost).
- Spelregelboekje: voorblad met de naam groot en de vier iconen is verzorgd. Eigendomsbewijzen in de gekozen kleuren zien er strak uit.

**Wat goedkoop of niet af is**
- **Het midden van het bord in print.** Het bord is vier panelen en de foto, het lint en het logo staan midden op het kruis. Bij Eva & Tim staan de gezichten op de naad. Het lint is in stukken geknipt ("Eva & Ti", "m 14 m", "ei 2027"). Bij Lotte & Sam staat het logo dwars over alle vier de hoeken en wordt het door de naden in vieren gedeeld. Op een bruiloftscadeau valt dit meteen op. Ik zou het midden vrijhouden van de naden of de foto en het logo verschuiven bij het maken.
- **Het lint over de foto.** Het lint ligt schuin over de gezichten. Met "Hoogte onderaan" en "Grootte 50%" schuift het wel weg, maar dan komt het op de plek van de Kans-stapel. Een optie zonder lint (alleen foto) ontbreekt, of een naam onder de foto in een nette balk.
- **Deksel:** de titel vult de hele breedte en raakt bijna het kader; de ondertitel en de eigen regels zijn heel klein (in het deksel van 267 mm nauwelijks leesbaar op een bordspeldoos). Er is veel lege ruimte. Een foto met "In kader" laat rechts en links een witte rand over (`09-deksel-met-foto-telefoon.jpg`), met "Hele vak" is het mooier (`13-deksel-desktop.jpg`).
- Logo in het midden is klein, ligt in een beige ruit (45 graden gedraaid) en ik zag geen grootteschuif voor het logo (`15-logo-in-midden-telefoon.jpg`).
- Riso is te speels voor dit cadeau; de basis met de goudaccenten werkt alleen in Strak (`16-deksel-riso-telefoon.jpg`).
- De testfoto's hebben tekst in de afbeelding; dat is mijn testmateriaal, geen fout van de site. Resolutie-melding "169 dpi, scherp genoeg" bij een 3000 px brede foto over het hele midden was prima.

## Features die ik zou willen

1. **Midden van het bord veilig voor de naden** (must). Foto, lint of logo automatisch buiten de vouwlijnen houden, of een duidelijke Controle-melding. Dit bepaalt of ik de set durf te verkopen.
2. **Eén fotokeuze voor het midden, zonder lint** (must). Foto over het hele midden, met optioneel een naamplaatje op een vaste plek. Dezelfde foto op bord, deksel en uitnodiging in één keer.
3. **Meerdere koppels in één keer maken** (nice). Dupliceren is al snel, maar ik wil bij Dupliceren meteen naam, datum en foto invullen. Of een lijst: naam, datum, foto, deksel.
4. **Eigen kleur voor Kans, Algemeen Fonds en hoekvakken** (must voor een eigen kleurenpalet).
5. **Aparte velden voor naam en datum** (nice). Het boekje, het deksel en het lint gebruiken nu allemaal dezelfde tekst.
6. **Foto van het stel op de eigendomsbewijzen of de Kans-kaarten** (nice). Dat maakt de set persoonlijk zonder dat ik 28 kaarten hoef te bewerken. Een foto per straat bestaat wel voor het bord (Afbeelding op een vak), ik heb dit niet geprobeerd.
7. **Dezelfde bewerking op alle edities** (nice). Een thema of accent van de basis doorvoeren naar de kopieën, voor als ik iets aan de basis aanpas.
8. **Proefvel met een foto in print** (nice). Een A4 waarop ik alleen het midden met de naden zie, voor ik het bord bestel.

## Wat goed werkte

- Sjabloon Bruiloft: straatnamen ("De trouwauto", "Het jawoord"), Kans-kaarten en regels zijn meteen bruikbaar en grappig.
- Alle 8 straatkleuren kiezen met een hexcode ging snel, en het effect staat direct op het bord en de eigendomsbewijzen.
- Dupliceren op Mijn edities: een klik, het hele werk (kleuren, thema, accent, deksel) blijft behouden.
- Foto-upload (3000 px JPEG) ging in een tel en de resolutiemelding is duidelijk.
- Controle zag zelf dat het goud slecht leesbaar is op roze.
- Printen: zonder speelgeld was het bord, de kaarten en het deksel binnen een minuut klaar; de volle set met 306 biljetten duurde ongeveer drie minuten. PDF's zijn juiste afmetingen (bord 4 × 248 mm, kaarten 122 pagina's, deksel 267 mm) met snijtekens. Mijn edities toont daarna "Drukkerij-set klaar tot 29 nov" per kaart.
- Console bleef schoon op de eigen pagina's (alleen de bekende ERR_CONNECTION_REFUSED voor Bugsnag).

## Niet getest

- Samen maken met gasten (de link maken gaf 429, zie bug 2). Ik maakte dus geen vriendenpagina en speelde geen gast.
- Een echt drukwerkresultaat, de Thuisprint-set, HEIC en kleine foto's.
- Enter in het huisregelsveld (ronde 3, bug 10).
