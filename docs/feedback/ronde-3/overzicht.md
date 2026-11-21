# Testronde 3: overzicht

Stand: 21 november 2026, release d8a5165 (dat is ook main). Twaalf testers, elk met een eigen persona en drie edities. Bronnen: de twaalf verslagen in deze map, het productielog van 21 november en de code op main. Bij elk punt dat naar een bestaande functie wijst, staat erbij dat de functie er al is.

Alle testers stuurden de site met een script (headless Chrome of puppeteer). Punten die duidelijk door het script kwamen, staan niet in dit overzicht. Punten die alleen met een script gezien zijn en nog met de hand bevestigd moeten worden, hebben de aantekening "met de hand nakijken".

## 1. Wat er getest is

| Tester | Persona | Apparaat | Taal (site / edities) | Edities | Sets gemaakt |
| --- | --- | --- | --- | --- | --- |
| Henk (`club-henk`) | bestuurslid korfbalclub, 61, verkoopt sets | desktop 1366 × 768 | NL / NL | KV De Korfbal Kampioenen (eigen bordmaat, alle onderdelen, 8 pionnen), KV Jeugdtoernooi (eigen munt, eigen woorden), Sponsoren Editie | 3: Drukkerij met geld, Thuisprint, Drukkerij |
| Sanne (`juf-sanne`) | juf groep 6, 34, klassenspel | laptop 1280 × 800 | NL / NL | Groep 6 de Regenboog (alles hernoemd, 32 + 32 kaarten), Groep 3 Leesdorp, Personeelsuitje 2026 | 3: Thuisprint, Drukkerij, Drukkerij |
| Raj (`office-raj`) | office manager, 38, teamspel en klantevent | desktop 1920 × 1080 | EN / EN | NOVA Team Building (eigen munt Cr, huiskleuren, logo), Client Summit 2027, Dave's Farewell | 3: Drukkerij, Thuisprint, Drukkerij |
| Ria (`oma-ria`) | oma, 71, kerstcadeaus | desktop 1440 × 900 | NL / NL | Ons dorp Lutten, Familiespel van Oma Ria (5 pionnen met foto), Opa Henks mooiste plekken | 3: Thuisprint (eerste twee keer gemaakt) |
| Noor (`ontwerper-noor`) | grafisch ontwerper, 36, kijkt elke pixel na | desktop 2560 × 1440, schaal 2 | NL / NL, EN, NL | drie edities met lange namen, ß, Œ, emoji, Pools en Deens | 6: per editie Drukkerij en Thuisprint |
| Pim (`organisator-pim`) | organiseert reünie en 50e verjaardag | desktop 1440, vier vrienden op telefoon 390 | NL / NL, NL, EN | VV Oostrum Reünie 1996 (16 voorstellen van vrienden), Pim wordt 50, Oostrum Village | 3: Drukkerij, Drukkerij, Thuisprint |
| Lisa en Tom (`stel-lisa-tom`) | designers, bruiloftscadeau | iPad 768 × 1024 en 1024 × 768 | NL / NL, EN, NL | Anna & Bas: ons verhaal (foto in het midden), Honeymoon Tour, Tien jaar Lisa & Tom | 3: Drukkerij (deels per onderdeel) |
| Daan (`student-daan`) | student, 21, snel en zuinig | telefoon 320 × 640 en 375 × 667 | NL / NL, NL, EN | Huize De Kachel, Vrijgezellen Joost, Flat 7 | 3: Thuisprint |
| Maya (`teen-maya`) | tiener, 16, memes en delen | iPhone 390 | EN / EN | Squad Wars 2026 (4 bijdragen van vrienden), Rizz Estate, Lina's 17th | 1: Thuisprint, alleen kaarten |
| Eva (`toetsenbord-eva`) | slechtziend, RSI, alleen toetsenbord | desktop 1440 × 900 op 150% en 125% zoom | NL / NL, NL, EN | Boekenclub De Lezers, Familie Van den Berg, Grandma Toos' 80th | 3: Thuisprint, Thuisprint, Drukkerij |
| Emma (`traveller-emma`) | Britse reiziger, 27, vakantiefoto's | telefoon 390 × 844 en liggend 844 × 390 | EN / EN | Lisbon 2026, Scotland Road Trip (HEIC, 21 MB), Amsterdam City Trip | 2: Drukkerij, Thuisprint |
| Joost (`vader-joost`) | vader, 42, alles op de bank | Android 360 × 780 | NL / NL | Heusden aan de Maas (10 foto's tegelijk), VV Heusden, Familie Joost | 3: Thuisprint |

Totaal: 12 testers, 36 edities, 36 gemaakte sets (16 Drukkerij-sets, 20 Thuisprint-sets). Zes testers op desktop of laptop, één op tablet, vier op telefoon, en Pim op desktop met vier telefoons. Drie testers gebruikten de Engelse site, acht maakten minstens één Engelse editie. Alle drie de thema's zijn gebruikt, en de meeste sjablonen. Niet getest: een echte schermlezer, een echte inkjet of drukkerij.

Printtijd: 15 tot 80 seconden per set. Uitschieter: Maya wachtte ruim 4 minuten op 16 kaartpagina's, op een moment dat de andere testers ook printten.

## 2. Bugs

Gesorteerd op ernst en daarbinnen op het aantal testers. Script-artefacten die zijn weggelaten: de schakelaar die niet op `.click()` reageert (Sanne), de mislukte pionnenrun van Rizz Estate (Maya), "HenkHenk" in het voornaamveld (Pim), de Bugsnag-melding in de console (Daan, Ria, Lisa) en de dubbele stationprijzen op Lisa's eigen samengeplakte schermafbeelding.

| Nr | Bug | Waar | Ernst | Testers | Oorzaak | Voorstel fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | "Maak het plaatje" voor de groepsapp geeft altijd een fout (500) | Editie, Samen maken | blokkerend | Pim, Maya (Daan zocht het) | Productielog: `StoreShareImageController` start Chrome in het PHP-FPM-verzoek, en FPM heeft `proc_open` uit | Het plaatje maken in een job op Horizon, zoals de printjobs, en de browser laten wachten op de status. Rode melding laten verdwijnen bij een nieuwe actie |
| 2 | Liggende telefoon: de editor is onbruikbaar, van het formulier blijft 15 px over; op de printpagina eet de onderbalk half het scherm | editor en printpagina, 844 × 390 | blokkerend (liggend) | Emma | Kop, vast voorbeeld en onderbalk hebben vaste hoogtes; er is geen indeling voor een laag scherm | Bij een lage hoogte het voorbeeld naast het formulier of inklapbaar, en de vaste balken op één regel |
| 3 | Wijziging vlak voor sluiten gaat verloren (een naam, munt, onderdelen) | editor | hinderlijk | Raj, Ria, Maya, Eva, Emma | De sessie bewaart na een korte vertraging (`debounceMs`) en roept `flush()` niet aan bij `pagehide` of `visibilitychange` | Bij `pagehide` en bij `visibilitychange` naar verborgen direct opslaan |
| 4 | Melding "Te veel aanvragen" staat onderaan de pagina onder de vaste balk, de teller blijft op "0 van n" | printpagina | hinderlijk | Henk, Raj, Noor, Pim, Lisa | Fout staat los van de balk; zie §2.1 voor de limiet zelf | Melding in de vaste balk bij de knop, met een teller die na een minuut zelf opnieuw probeert. Limiet aanpassen zoals in §2.1 |
| 5 | Bord buiten de editor mist instellingen: Voorbeeld toont standaardkleuren, geen accent, € in plaats van eigen munt, oude decknamen en ondertitel; printminiatuur en uitnodiging tonen het midden zonder foto | Voorbeeld (V), printpagina, uitnodiging | hinderlijk | Raj, Emma, Lisa | `preview-dialog.tsx` geeft `Board` alleen thema, taal, `currency.id`, naam, vakken en lagen mee. Elke plek bouwt de props zelf | Eén functie die de bordprops uit `resolved` maakt, gebruikt door editor, Voorbeeld, printminiatuur en uitnodiging |
| 6 | Teller "8 van 9 klaar" haalt het totaal nooit als je een onderdeel overslaat | printpagina, resultaatpagina | hinderlijk | Henk, Pim, Noor | De keuze "overslaan" leeft op de startpagina; de resultaatpagina telt alle onderdelen | De gekozen onderdelen meesturen met de run en alleen die tellen; overgeslagen blijft overgeslagen |
| 7 | Eigen munt staat in het spelregelboekje als euro ("€ 1.500", kop "PRIJS €") | spelregelboekje | hinderlijk | Henk, Raj | `rulesContext` geeft alleen `currency.id` door en `formatMoney` krijgt het eigen teken niet; de prijslijst haalt het teken uit de standaardmunten | Het teken uit `resolved.currency` doorgeven aan het boekje en de prijslijst |
| 8 | Kaartbedrag onderaan spreekt de eigen tekst tegen ("Betaal 15" boven "Betaal € 18") | kaarten, ook na een voorstel van een vriend | hinderlijk | Pim, Maya | Volgens B140 staat het bedrag los onderaan; een eigen tekst met een getal botst daarmee, en een vriend kan alleen tekst sturen | Controle-melding als de tekst een getal noemt dat niet het bedrag is, met "Bedrag aanpassen"; vriendenformulier krijgt een bedragveld (zie UX 6) |
| 9 | Printen vanuit Mijn edities of na herladen toont alles weer "nog niet gemaakt", terwijl Mijn edities "klaar tot 28 nov" zegt | `/editions/<id>/print` zonder account | hinderlijk | Ria, Sanne (onzeker) | Zonder account opent die route altijd de uploadpagina. De bewaarde tokens (`listPrintJobs`) gebruikt alleen de status op Mijn edities | Als deze browser een job voor deze revisie heeft, naar `/print/<token>` gaan; anders de uploadpagina |
| 10 | Enter in het huisregelsveld voegt regels om de andere keer samen | Doos, Huisregels | hinderlijk | Henk, Sanne (met de hand nakijken) | Sinds B152 is het veld de kaarttekst-editor (contenteditable). Enter zet een `\n`-tekstknoop plus een `<br>`; vermoedelijk tekent de editor de tekst daarna opnieuw zonder het regeleinde | Met de hand nadoen, test schrijven op Enter, typen, Enter; `readFrom` en `renderInto` gelijk laten lopen |
| 11 | "Bord vergroten" zoomt in op een hoek of opent het vak Start | editor, minibord | hinderlijk | Ria, Joost, Maya | Knop ligt over de bordtegels; zoomt binnen het kleine vak | Knop buiten het bord, en vergroten als echt groot bord (zie UX 2) |
| 12 | Werkruimte schuift omhoog met een lege beige band onderaan | editor, na Tab of veel typen | hinderlijk | Eva, Henk, Sanne | `<main>` is `overflow-auto` en scrolt mee als de focus diep in een kolom komt | `<main>` niet laten scrollen, alleen de kolommen; focus met `preventScroll` waar nodig |
| 13 | Lange namen worden onleesbaar klein (rond 4 pt), Controle zegt niets | bord, Voorbeeld, PDF | hinderlijk | Noor, Lisa, Henk | Tekstpassing krimpt zonder ondergrens | Controle-regel "tekst onder 5 pt" bij het vak |
| 14 | Lange editienaam loopt over de rand: titel in het regelboekje (thuisset afgesneden), banknaam buiten de strook op het biljet | regelboekje, speelgeld | hinderlijk | Noor | Geen tekstpassing op die plekken | Zelfde tekstpassing als op het bord, plus Controle-melding als het niet past |
| 15 | Kop past niet op iPad staand (pagina 940 px breed), "Editie maken"-balk en printbalk te breed of te smal | openbare pagina's, Nieuwe editie, printpagina op 768 | hinderlijk | Lisa | Kop valt pas onder 768 terug op het menu | Menu al onder 1024 px; balken op `max-width: 100%` |
| 16 | Focus valt naar `body` na Esc in dialogen, na een upload en na een weergavewissel; losse lettersneltoetsen doen dan iets | editor, Mijn edities | hinderlijk | Eva | Dialogen geven de focus niet terug aan de opener | Focus terug naar de opener, na upload naar "Andere foto", na wissel naar de kop |
| 17 | Spelregelboekje en instructies negeren eigen woorden: "jail", "Go to jail", kolom "HOTEL", groep "Brown", "Start at Go", "Chance: 16 cards" | regelboekje, instructies | hinderlijk | Emma | `rulesContext` neemt alleen huis, hotel, Start en de twee decks over; de prijslijst heeft vaste koppen en standaardgroepnamen | Alle woorden uit `resolved.words` gebruiken, ook in de instructies |
| 18 | Foto en naam van een vriend op het hoekvak Algemeen Fonds: naam toegepast, foto onzichtbaar | Van vrienden | hinderlijk | Pim | Vriendenpagina biedt vakken aan die geen foto of eigen naam hebben | Vriend kan zulke vakken niet kiezen; de server weigert het |
| 19 | Oude link na "Nieuwe link" geeft een kale 404 | vriendenpagina | hinderlijk | Pim | Vervangen token is weg | Zelfde melding als bij een gesloten link: "Deze link is vervangen, vraag de maker om de nieuwe" |
| 20 | Lege huisregelskaart komt in de printset | kaarten-PDF | hinderlijk | Daan | Onderdeel aan zonder tekst wordt toch getekend | Controle-melding "Huisregels is leeg" en de kaart niet printen |
| 21 | Te weinig biljetten voor 8 spelers (30 per soort; 8 × 6 briefjes van 20 is 48) | speelgeld, boekje | hinderlijk | Henk | `standard-edition.json` heeft 30 per soort, net als het origineel, terwijl het boekje "2 tot 8 spelers" zegt | Zie vraag 3 in §7 |
| 22 | Printpagina noemt altijd 248 × 248 mm, ook bij een eigen bordmaat | printpagina, instructie en printgids | hinderlijk | Henk | Vaste tekst in `print.spec.printer.board` en `instructies/bord.md` | Maat uitrekenen uit het bordprofiel |
| 23 | Middenfoto met te lage resolutie komt niet in Controle | Midden van het bord | hinderlijk (onder voorbehoud) | Lisa | Niet nagekeken | Nakijken of de resolutiecontrole het midden meeneemt |
| 24 | Naam afgekapt met "…" in minibord, kop en miniatuur, terwijl bord en PDF de hele naam tonen | editor, Mijn edities | klein | Ria, Noor, Maya, Joost, Eva, Lisa | Minibord kapt af in plaats van te krimpen | Zelfde tekstpassing als het grote bord; kop op twee regels of volledig bij aantikken |
| 25 | "Aangepast: 61" direct na het maken van een sjablooneditie | Mijn edities | klein | Maya, Pim, Eva | `summarize()` in `repository.ts` telt alle elementsleutels, ook die uit het sjabloon; B152 is hier niet doorgevoerd | Tellen tegen het sjabloon, zoals de editor doet |
| 26 | Bedragen in lopende tekst: "€ / 200" breekt over twee regels; standaardteksten zeggen "200" zonder munt | kaarten, boekje | klein | Noor, Raj, Maya | `formatMoney` zet een gewone spatie; standaardtekst "Ontvang 200 van de bank" in `standard-edition.json` | Harde spatie in `formatMoney`; standaardteksten met `{currency}` |
| 27 | De groep "bruin" is in Riso paars, maar heet overal bruin; het kleine bord toont hem wel bruin | editor, vriendenpagina, prijslijst | klein | Maya, Eva, Emma | Groepsnaam volgt de standaard, niet de kleur van het thema | Groepsnaam per thema, of de kleurnaam uit de gekozen kleur |
| 28 | Ruwe sleutel "Nu: group.brown" | vriendenpagina, Plaatsen | klein | Pim, Maya | Label voor een plaats zonder naam valt terug op de sleutel | Kleurnaam tonen of "nog geen naam" |
| 29 | Engelse editie krijgt munt M terwijl het formulier "€ euro" toonde | Nieuwe editie | klein | Lisa | Melding en gekozen taal liepen uit de pas (niet gereproduceerd) | Nakijken samen met vraag 1 |
| 30 | Van vrienden: "Toegepast op…" blijft staan en staat buiten beeld; knop "Van vrienden" springt niet naar de volgende | editor | klein | Pim | | Melding bij het voorstel zelf en weg bij een ander element; knop gaat naar het volgende element met een bijdrage |
| 31 | Controle toont dezelfde waarschuwing twee keer | Controle | klein | Pim | | Ontdubbelen op element en melding |
| 32 | Pionnen-PDF zegt "Pionnen 1 t/m 8" bij 5 pionnen | pionnen-PDF | klein | Ria | Vaste kop | Aantal uit `resolved.pawns` |
| 33 | Menu "Pion weghalen" ligt over de gele waarschuwing | Doos, pion | klein | Ria | | Menu boven alles en met eigen achtergrond |
| 34 | Hulptekst bij het midden zegt "Rood gearceerd", de vouwlijnen zijn beige | Midden van het bord | klein | Lisa | Tekst `editor.center_hint` | Tekst aanpassen of de arcering rood maken |
| 35 | Uitlijntest achterkant: uitleg staat over de kaartkaders | kaarten-PDF thuis | klein | Maya | | Tekst buiten de kaders |
| 36 | Eigen tekstlaag op het deksel botst met de vaste tekst, zonder melding | doosdeksel | klein | Noor | | Rode zone voor de vaste tekst, Controle-melding bij overlap |
| 37 | In de telefoonindeling doet Enter na `j` of `k` niets; de sneltoetslijst noemt "Geld" als tab 3 ook zonder speelgeld | editor, sneltoetsen | klein | Eva | | Enter opent het gekozen vak; lijst volgt de tabs |
| 38 | Voorbeeldkaart op de startpagina mengt € en M | startpagina, Nieuwe editie | klein | Maya | | Eén munt in de voorbeeldeditie |
| 39 | Liggende iPad: "Eigendomsbewijs" in de schakelaar en de editienaam afgekapt | editor 1024 × 768 | klein | Lisa | | Kortere labels of krimpen |
| 40 | Dunne donkere streep langs de rechterrand van de editor | editor op 320 en 375 | klein | Daan | | Nakijken welke kolom net buiten beeld staat |
| 41 | Spookstreep boven elke kaart | Mijn edities | klein | Joost | | Rand van de kaart nakijken |
| 42 | Lege editie werd Riso terwijl de pagina Klassiek toonde | Nieuwe editie, Engels | klein (onzeker) | Eva | Niet gereproduceerd | Met de hand nakijken |
| 43 | SSR-fout "reading 'printGuide'" (4 keer) | productielog | klein | geen | Een pagina krijgt de gedeelde prop `pageUrls` niet; de pagina valt terug op renderen in de browser | Pagina zoeken (vermoedelijk een foutpagina buiten de gewone middleware) en de prop altijd meegeven |

Samen: 43 unieke bugs. 2 blokkerend, 21 hinderlijk, 20 klein.

### 2.1 De limiet op printen

Vijf testers kregen "Te veel aanvragen". Ze printten tegelijk vanaf één IP-adres.

De limieten op main (`routes/web.php`, per IP-adres, of per account als je bent ingelogd):

| Verzoek | Limiet |
| --- | --- |
| `POST /api/print-jobs` (editie uploaden, eerste klik op Maken zonder account) | 6 per minuut |
| `POST /api/print/{job}/photos` (foto's in porties van 10) | 60 per minuut |
| `POST /api/print/{job}/generate` (een set of een los onderdeel starten) | 30 per minuut |
| `POST /api/share-image` | 6 per minuut |

Eén gebruiker die een volledige set maakt, doet één upload, hooguit een paar fotoverzoeken en één tot een handvol `generate`-verzoeken. Dat past ruim. De limiet is dus niet te krap voor één echte gebruiker. Hij wordt wel krap op een gedeeld netwerk: een klas of school op één wifi, of een gezin dat tegelijk print. Elke klik op Printen vanuit de editor maakt zonder account een nieuwe job (zie bug 9), dus wie een paar keer heen en weer gaat, telt ook snel op.

Voorstel (een detail, dus zelf te kiezen): upload naar 20 per minuut per IP-adres, met daarbij een ruimere limiet per uur, en de fix van bug 9 zodat een bestaande job hergebruikt wordt. De melding komt bij de knop met een teller die zelf opnieuw probeert (bug 4).

## 3. UX

Per thema de testers, wat er misgaat en een voorstel met de plek volgens B143.

### UX 1. Foto's en uitsnede

Testers: Henk, Raj, Lisa, Maya, Noor, Joost, Emma, Ria, Pim (10 met de punten hieronder samen).

- De foto op een pion is een smalle strook. De standaarduitsnede is het midden, dus hoofden en gezichten vallen weg (Henk, Lisa, Maya, Noor, Joost, Emma). Verschuiven kan al: slepen en knijpen in het voorbeeld, pijltjes en plus en min. Niemand vond dat. De hint "Sleep de foto in het voorbeeld" staat in kleine tekst onder de knoppen.
- Een logo of breed beeld wordt altijd vullend getoond. Zoom begint bij 100% (`MIN_ZOOM = 1`), dus een logo past nooit helemaal (Henk "akker Janse", Raj). Panorama's worden een smalle middenstrook op kaartachterkant en deksel (Emma).
- Foto op het vak komt niet op het eigendomsbewijs (Ria, Maya, Noor, Emma, Joost). Een straat heeft al een eigen foto op het eigendomsbewijs, via de schakelaar Vak / Eigendomsbewijs, maar niemand verwachtte dat je hem twee keer moet zetten.
- Meerdere foto's tegelijk kiezen verdeelt ze over de volgende vakken (Joost: "Bakker Jansen" op de supermarkt). Er staat een korte melding ":count foto's geplaatst", die Joost niet zag. Herschikken kan alleen door opnieuw te uploaden.
- Twee stappen voor een foto: eerst "Foto", dan "Foto kiezen" (Ria, Lisa). "Eigen afbeelding" en "Foto" lijken hetzelfde (Raj). Doosdeksel heeft twee routes naar een foto (Henk).
- Bij "Hele vak" is de prijs op een donkere foto onleesbaar en raakt hij de foto (Lisa, Noor).
- Een vriend krijgt geen melding bij een foto van 80 px (Pim).

Voorstel, alles in de sectie Afbeelding van het veldenpaneel (B143 punt 2):
- Na de eerste foto een korte animatie of hand-icoon op het voorbeeld met "Sleep om te verschuiven, knijp of scroll om te zoomen". Op aanraakschermen ook.
- Standaarduitsnede bij een staande foto in een liggend kader: bovenste derde in plaats van het midden. Bij pionnen altijd.
- Een keuze "Vullend / Passend" naast "In kader / Hele vak" bij Eigen afbeelding, Foto, deksel en kaartachterkant. Passend krijgt een achtergrondkleur (de kleur van het vak of wit).
- Bij een straat met een foto: in Afbeelding de regel "Ook op het eigendomsbewijs", standaard aan. Een eigen foto voor het eigendomsbewijs blijft mogelijk (zie vraag 4).
- Na meerdere foto's tegelijk: de melding blijft in het paneel staan met de lijst "foto → vak" en één knop Ongedaan maken.
- "Foto" opent meteen de bestandskiezer.

### UX 2. Het bord op de telefoon zonder namen

Testers: Daan, Maya, Joost, Emma, Pim (vrienden), Ria.

- Het minibord toont op de telefoon alleen kleurstrepen en stippen. Ook ingezoomd geen namen; tegels zijn 23 tot 33 px (Daan, Maya, Joost).
- "Vak kiezen" ligt over de onderste rij (Maya, Emma). "Bord vergroten" zoomt raar of opent Start (bug 11).
- Op de vriendenpagina tikken vrienden op het buurvak (Pim: Rob op Algemeen Fonds) en zien ze geen namen (Emma).
- De lijst met 41 vakken begint pas onder de vouw en heeft geen zoekveld (Joost, Sanne bij kaarten).

Voorstel. B144 maakt de lijst de hoofdroute op de telefoon; dat klopt met wat de testers deden. Daarom:
- Het vergrote bord (een tik) toont namen in de tegels, met een tegel van minstens 44 px; anders geen bord als keuzemiddel maar de lijst.
- Bovenaan de lijst links een zoekveld "Zoek een vak" (de lijst zelf, geen nieuwe knop in de kop).
- Vriendenpagina: naast het bord dezelfde zoekbare lijst, en na een tik de regel "Gekozen: De Vaste Kroeg" groot in stap 3.

### UX 3. Printlast thuis

Testers: Sanne, Ria, Daan, Joost, Eva, Henk, Pim, Emma.

- Speelgeld is 35 vel A4 en 17 MB, zonder keuze (Sanne, Ria, Daan, Joost, Eva). Dat zie je pas na het maken.
- Geen totaal aan vellen of inkt (Daan, Ria). "7 vellen" bij 16 pagina's is verwarrend (Ria).
- Het thuisbord gaat uit van een oud bord en stickerpapier (Daan); is ruim een avond knippen (Ria); de titel loopt over vellen heen (Emma, Joost).
- Thuisprint-set bevat een deksel op A3 (Henk).
- De printpagina opent altijd op Drukkerij-set (Ria, Daan).
- Op de telefoon is de ZIP onhandig; losse PDF's staan klein (Joost).
- Meerdere exemplaren voor een klas kan niet (Sanne).

Voorstel (B143 punt 5: rijen op de printpagina):
- Elke rij toont het aantal vellen al vóór het maken; de vaste balk zegt het totaal ("50 vel A4, waarvan 35 speelgeld").
- De printpagina onthoudt per editie de laatst gebruikte set.
- Speelgeld: een keuze voor het aantal biljetten (zie vraag 3), als veld bij Speelgeld onder Onderdelen in het editiepaneel en zichtbaar in de rij.
- Thuisprint-uitleg bovenaan in één regel met wat je nodig hebt, en in de bordinstructie een route "op gewoon papier, op karton geplakt" (zie vraag 5).
- Deksel in de thuisset: op twee A4's, of de rij zegt "A3 nodig".
- Op de telefoon "Open PDF" als eerste knop per rij, ZIP tweede.

### UX 4. Woorden en namen niet doorgevoerd

Testers: Henk, Raj, Emma, Daan, Sanne, Lisa, Eva, Maya, Pim.

- Eigen munt niet in het boekje (bug 7), eigen woorden niet in boekje en instructies (bug 17).
- Stations blijven "stations" en "vervoersvak" op eigendomsbewijzen en kaarten (Daan). Woorden heeft geen veld voor station en nutsbedrijf.
- Op het getekende gevangenisvak blijft "In de cel" staan bij een hernoemd vak (Sanne).
- De naam van een eigen munt ("Kus", "Toos-coin") komt nergens op het biljet; alleen het teken (Lisa, Eva).
- Het label bij Onderdelen zegt "Kans en Algemeen Fonds" ook na hernoemen (Emma).
- Placeholder op de vriendenpagina gaat over "jullie dorp" of "your town", ook bij een studentenhuis of reis (Daan, Maya, Emma). Tab heet "Towns".

Voorstel: één bron voor alle woorden (`resolved.words`) in boekje, instructies, labels en vriendenpagina. In het editiepaneel onder Woorden (B143 punt 1, B145) twee velden erbij: station(s) en nutsbedrijf (nutsbedrijven). De naam van de eigen munt komt op het biljet onder het bedrag, in plaats van "Speelgeld" (geen nieuw veld: de naam staat al onder Algemeen). Placeholder neutraal: "Een idee voor een naam". Tab "Plaatsen" blijft, Engels "Places".

### UX 5. Liggend, tablet en zoom

Testers: Emma, Lisa, Eva, Daan, Joost, Raj, Ria.

- Liggende telefoon onbruikbaar (bug 2).
- iPad staand: kop en balken te breed (bug 15), het voorbeeldbord is 320 px en plakt bovenin, het formulier scrolt in 380 px (Lisa).
- Op 150% zoom (960 CSS-pixels) krijgt Eva de telefoonindeling met een vak van 70 px. B144 zet de grens op 1024 px.
- De vaste onderbalk op de printpagina is 25 tot 33 procent van het scherm (Daan, Joost) en bedekt "Extra drukwerk" (Raj).
- Kleine tekst (12 px mono) voor tellingen en status (Eva, Ria).

Voorstel: van 768 tot 1023 px een indeling met twee kolommen (lijst en paneel, het bord inklapbaar), zie vraag 2. Bij een lage hoogte (onder 500 px) het voorbeeld naast het formulier. Vaste printbalk op één regel met de knop; de serveruitleg één keer boven de lijst. Tellingen en status naar 14 px.

### UX 6. Samen maken

Testers: Pim, Maya, Daan, Emma, Lisa, Ria.

- Geen overzicht van alle voorstellen op één plek; je springt per element (Pim, Maya). B146 heeft al "een lijst van wat wacht" in de sectie Samen maken, maar die toont geen inhoud en je kunt er niet beoordelen.
- Twee namen voor hetzelfde vak staan los onder elkaar en blijven staan na toepassen (Pim).
- Naam en foto van één voorstel gaan samen; apart kan niet. Je ziet de foto pas op het vak na toepassen (Pim).
- Een vriend kan geen bedrag meesturen (bug 8) en geen nieuwe kaart voorstellen (Pim; B153 laat vrienden wel bestaande extra kaarten aanvullen).
- Vriend ziet "Bekeken door de maker" bij toegepast en geweigerd (Pim). Te lange naam wordt stil afgekapt op 40 tekens, emoji verdwijnen stil (Pim).
- "Wacht op jou: nog niets binnen" bij een gesloten link (Pim). "Nieuwe link" zonder bevestiging en "Alles verwijderen" in dezelfde stijl ernaast (Pim, Maya).
- Vrienden zien alle kaartteksten (Maya). De vervaldatum van de link komt onverwacht (Ria).

Voorstel, binnen B146:
- De lijst in de sectie Samen maken wordt het overzicht: per voorstel wie, wat, welk vak, een miniatuur, en Toepassen en Weigeren in de rij. Springen naar het element blijft.
- Onder "Van vrienden" bij een element: voorstellen per veld gegroepeerd ("2 voorstellen voor de naam"). Toepassen van één zet de andere op "niet gekozen".
- Toepassen per veld (naam, foto, tekst, bedrag) met een voorbeeld op het vak vóór het toepassen.
- Vriendenformulier: bedragveld bij kaarten, teller bij naamvelden, gele regel bij een foto onder 600 px.
- Status voor de vriend: "Staat erin" of "Niet gebruikt".
- "Nieuwe link" en "Alles verwijderen" met een vraag vooraf; verwijderen rood en apart.
- De vervaldatum al bij het maken van de link noemen.

### UX 7. Stille correcties en terugkoppeling

Testers: Henk, Eva, Joost, Raj, Maya, Pim, Ria, Daan, Emma, Noor, Lisa.

- Een bedrag buiten de 20% springt zonder melding terug naar de oude waarde (Henk, Eva, Joost). De grens zelf (B132) is er en staat klein onder het veld.
- Ongedaan maken geeft geen terugkoppeling en springt niet naar het element (Eva).
- Opslaan is stil (Raj), wijzigingen kunnen verloren gaan (bug 3).
- Een gewiste kaarttekst valt stil terug op een andere standaardtekst (Maya).
- Prijs aanpassen laat hypotheek en huur staan (Joost). Dat is zo besloten in B140, maar de editor zegt het niet.
- Tellingen "0/41" en "Aangepast: 63" lezen als voortgang (Ria, Daan, Emma, Pim, Eva).
- Printen met een foto van 34 dpi gaat zonder vraag (Raj).

Voorstel:
- Bedrag buiten de grens: vastzetten op de grens en bij het veld "Maximaal 72" tonen (ook in `aria-live`). B132 blijft. Henk wil vrije bedragen; dat staat haaks op B132 en is niet opnieuw gevraagd.
- Ongedaan maken en opnieuw: selectie springt naar het element, en een korte melding in de opslagstatus van de kop ("Naam van De Opel van papa terug").
- Opslagstatus toont kort "Bewaard" na een wijziging.
- Bij Prijs een regel "Huur en hypotheek pas je apart aan".
- Tellingen als "6 aangepast" en Mijn edities telt tegen het sjabloon (bug 25).
- Nieuwe Controle-regels: tekst onder 5 pt, tekst die uit zijn vlak loopt, lege huisregels, bedrag in de tekst dat niet het bedrag is, middenfoto. Printen met openstaande Controle-meldingen: de vaste printbalk noemt het aantal met een link naar Controle, zonder extra dialoog.

### UX 8. Toetsenbord en toegankelijkheid

Tester: Eva (en Ria over kleine tekst).

- Losse lettersneltoetsen staan standaard aan; met de focus op `body` (bug 16) doen ze dingen op de verkeerde plek.
- De Controle-popover opent rechtsboven, ver van de knop, en dekt het voorbeeld.
- Geen h1 in de editor; op de landingspagina staat een h2 vóór de h1.
- Skiplink zet de focus niet.
- In Mijn edities komt het menu vóór Openen in de tabvolgorde.
- Rode stapnummers op de landing: contrast 4,18:1.

Voorstel: bij het eerste gebruik van een lettersneltoets één keer vragen "Sneltoetsen met losse letters gebruiken?", Ctrl/Cmd-toetsen blijven altijd. Controle opent bij de knop. Koppenstructuur en skiplink rechtzetten. Contrast van de stapnummers omhoog.

### UX 9. Begin en standaardaantallen

Testers: Henk, Lisa, Ria, Daan, Emma, Raj, Joost, Sanne.

- "Leeg" is het standaardspel met Molenweg (Henk) en zonder speelgeld, deksel en huisregels (Lisa).
- Acht pionnen staan standaard aan en geven elk een Controle-melding (Ria, Lisa, Daan, Emma). Pionnen weghalen kan al via het menu ⋯ van een pion; Lisa vond dat niet.
- Sjablonen passen niet: geen school, club, studentenhuis of afscheid (Sanne, Joost, Daan, Raj).
- Dupliceren bestaat al, in het naammenu en op Mijn edities (Joost gebruikte het). Henk en Raj vonden het niet en begonnen drie keer opnieuw.
- Logo in het midden van het bord bestaat al (Midden, keuze Logo). Raj vond het niet; het midden staat niet in de lijst en is alleen bereikbaar via het bord (Lisa).
- Uitnodiging: de tekst is al aan te passen (Doos, Uitnodiging); Raj zocht in een editie zonder uitnodiging. De kop "Spelavond" ligt vast (Raj, Pim).
- Mijn edities verspringt na elke wijziging (Henk). Twee edities met dezelfde naam zijn niet te onderscheiden (Eva).

Voorstel:
- Bovenaan de lijst van de tab Bord een rij "Midden van het bord" (de lijst, geen nieuwe knop).
- Bij Pionnen in de Doos een groepsveld "Aantal pionnen: 2 tot 8" (B143 punt 2, groepslabel). Controle meldt pionnen zonder foto pas als er minstens één foto is.
- Dupliceren blijft in het menu (B150 houdt twee acties op de kaart). Na het maken van een editie uit een sjabloon noemt Nieuwe editie in één regel dat je een bestaande editie kunt dupliceren. De kaart in Mijn edities toont sjabloon en thema, en de lijst staat op aanmaakdatum.
- Kop van de uitnodiging als veld in de sectie Tekst van de uitnodiging.

## 4. Ontwerp

### Wat er goed uitziet

- De drie thema's verschillen echt. Riso is het sterkst (Noor, Raj, Lisa, Daan); Klassiek voelt als een echt spel (Raj, Ria, Emma, Joost).
- Het speelgeld is volgens vijf testers het mooiste onderdeel: guilloche, ovaal met foto, eigen banknaam en kleur (Lisa, Noor, Joost, Emma, Henk).
- Eigendomsbewijzen: rustig, goed leesbaar, prijzen netjes rechts (Sanne, Ria, Raj, Noor, Emma).
- Landing, Nieuwe editie, Mijn edities met schuine kaartjes en de vriendenpagina zijn levendig en passen bij de keukentafel (Noor, Ria, Pim, Maya, Eva).
- Focusringen zijn dik en duidelijk; contrast van de interface haalt de norm (Eva).
- De dpi-meldingen bij foto's geven vertrouwen (Henk, Noor, Lisa, Joost).

### Wat goedkoop of onaf oogt

- Strak / Sleek is kaal: wit bord met een zwarte balk, grijze vlakken (Raj, Henk, Joost, Emma). Voor bedrijven het logische thema, maar het oogt onaf. De accentkleur raakt alleen pijlen en de dekseltitel, niet de middenbalk (Raj).
- Doosdeksel is de zwakste plek: kale plaat met titel en vier iconen, of een foto met een grijze band over het midden. "Een spel voor 2 tot 8 spelers" ligt vast (Lisa, Pim, Noor).
- Titellint in het midden loopt dwars over de foto en de gezichten; de ondertitel is een paar mm hoog (Lisa).
- Pionnen zonder foto zijn een naam in grote letters met "Pion" in grijs (Henk, Raj, Pim).
- Foto's op het bord zijn 12 tot 17 mm; gezichten zijn nauwelijks te zien (Ria, Joost).
- Emoji komen als gekleurde plaatjes in het lint en passen niet bij het platte ontwerp (Noor).
- Het vak-voorbeeld in de editor is groot en leeg (Ria); het minibord op de telefoon is een leeg raster (Daan, Maya, Joost).
- De miniatuur van het proefvel is een lege kaderstekening (Pim).

### PDF's

Goed:
- Scherp, lettertypen ingebed, alle bijzondere tekens kloppen (ß, Œ, Ł, Ø, é, ã, emoji) (Noor, Emma).
- Juiste formaten: A5 met afloop, kaarten 63 × 88 met afloop, SRA3 voor geld, bord 4 × 254 mm (Henk, Lisa, Pim).
- Uitlijntest voor dubbelzijdig printen met haarkruisen en schaal (Noor, Raj, Joost).
- Snel: 15 tot 80 seconden per set.

Minder:
- Alles RGB, geen TrimBox of BleedBox; bord en kaarten in de drukkerij-set zonder snijtekens (Noor).
- Snijtekens lopen over de kop "Speelgeld: € 1" en in de volgende pion; de buitenste randlijn van het bord valt in de afloop en verdwijnt na het snijden (Noor).
- Instructie-PDF's zijn kaal (Arial, zwart-wit) en noemen de editie niet (Raj). PDF-titel is "Printopoly" in plaats van de editienaam (Emma).
- Thuisbord: grote effen groene of roze middenstukken kosten veel inkt (Ria); de titel loopt over vellen heen (Emma, Joost).
- Strak is niet echt zwart-wit (Daan); beige biljetten kosten inkt (Sanne).
- Het laatste eigendomsbewijs staat op een pagina met Kans-kaarten (Maya); veel wit in het boekje (Henk).
- Geen bestandje voor de drukker met maat, afloop, papier en kleurprofiel (Lisa).

## 5. Feature-wensen

"Bestaat al deels" verwijst naar wat er op main al is. Plek volgens B143.

| Wens | Testers | Must / nice | Bestaat al deels? | Plek in het product | Grootte |
| --- | --- | --- | --- | --- | --- |
| Foto goed uitsnijden: passend tonen, slimme standaard bij gezichten | Henk, Raj, Maya, Emma, Joost, Lisa, Noor (7) | must (Henk, Raj, Maya, Emma) | ja: slepen, knijpen, pijltjes en zoom vanaf 100% | sectie Afbeelding van het veldenpaneel | M |
| Namen als lijst invullen of plakken | Henk, Sanne, Ria, Raj, Daan, Eva (6) | must (Henk, Daan, Eva) | nee (alleen vorige en volgende) | de lijst links zelf: namen direct bewerkbaar, meerdere regels plakken vult de volgende vakken | M |
| Minder speelgeld of aantal biljetten kiezen (en genoeg voor 8) | Henk, Sanne, Ria, Daan, Eva, Joost (6) | must (Henk, Sanne) | nee | veld bij Speelgeld onder Onderdelen, zichtbaar in de rij op de printpagina | M |
| Foto ook op het eigendomsbewijs | Ria, Maya, Noor, Emma, Joost (5) | must (Ria, Emma) | ja: eigen foto via de schakelaar Eigendomsbewijs | regel "Ook op het eigendomsbewijs" in Afbeelding | S |
| Printinschatting: vellen, inkt, tijd vooraf | Ria, Daan, Joost, Eva (4) | must (Ria) | deels: vellen per rij, geen totaal | rijen en vaste balk van de printpagina | S |
| Aantal pionnen kiezen | Ria, Lisa, Emma, Daan (4) | nice | ja: pion weghalen via ⋯ | groepsveld bij Pionnen in het veldenpaneel | S |
| Meerdere exemplaren of klasset | Sanne, Henk, Lisa, Raj (4) | must (Sanne) | nee | veld "Aantal sets" in de vaste balk van de printpagina; instructies rekenen mee | M |
| Doosdeksel rijker: ondertitel en eigen regels, foto zonder band, tekstlaag met kleur en letter, cadeautekst | Lisa, Pim, Noor, Ria (4) | must (Lisa, Noor) | deels: titel, foto, vrije lagen met grootte en draaien | secties Tekst, Afbeelding en Stijl van het doosdeksel | M |
| Nieuwe sjablonen: school, club, studentenhuis, afscheid of klantevent | Sanne, Joost, Daan, Raj (4) | must (Daan) | nee | Nieuwe editie, "Begin met…" | M |
| Uitnodiging: kop aanpasbaar, echt bord met eigen midden | Raj, Pim, Lisa (3) | must (Pim, Lisa) | deels: tekstregels zijn aan te passen | sectie Tekst van de uitnodiging; bord via de gedeelde bordprops (bug 5) | S |
| Meer editiewoorden: station, nutsbedrijf, muntnaam op het biljet | Daan, Lisa, Eva (3) | must (Daan) | deels: huis, hotel, gevangenis, decks, bank | Woorden in het editiepaneel | S |
| Drukkerspakket: TrimBox en BleedBox, specificatieblad, één bestand voor de drukker | Noor, Lisa, Raj (3) | must (Noor, Lisa) | nee | PDF's en een rij in Extra drukwerk of in de instructies | M |
| Foto's tegelijk toewijzen, fotolade | Ria, Joost, Sanne (3) | must (Ria, Joost) | deels: meerdere kiezen vult de volgende vakken | sectie Afbeelding en de melding na het plaatsen; een lade is L | L |
| Samen maken: overzicht, conflicten per veld, bedrag meesturen | Pim, Maya (2) | must (Pim, Maya) | deels: lijst in de sectie Samen maken (B146) | sectie Samen maken en "Van vrienden" | M |
| Zoeken in vakken en kaarten | Joost, Sanne (2) | must (Joost) | nee (alleen in "Invoegen" van kaarttekst) | de lijst links | S |
| Preflight in Controle (tekst te klein, loopt uit zijn vlak) | Noor, Lisa (2) | must (Noor) | deels: dpi en "past niet" | Controle | M |
| Grote tekst of eenvoudige modus | Ria, Eva (2) | must (Eva) | nee | instelling in het accountmenu of de voet; geen knop in de kop | M |
| Foto of meme op een kaart | Maya, Lisa (2) | nice | ja: foto op kaartvoor- en achterkant (Emma gebruikte het) | bestaat; vindbaarheid | geen |
| Dupliceren | Henk, Raj (2) | must (Henk) | ja, helemaal | naammenu en Mijn edities; vindbaarheid | geen |
| Logo in het midden van het bord | Raj (1) | must | ja, helemaal (Midden, Logo) | rij "Midden van het bord" in de lijst | geen |
| Midden vrij indelen: lint verplaatsen of weglaten bij een foto | Lisa (1) | must | nee | sectie Stijl van het midden | M |
| Huisstijl: accent ook op middenbalk en biljetten | Raj, Noor (2) | must zakelijk (Raj) | deels: accentkleur en groepskleuren | Uiterlijk in het editiepaneel | M |
| Alleen-lezen link om de editie te laten zien | Lisa, Maya (2) | nice | nee | naammenu (handeling op de editie) | M |
| Vrienden stemmen, kaarten verbergen voor vrienden | Pim, Maya (2) | nice | nee | sectie Samen maken | M |
| Back-up of tekstexport zonder account | Emma, Eva (2) | nice | nee | naammenu | S |
| Overzicht kleurgroepen met plaats en huurschaal | Joost (1) | must | deels: plaats per groep in het veld van een straat | sectie in het editiepaneel (geldt voor groepen van de hele editie) | M |
| Verhaalveld op het eigendomsbewijs | Ria (1) | must | deels: kleine regel Plaats | sectie Tekst van het eigendomsbewijs | S |
| Thuisprint op gewoon papier en karton | Daan (1) | must | nee | instructie bij de bordrij | S |
| Valuta uit de taal of het land afleiden | Emma (en vraag 1) | nice | deels: munt volgt de taal | Nieuwe editie | S |
| Eigen bedragen buiten de 20% | Henk (1) | nice | nee, B132 sluit het uit | niet doen (B132) | geen |
| Kleinere wensen: antwoord achterop een quizkaart (Sanne), meer iconen, ẞ en "geen hoofdletters", bleed tonen, Riso-scheiding (Noor), PDF-titel met editienaam, collage, QR per plek (Emma), sponsorpagina, oplage bestellen (Henk), meldingen bij voorstellen, nieuwe kaart voorstellen (Pim), snelle set, straat claimen (Daan), lijst van wijzigingen (Eva), foto vanaf de telefoon (Ria) | 1 elk | nice (nieuwe kaart voorstellen: must voor Pim) | Delen per rij en PNG per rij bestaan al (B149) | per wens | S tot L |

## 6. Wat goed werkte

- Een editie maken gaat snel: onder 4 seconden van sjabloon tot editor, ook op 320 px (Daan, Maya, Raj).
- Hernoemde vakken lopen vanzelf door in kaarten, boekje en prijslijst (Henk, Sanne, Daan, Maya, Emma). Eigen woorden voor huis en hotel staan in het boekje (Henk, Emma).
- Vorige en volgende onderin: snel hernoemen met één duim (Daan, Maya, Joost).
- Foto's van elke soort: HEIC, 21 MB, 54 megapixel, binnen 3 seconden, met een duidelijke dpi-melding (Emma, Joost, Ria, Pim).
- Controle is concreet: dpi met de naam van het vak, pionnen zonder foto, tekst die niet past (Henk, Sanne, Pim, Eva).
- Opslaan zonder account werkt tussen sessies (Ria, Joost, Noor). Mijn edities toont "Thuisprint-set klaar tot 28 nov" (Henk, Daan, Joost).
- Printen: 15 tot 80 seconden per set, duidelijke status per onderdeel, ZIP en losse PDF's, instructies per onderdeel in goed Nederlands en Engels.
- Samen maken zonder account: link maken in één tik, vriendenpagina helder in drie stappen met een live voorbeeld, een gesloten link toont vrienden een nette melding, HTML en emoji worden veilig behandeld (Pim, Maya, Daan, Lisa, Emma).
- Alles is met alleen het toetsenbord te doen; dialogen houden de focus vast, verwijderen begint op Annuleren, de printvoortgang staat in een `status`-gebied (Eva).
- Geen Nederlandse tekst in de Engelse pagina's of PDF's (Emma).

## 7. Voorstel

### Bouwvolgorde

Batch 1: alle blokkerende en hinderlijke bugs.
- Plaatje voor de groepsapp in een job (1).
- Opslaan bij sluiten (3), herladen en printen vanuit Mijn edities (9), teller met overgeslagen onderdelen (6), melding en limiet bij 429 (4, §2.1).
- Gedeelde bordprops voor Voorbeeld, printminiatuur en uitnodiging (5).
- Munt en woorden in boekje en instructies (7, 17), harde spatie en munt in standaardteksten (26), paneelmaat (22).
- Huisregels Enter (10), lege huisregels (20), bedrag in tekst tegen bedrag onderaan als Controle-melding (8).
- Tekstpassing en Controle bij te kleine of te lange tekst (13, 14, 24).
- Vriendenpagina: geen hoekvakken (18), vervangen link (19), `group.brown` (28).
- Layout: liggend (2), iPad-kop (15), werkruimte die verschuift (12), focus (16), "Bord vergroten" (11).
- Te weinig biljetten (21) volgt vraag 3.

Batch 2: de kleine bugs (24 tot 43) in één ronde, plus de integratieronde van B138 met voor- en na-schermafbeeldingen.

Batch 3: de vijf grootste UX-thema's.
1. Foto's en uitsnede (UX 1): hint bij slepen, betere standaarduitsnede, Passend, foto mee naar het eigendomsbewijs, melding na meerdere foto's.
2. Stille correcties (UX 7): bedragen vastzetten met melding, ongedaan maken met terugkoppeling, nieuwe Controle-regels, tellingen.
3. Printlast thuis (UX 3): vellen vooraf en totaal, onthouden van de set, minder speelgeld.
4. Bord op de telefoon en vindbaarheid (UX 2, UX 9): namen op het vergrote bord, zoekveld, rij "Midden van het bord", aantal pionnen.
5. Woorden doorvoeren (UX 4) en Samen maken (UX 6).
Daarna UX 5 (tablet en zoom, na vraag 2) en UX 8 (toetsenbord).

Batch 4: features, in volgorde van testers en grootte. Namen als lijst, minder speelgeld (als het in batch 3 nog niet zit), printinschatting, uitnodiging en doosdeksel, meer editiewoorden, aantal sets, nieuwe sjablonen, drukkerspakket, Samen maken-overzicht, fotolade.

Daarna één deploy na lokaal testen, zoals afgesproken.

### Vragen voor Niek

1. Munt bij een Engelse editie. Nu is dat M (B72, B150). Zes testers vonden M verwarrend of verwachtten £ of $. Voorstel: Engelse editie begint met £, en Nieuwe editie toont de munt als regel met "Wijzigen", net als thema en onderdelen. Vervangt de munt uit B72 en B150.
2. Indeling tussen 768 en 1023 px. B144 geeft daar de telefoonindeling. Dat raakt iPad staand en 150% zoom op een gewone laptop. Voorstel: twee kolommen (lijst en paneel, het bord inklapbaar) vanaf 768 px, de telefoonindeling alleen eronder. Vervangt de grens uit B144.
3. Speelgeld. Nu 30 biljetten per soort en 35 vel thuis; bij 8 spelers te weinig. Voorstel: één keuze bij Speelgeld "Hoeveel geld?" met drie standen: voor 2 tot 4 spelers, voor 5 tot 8 spelers (genoeg voor de startverdeling van 8), en de volledige bank. Standaard 2 tot 4 bij Thuisprint, volledig bij Drukkerij.
4. Foto op het eigendomsbewijs. Voorstel: de foto van een straat staat standaard ook op het eigendomsbewijs; wie daar een andere foto wil, zet die er apart op. Bestaande edities met een eigen foto houden die.
5. Thuisprint zonder stickerpapier. Voorstel: geen nieuwe set, wel een tweede route in de bordinstructie en de printgids: op gewoon papier printen en op karton plakken. Niet bouwen: een apart "gewoon papier"-bord.
6. Nieuwe sjablonen. Voorstel: twee erbij, "School of klas" en "Club of vereniging". Studentenhuis past onder Vriendengroep als de beschrijving dat noemt; afscheid onder Bedrijf of team met een paar kaarten erbij.
7. Drukkerspakket. Voorstel: TrimBox en BleedBox en snijtekens op bord en kaarten wel (detail, kan zonder vraag), CMYK of PDF/X niet: de vinyl- en kaartdrukkers die we noemen werken met RGB. Akkoord dat CMYK buiten scope blijft?
8. Namen als lijst. Voorstel: de lijst links wordt zelf bewerkbaar (namen typen, Tab naar het volgende vak, meerdere regels plakken vult de volgende vakken), zonder aparte lijstweergave of knop. Akkoord?
