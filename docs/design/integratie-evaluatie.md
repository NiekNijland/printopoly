# Integratie-evaluatie (B138)

Stand van 21 november 2026. Bekeken op printopoly.nl (live) op 1440 en 390 px, met een eigen testeditie, naast de code op main en de branches die nog lopen (`bedragen-finish`, `feat/eigen-iconen`, `feat/biljetten`). De mobiele fixes uit `docs/mobiel.md` staan op main maar nog niet live; waar dat uitmaakt, staat het erbij.

Schermafbeeldingen van nu staan in `docs/design/integratie/voor/` (voorvoegsel `d-` is 1440 px, `m-` is 390 px). De mockups van het voorstel staan als HTML in `docs/design/integratie/` en openen los in een browser; `index.html` linkt ze allemaal. Een afbeelding van elke mockup staat in `docs/design/integratie/na/`.

Niets in dit document is gebouwd. Het is een voorstel om samen met Niek door te nemen.

## Samenvatting

De editor is in een paar dagen van zes knoppen naar veertien losse ingangen gegroeid. Elke functie werkt, maar ze zitten op de plek waar ze toevallig bij kwamen: de kop heeft zeven knoppen en loopt op 1440 px over twee regels, de instellingen van de editie zijn verdeeld over vier plekken (dialoog Instellingen, dialoog Woorden, tab Stijl, en losse velden bij het bordmidden), en sommige dingen zijn op twee of drie plekken te wijzigen (munt, hoeknamen, belastingnamen, groepskleur, foto op het doosdeksel). Het veldenpaneel heeft geen vaste opbouw: elk elementtype heeft een eigen volgorde, en "Terug naar standaard" heet ook "Terugzetten" en staat er altijd, ook uitgeschakeld.

Het voorstel in vijf punten:

1. De kop houdt alleen de editie (naam met menu), de opslagstatus met ongedaan maken, Controle, Voorbeeld en Printen. Samen maken, Sneltoetsen, Woorden en Instellingen gaan in het menu onder de naam.
2. "Editie" wordt een eigen item bovenaan de linkerkolom, zoals een vak of kaart. Kies je het, dan staat het hele bord in het midden en rechts één paneel met alles wat voor de hele editie geldt, in vaste secties: Algemeen, Uiterlijk, Woorden, Onderdelen, Bord. De dialogen Instellingen en Woorden en de tab Stijl verdwijnen.
3. Het veldenpaneel heeft voor elk element dezelfde secties in dezelfde volgorde: Tekst, Afbeelding, Bedragen, Stijl, en alleen als er iets is: Van vrienden. Wat er niet is, staat er niet.
4. Eén patroon voor "terug naar standaard": per veld een klein "Standaard"-knopje dat alleen verschijnt als het veld afwijkt, en per element één actie in het menu van de paneelkop.
5. De printpagina krijgt de editie in de kop, twee groepen (Het spel, Extra drukwerk), het proefvel als eerste stap en een vaste balk met de hoofdknop, zodat "Drukkerij-set maken" niet meer onder elf kaarten verdwijnt.

## 1. Inventaris

Alles wat het product nu kan, waar het zit en hoe je erbij komt. "Telefoon (live)" is wat er nu op printopoly.nl staat; "main" is wat er al klaarstaat.

### Openbare kant

| Functie | Waar | Desktop | Telefoon |
| --- | --- | --- | --- |
| Uitleg en hoofdroute | Landing, hero | "Editie maken", "Voorbeeld bekijken" | zelfde, gestapeld |
| Verder met je edities | Landing, strook boven de hero (alleen als er edities zijn) | kaart per editie, link "Alle edities in Mijn edities" | zelfde |
| Sjablonen | Landing (strook onder de hero), Nieuwe editie (raster bovenaan), lege staat Mijn edities | tegel, "Voorbeeld bekijken" per sjabloon | zelfde |
| Voorbeeldeditie | `/editions/sample`, ook `?template=` | alleen-lezen, "Begin met deze als basis" | zelfde |
| Wat er in de sets zit | Landing, twee kaarten | links naar printgids | zelfde |
| Printgids, vragen, privacy, voorwaarden, contact | eigen pagina's | header, footer | menu |
| Taal NL/EN | header | twee vakjes | menu |
| Inloggen met Google, accountmenu | header, banner op Mijn edities en printpagina, opslagstatus in de editor | knop | menu |
| Editie maken | header (rood of omrand, B121), landing, Mijn edities | knop | menu, knop |

### Nieuwe editie

Eén lange pagina: sjabloon (8 tegels), naam, taal, valuta, thema (3 tegels), onderdelen (11 vinkjes, waarvan 4 extra drukwerk), bordmaat, knop "Editie maken" helemaal onderaan (op 1440 px na 2300 px scrollen).

### Mijn edities

| Functie | Waar | Desktop | Telefoon |
| --- | --- | --- | --- |
| Openen | klik op de kaart | | |
| Naam wijzigen, Dupliceren, Verwijderen | menu op de kaart (knop met drie streepjes) | | |
| Waar de editie staat | regel op de kaart ("In deze browser") | | |
| Inloggen-banner | boven de lijst | | |
| Nieuwe editie | knop in de kop | | |
| Gemaakte PDF's (B95: "7 dagen klaar onder Mijn edities") | ontbreekt | | |
| Bijdragen van vrienden | ontbreekt | | |

### Editor

| Functie | Waar nu | Desktop | Telefoon (live) | Telefoon (main) |
| --- | --- | --- | --- | --- |
| Terug, logo | kop links | link | pijl | pijl |
| Editienaam | kop, opent dialoog Instellingen | knop met pijltje | zelfde | zelfde |
| Opslagstatus en inloggen | kop | tekst | bovenaan de lijst | zelfde |
| Samen maken | kop, knop met teller | knop | kaart in het overzicht | Meer-menu en kaart |
| Controle | kop (geel bij meldingen), sneltoets C | knop, paneel rechtsboven | onderbalk | onderbalk |
| Ongedaan maken, opnieuw | kop, Ctrl/Cmd+Z | twee iconen | onderbalk | onderbalk |
| Voorbeeld van alles | kop, sneltoets V | knop, dialoog met tabs | niet bereikbaar | Meer-menu |
| Sneltoetsen | kop (toetsenbordicoon), ? | | n.v.t. | n.v.t. |
| Printen | kop, Ctrl/Cmd+P | rode knop | onderbalk (alleen in het overzicht) | onderbalk en Meer-menu |
| Instellingen (naam, taal, valuta, thema, onderdelen, bordmaat) | dialoog via editienaam en via link "Onderdelen kiezen of overslaan" | | | ook Meer-menu |
| Woorden van je editie (huis, hotel, munt, kaartstapels, belasting, hoeken) | dialoog via tekstlink in de linkerkolom | | tekstlink | ook Meer-menu |
| Onderdelen-tabs Bord, Kaarten, Geld, Doos en extra's, Stijl | linkerkolom, raster van tegels met telling; 1 tot 4 | | gesegmenteerde balk | zelfde |
| Minibord, vak kiezen | linkerkolom, sticky | klik, pijltjes | tikken (klein) | "Bord vergroten" |
| Lijst per bordzijde | onder het minibord | | hoofdroute | zelfde |
| Wisselen van vakken | knop "Wisselen met…" plus uitleg onder het minibord, slepen, W | | lang indrukken, knop | zelfde |
| Vak / Eigendomsbewijs | schakelaar boven het voorbeeld | | | |
| Voorkant / Achterkant (kaarten) | schakelaar boven het voorbeeld; achterkant ook als rij "Kans: achterkant" in de lijst | | | |
| Zoomen en schuiven van de foto | veldenpaneel (min, plus, schuif), slepen in het voorbeeld, pijltjes | | knijpen | |
| Naam, plaats (per kleurgroep), korte tekst (hoek), verhaal | veldenpaneel | | | |
| Kaarttekst met variabelen, Invoegen, standaardkaart met Terugzetten | veldenpaneel bij een kaart | | | |
| Bedrag op de kaart | veldenpaneel (vrij veld, leeg standaard) | | | |
| Bedragen binnen 20% (B132) | `bedragen-finish`, eigen blok "Bedragen" in het paneel | | | |
| Foto toevoegen, plakken, slepen, meerdere tegelijk | veldenpaneel, Cmd/Ctrl+V, P | | | |
| In kader / Hele vak | veldenpaneel, na het kiezen van een foto | | | |
| Kwartslag, zwart-wit | veldenpaneel, R, B | | | |
| Eigen icoon op speciale vakken (B136) | `feat/eigen-iconen`, sectie "Afbeelding" | | | |
| Groepskleur | veldenpaneel van een straat ("Kleur aanpassen") en tab Stijl | | | |
| Accentkleur | tab Stijl | | | |
| Bordmidden: Naam, Naam met foto, Logo, ondertitel, achtergrondfoto, vrije lagen | veldenpaneel van "Midden van het bord" | | | |
| Doosdeksel: naam, foto, vrije lagen | veldenpaneel | | | |
| Kaartrug: patroon, foto, lagen | veldenpaneel bij "Achterkant" | | | |
| Biljet: kleur, banknaam (voor alle biljetten), foto | veldenpaneel | | | |
| Pion: naam, foto, Pion verwijderen | veldenpaneel; toevoegen via "Pion toevoegen" in de lijst | | | |
| Huisregels, uitnodigingstekst | veldenpaneel | | | |
| Spelregelboekje, huisjes en hotels, dobbelstenen | veldenpaneel (alleen een foto) | | | |
| Bijdragen van vrienden toepassen | dialoog Samen maken, lijst "Binnengekomen" | | | |
| Plaatje voor de groepsapp | dialoog Samen maken | | | |
| Conflict tussen twee vensters | dialoog | | | |

### Printpagina

Kop "Hoe ga je printen?", schakelaar Drukkerij-set / Thuisprint-set, een rij per onderdeel (proefvel, bord, kaarten en eigendomsbewijzen, speelgeld, pionnen, doosdeksel, spelregelboekje, huisjes en hotels, dobbelstenen, uitnodiging) met vinkje, miniatuur, bestelregel, maten, status en knop "Maken". Na het maken: PDF, Delen (telefoon), PNG (uitnodiging), Instructies. Onderaan: serveruitleg, "Drukkerij-set maken", daarna ZIP. Rechts: "Je kunt onderdelen uit beide sets combineren" en "Naar de printgids". De editienaam staat nergens op de pagina.

### Deelpagina voor vrienden

`/box/{token}`: kop met de editienaam, voornaam, keuze Bord / Plaatsen / Kaarten / Pionnen, minibord, foto en voorstel, Versturen. Rustig en duidelijk; het enige scherm dat al één ding tegelijk vraagt.

## 2. Evaluatie per functie

Oordeel: houden, verplaatsen, samenvoegen, herontwerpen of weghalen.

### Editorkop

| Functie | Wat er mis is | Oordeel |
| --- | --- | --- |
| Kop als geheel | Zeven bedieningselementen plus naam en status. Op 1440 px breekt hij over twee regels (`lg:flex-wrap`) en kost hij 125 px hoogte. Samen maken, Controle, Voorbeeld en Printen zijn allemaal knoppen van dezelfde maat, dus niets valt op behalve het rood van Printen. | herontwerpen |
| Editienaam opent Instellingen | Goed idee (B91), maar niemand verwacht dat een naam een dialoog met thema en onderdelen opent. | houden als menu: de naam opent een menu met "Editie-instellingen", "Samen maken", "Sneltoetsen", "Dupliceren" |
| Opslagstatus | Klopt met B92. Staat op telefoon in de lijst, op desktop in de kop. | houden, ongedaan maken en opnieuw ernaast |
| Samen maken | Knop van dezelfde maat als Controle. Het is iets wat je één keer instelt en daarna alleen nog bekijkt als er iets binnen is. | verplaatsen naar het naammenu, met een rode stip op de naam als er iets wacht; bijdragen zelf in het veldenpaneel (zie Van vrienden) |
| Controle | Juiste plek. De melding is een zwevend paneel rechtsboven dat het veldenpaneel bedekt. | houden; de meldingen van het gekozen element bovenaan het veldenpaneel (B94 zegt dat al) |
| Ongedaan maken, opnieuw | Twee grote iconknoppen tussen Controle en Voorbeeld. | verplaatsen naast de opslagstatus, kleiner |
| Voorbeeld | Nuttig. De dialoog toont geen huisregels en geen extra drukwerk. | houden, tabs volgen de onderdelen |
| Sneltoetsen | Een knop voor iets wat alleen toetsenbordgebruikers nodig hebben, en die kennen `?`. | verplaatsen naar het naammenu |
| Printen | Goed. | houden |

### Linkerkolom

| Functie | Wat er mis is | Oordeel |
| --- | --- | --- |
| Tabs als tegelraster | Met alle onderdelen aan zijn het vijf tegels in drie rijen, met "Doos en extra's" over twee regels. Stijl is een tab met één item ("Kleuren"). | herontwerpen als één rij van vier tabs; Stijl weg |
| "Onderdelen kiezen of overslaan" | Tekstlink naar dezelfde dialoog als de editienaam. | samenvoegen in Editie |
| "Woorden van je editie" | Tekstlink die een dialoog opent; op telefoon het eerste wat je ziet, nog boven het bord. | samenvoegen in Editie |
| Minibord | Goed, met echte verhoudingen. De kolom scrolt bij laden naar het gekozen vak, waardoor de tabs half buiten beeld staan. | houden, scroll alleen binnen de lijst |
| "Wisselen met…" plus uitleg | Een grote knop met twee regels tekst voor een handeling die je zelden doet, permanent onder het bord. | verplaatsen naar het menu in de paneelkop van een straat, station of nutsbedrijf; slepen en W blijven |
| Lijst per bordzijde | Goed, met kleur en stip. | houden |
| Kaarttegels | Goed sinds de eerste woorden erin staan. "Kans: achterkant" is een losse rij én een schakelaar boven het voorbeeld. | houden; de achterkant als tegel aan het begin van de stapel, zelfde vorm |
| Kaartcollect-kaart (telefoon) | Kaart "Maak je editie samen" bovenaan de lijst, altijd. | weghalen uit de lijst; alleen een rij "Van vrienden (n)" als er iets binnen is |

### Editie-instellingen, woorden en stijl

| Functie | Wat er mis is | Oordeel |
| --- | --- | --- |
| Dialoog Instellingen | Een kopie van Nieuwe editie (B72), 2200 px hoog op telefoon. Het thema kies je hier zonder het bord te zien, want de dialoog dekt het af. | samenvoegen in Editie, met het bord live ernaast |
| Dialoog Woorden | Mooi ingedeeld, maar met kleurstreepjes boven elk blok (B87 haalde de kleurbalk weg). Bevat drie dingen die ook ergens anders staan: de munt (ook "Valuta" in Instellingen), de namen van de belastingvakken (ook "Naam" in het paneel van dat vak) en de hoeken (ook naam, korte tekst en foto in het paneel van de hoek). Zegt "De bedragen blijven zoals in het origineel", wat met B132 niet meer klopt. | samenvoegen in Editie, sectie Woorden; belasting en hoeken eruit (die staan bij het vak zelf) |
| Valuta en "Naam van de munt / Teken" | Twee plekken voor één ding: een keuzelijst met vier munten en daarnaast een vrije naam en een vrij teken. | samenvoegen tot één veld "Munt" met de vier als snelkeuze en "eigen munt" erbij |
| Tab Stijl | Een hele tab voor één item. Laat wel het hele bord zien, en dat werkt goed voor kleuren. | samenvoegen in Editie, sectie Uiterlijk; het hele bord in het midden blijft |
| Accentkleur | De standaard toont "Inkt" als gekozen, maar de pijlen bij Start zijn rood (Klassiek gebruikt `secondaryAccent`). De uitleg zegt dat het accent de pijlen kleurt. | herontwerpen: toon wat er echt staat |
| Groepskleur | Op twee plekken (straat en Stijl), met verschillende bediening (inline palet tegenover lijst met hexwaarden). | houden op beide plekken, maar hetzelfde onderdeel, met "geldt voor de hele groep Bruin" erbij |
| Thema | Alleen bij aanmaken en in Instellingen, zonder groot voorbeeld. | verplaatsen naar Uiterlijk, met het bord live |

### Veldenpaneel

| Functie | Wat er mis is | Oordeel |
| --- | --- | --- |
| Opbouw | Volgorde verschilt per type: bij een straat Naam, Plaats, Foto, Prijs, Kleur; bij een kaart Verhaal, Standaardkaart, Bedrag, Foto; bij het doosdeksel Naam, lagen, Foto. Er zijn geen kopjes, dus je ziet niet waar de foto begint. | herontwerpen met vaste secties |
| Foto-blok | Drie regels uitleg (optioneel, slepen, plakken met ⌘V), ook op telefoon waar ⌘V en slepen niet bestaan. "Foto plakken" loopt op 1440 px buiten het paneel (live; de fix op main laat de knoppen omslaan). | herontwerpen: één knop "Foto kiezen", plakken als tweede knop alleen waar het klembord werkt, uitleg in één regel |
| Foto op bordmidden en doosdeksel | Drie routes naar een foto in het midden: "Naam met foto", "Achtergrondfoto" en de laag "Foto toevoegen". Op het doosdeksel twee: de foto van het element en een fotolaag. | samenvoegen in sectie Afbeelding met één keuze: wat staat er (naam, naam met foto, logo) en wat ligt eronder (bordgroen, foto); extra lagen als laatste |
| Hoekvak | Naam, Korte tekst en een leeg "Verhaal" waarvan niet te zien is wat het doet. Dezelfde velden staan in de dialoog Woorden. | houden in het paneel, weg uit Woorden; "Verhaal" uitzoeken of weghalen |
| Kaart: standaardkaart | Grijs blok met de standaardtekst en "Terugzetten", plus "Terug naar standaard" onderaan: twee knoppen voor bijna hetzelfde. | herontwerpen: standaardtekst inklapbaar onder het tekstveld, met één "Standaard" |
| Bedrag op de kaart | Leeg veld terwijl de kaart een bedrag heeft. `bedragen-finish` lost dat op en zet alle bedragen in een blok "Bedragen". | houden, als sectie Bedragen |
| Prijs · vast | Losse regel tussen foto en kleur. | verplaatsen naar Bedragen |
| Biljet: banknaam | Staat bij elk biljet, telt als 1/7 aangepast (Heeten 9). Geldt voor alle biljetten. | verplaatsen naar Editie, Woorden ("Naam van de bank") |
| Pion verwijderen | Rode-achtige knop onderaan, naast "Terug naar standaard". | verplaatsen naar het menu van de paneelkop |
| Spelregelboekje, huisjes, dobbelstenen | Paneel met alleen een foto; de ondertitel toont de sleutel `editor.kind_rulesBooklet`. Bij het boekje is niet te zien waar die foto komt. | houden, met een zin waar de foto staat |
| Terug naar standaard | Altijd zichtbaar als grote knop, meestal uitgeschakeld en grijs. Daarnaast "Terugzetten" bij kleur en standaardkaart, en "Alle kleuren terugzetten". | herontwerpen (zie patroon in 3.5) |

### Overig in de editor

| Functie | Wat er mis is | Oordeel |
| --- | --- | --- |
| Samen maken, dialoog | Twee rode knoppen ("Kopieer link" en "Maak het plaatje"), als enige dialoog een kleurstrook bovenaan, en de bijdragen staan los van het element waar ze bij horen. | herontwerpen als sectie in Editie (link, plaatje, beheer) plus bijdragen in het veldenpaneel |
| Plaatje voor de groepsapp | Lijkt op de PNG van de uitnodiging op de printpagina, maar staat in een andere hoek van de site. | houden in Samen maken; op de printpagina bij de uitnodiging verwijzen |
| Voorbeeld | Geen extra drukwerk, geen huisregels. | houden, aanvullen |
| Sneltoetsen | Prima dialoog. | houden, ingang verplaatsen |
| Telefoon, elementscherm | Twee terugpijlen boven elkaar (kop en element), en geen Printen. Op main opgelost met een Meer-menu. | houden met het naammenu als Meer-menu |

### Openbare kant

| Functie | Wat er mis is | Oordeel |
| --- | --- | --- |
| Landing | Levendig en duidelijk (B103). Samen maken en het extra drukwerk staan er niet op; de Thuisprint-kaart zegt "vouwkaart", wat na B134 niet meer klopt. | houden, aanvullen |
| Sjabloonstrook op de landing | Goed. | houden |
| Nieuwe editie | Twee rasters met plaatjes achter elkaar (sjablonen en thema's) en elf vinkjes. De knop staat helemaal onderaan. Een sjabloon kiest al een thema, dus de themakeuze daarna voelt dubbel. | herontwerpen: sjabloon, naam en taal; thema en onderdelen ingeklapt met wat het sjabloon koos; vaste knop |
| Mijn edities | Rustig. De kaart vertelt niet wat er klaarstaat (PDF's, bijdragen) en heeft geen snelle weg naar Printen. | herontwerpen: statusregels en twee acties op de kaart |
| Printpagina | Elf rijen van gelijke zwaarte, elk met "Maken". De hoofdknop staat onder alle rijen. Geen editienaam. Proefvel ziet eruit als een onderdeel. Huisregels zijn onzichtbaar (zitten in de kaarten). | herontwerpen |
| Deelpagina voor vrienden | Goed. | houden |

### Woorden (B90)

- "Terug naar standaard", "Terugzetten" en "Alle kleuren terugzetten" naast elkaar. Voorstel: "Standaard" bij een veld, "Terug naar standaard" voor een element.
- "Foto toevoegen (optioneel)", "Foto kiezen", "Andere foto kiezen" en de laag "Foto toevoegen". Voorstel: "Foto kiezen" en "Andere foto"; "optioneel" weg, het hele paneel is optioneel.
- "Klaar" sluit dialogen, "Sluiten" sluit Controle en Voorbeeld. Voorstel: "Sluiten" overal, of geen knop bij een paneel dat geen dialoog meer is.
- "Voorbeeld" is drie dingen: de dialoog in de editor, de voorbeeldeditie ("Voorbeeld bekijken") en een sjabloonvoorbeeld. Voorstel: in de editor "Voorbeeld", op de openbare kant "Bekijk een ingevulde editie" en "Bekijk dit sjabloon".
- "Doos en extra's" in de editor, "Extra drukwerk" in het besluit en losse namen op de printpagina. Voorstel: tab "Doos en extra's", groep "Extra drukwerk" op de printpagina.

## 3. Voorgestelde opbouw

### 3.1 De editor als één gereedschap

Drie kolommen blijven (B93): links waar je bent, midden wat je maakt, rechts wat je eraan verandert. Wat verandert, is dat alles wat voor de hele editie geldt ook een plek in dat model krijgt.

Kop (64 px, één regel):

```
[logo] ‹ Mijn edities | Testdorp ▾ ●   Opgeslagen in deze browser · Inloggen   ↶ ↷        [Controle: 2] [Voorbeeld] [Printen]
```

- De naam opent een menu: Editie-instellingen, Samen maken (met teller), Sneltoetsen, Dupliceren. De rode stip op de naam betekent: er wachten bijdragen.
- Ongedaan maken en opnieuw staan klein naast de opslagstatus. Ze horen bij de geschiedenis van de editie, net als opslaan.

Linkerkolom:

1. Rij "Editie" met een kleine miniatuur, de naam, thema en taal. Klik kiest de editie als element.
2. Tabs in één rij: Bord, Kaarten, Geld, Doos en extra's (alleen wat aan staat), met de telling.
3. Per tab de navigatie zoals nu (minibord en lijst, kaarttegels, biljetten, doos).
4. Alleen als er iets binnen is: rij "Van vrienden (3)", die naar het eerste element met een bijdrage springt.

Midden: een werkbalk boven het voorbeeld met de schakelaar van het element (Vak / Eigendomsbewijs, Voorkant / Achterkant) en de zoom. Bij Editie staat hier het hele bord, zodat thema, kleuren en woorden live te zien zijn.

Rechts: het veldenpaneel, of bij Editie het editiepaneel.

### 3.2 Eén plek voor de editie

Het editiepaneel vervangt de dialogen Instellingen en Woorden en de tab Stijl. Secties, altijd in deze volgorde, met een inhoudsopgave bovenaan (springlinks):

| Sectie | Velden | Komt van |
| --- | --- | --- |
| Algemeen | Naam, ondertitel (met "tonen"), taal van bord en kaarten, munt (euro, M, dollar, pond of eigen naam en teken) | Instellingen, Woorden, bordmidden |
| Uiterlijk | Thema (drie tegels), accentkleur, kleur per straatgroep (acht rijen) | Instellingen, tab Stijl |
| Woorden | Huis en huizen, hotel en hotels, de gevangenis in een zin, namen van de twee kaartstapels, naam van de bank | Woorden, biljetpaneel |
| Onderdelen | Het spel: eigendomsbewijzen, Kans en Algemeen Fonds, speelgeld, pionnen, doosdeksel, huisregels. Extra drukwerk: spelregelboekje, huisjes en hotels, dobbelstenen, uitnodiging. | Instellingen |
| Bord | Modern vierkant of andere maat | Instellingen |
| Samen maken | Link, kopiëren of delen, plaatje voor de groepsapp, sluiten, nieuwe link, alles verwijderen | dialoog Samen maken |

Waarom een paneel en geen dialoog: het bord blijft zichtbaar terwijl je thema en kleuren kiest, op telefoon is het een gewoon scherm met terugpijl in plaats van een dialoog van 2200 px, en de editie gedraagt zich zoals elk ander element (kiezen, wijzigen, Controle-meldingen bovenaan).

De editienaam in de kop opent het naammenu; "Editie-instellingen" kiest het editiepaneel. Een tweede klik op de rij "Editie" links doet hetzelfde.

### 3.3 Veldenpaneel per elementtype

Kop van het paneel: titel, soort, een stip bij aangepast, en rechts een menu (⋯) met "Terug naar standaard" en wat bij het type hoort ("Wisselen met…", "Pion weghalen", "Kaart weghalen" voor B135).

Daaronder eerst de Controle-meldingen van dit element (geel, met icoon), dan de secties. Een sectie staat er alleen als het type hem heeft.

| Type | Tekst | Afbeelding | Bedragen | Stijl |
| --- | --- | --- | --- | --- |
| Straat | Naam, Plaats (groep) | Foto, In kader / Hele vak | Prijs, huren, hypotheek, huis en hotel | Groepskleur (groep) |
| Station | Naam | Icoon of foto | Prijs, huren | |
| Nutsbedrijf | Naam | Icoon of foto | Prijs | |
| Belasting | Naam | Icoon (B136) | Bedrag | |
| Kans- en Fondsvak | (naam volgt de stapel, alleen lezen met link naar Woorden) | Icoon (B136) | | |
| Hoek | Naam, korte tekst | Icoon of foto | Salaris (Start) | |
| Midden van het bord | Naam en ondertitel (dezelfde velden als Algemeen) | Wat staat er: Naam, Naam met foto, Logo; Achtergrond: bordgroen of foto | | Vrije lagen |
| Kaart | Verhaal met variabelen, standaardtekst inklapbaar, Waarvoor | Foto | Bedrag op de kaart | |
| Kaartrug | | Foto of patroon | | Vrije lagen |
| Biljet | | Foto in het ovaal | Aantal (vast) | Kleur |
| Pion | Naam | Foto | | |
| Doosdeksel | Titel | Achtergrond: thema of foto | | Vrije lagen |
| Huisregels | Regels | Foto | | |
| Spelregelboekje, huisjes en hotels, dobbelstenen | | Foto, met een zin waar hij komt | | |
| Uitnodiging | Tekst | Foto | | |

Als laatste, alleen als er iets is: "Van vrienden", met per bijdrage de voornaam, het voorstel, "Toepassen" en "Weigeren". Toepassen vult het veld in deze secties; je ziet het meteen in het voorbeeld.

Elementen met een groepsveld (Plaats, Groepskleur) tonen een label "geldt voor alle 3 bruine straten", zoals nu de uitleg onder Plaats doet, maar korter.

### 3.4 Afbeelding als één sectie

Eén bediening voor alles wat beeld is (B124, B125, B130, B136):

- Een rij keuzes, alleen die het type heeft: Standaard (icoon of tekst), Ander icoon, Eigen afbeelding, Foto. Het bordmidden heeft Naam, Naam met foto, Logo.
- Na een foto: In kader / Hele vak (waar het kan), zoom, kwartslag, zwart-wit. Plakken alleen als tweede knop als het klembord werkt; op een telefoon geen toetsenbordhint.
- Achtergrond (bordmidden, doosdeksel, kaartrug): thema, patroon of foto.
- Vrije lagen staan onder Stijl, met "Tekst toevoegen" en "Foto toevoegen", omdat ze extra's zijn bovenop het element.

### 3.5 Terug naar standaard

- Per veld: een klein knopje "Standaard" rechts in het label, alleen zichtbaar als het veld afwijkt. Bij bedragen staat de standaardwaarde ernaast in mono ("standaard € 60, 48 tot 72").
- Per element: "Terug naar standaard" in het menu van de paneelkop, met bevestiging als er een foto bij is.
- Per editiesectie (Uiterlijk, Woorden): "Alles in deze sectie terug naar standaard" onderaan de sectie, als tekstknop.
- Standaardtekst bij kaarten: inklapbaar blok "Standaardtekst" onder het veld, met dezelfde knop "Standaard".

### 3.6 Telefoon

- Overzicht: kop met logo, naam ▾ en Printen. Daaronder de rij Editie, de tabs, het minibord (vergrootbaar, zoals op main) en de lijst. Onderbalk: Controle, ongedaan maken, opnieuw, Voorbeeld.
- Element: kop met terugpijl en de naam van het element (de kop van de editor maakt plaats, zodat er één terugpijl is). Voorbeeld boven (40%, zoals op main), daaronder de secties als inklapbare blokken met de eerste open. Onderbalk: vorige, Controle, volgende.
- Editie: zelfde scherm, met de secties als inklapbare blokken en het bord klein bovenaan.
- Het naammenu is het Meer-menu van main, met dezelfde items als op desktop.

### 3.7 Openbare kant

Landing:
- Stap 4 "Print en plak" krijgt een regel over extra drukwerk (boekje, huisjes, dobbelstenen, uitnodiging).
- Een vijfde blok in "Wat er in de sets zit": "Maak het samen", met de deelpagina als tekening.
- De Thuisprint-kaart volgt B134 (dubbelzijdig per pagina).

Nieuwe editie:
- Boven: "Begin met…" (de acht sjablonen, kleiner, vier per rij).
- Dan alleen Naam en Taal.
- Daaronder twee ingeklapte regels met wat al gekozen is: "Thema: Klassiek · Wijzigen" en "Onderdelen: bord, eigendomsbewijzen, kaarten · Wijzigen". Bordmaat zit in het ingeklapte blok onderdelen als laatste regel.
- Rechts (desktop) of onderaan vast (telefoon): een kaart met het bord van de keuze en de knop "Editie maken".

Mijn edities:
- Per kaart: miniatuur, naam, waar hij staat, en statusregels als ze er zijn: "3 nieuwe bijdragen", "Drukkerij-set klaar tot 28 nov".
- Twee acties op de kaart: Openen (klik op de kaart) en Printen; het menu houdt Naam wijzigen, Dupliceren, Verwijderen.

Printpagina:
- Kop: miniatuur en naam van de editie, "Terug naar de editor", schakelaar Drukkerij-set / Thuisprint-set.
- Eerst een smalle kaart "Eerst proberen: proefvel" met één knop.
- Groep "Het spel" (bord, kaarten en eigendomsbewijzen met huisregels als regel erbij, speelgeld, pionnen, doosdeksel) en groep "Extra drukwerk".
- Per rij blijft het vinkje en de status; "Maken" per rij wordt een tekstknop, want de set-knop is de hoofdroute.
- Onderdelen die in de editie uit staan, staan in één regel onder de groep: "Niet in deze editie: dobbelstenen. Aanzetten in de editor."
- Een vaste balk onderaan met "Drukkerij-set maken" en daarna "Drukkerij-set downloaden (ZIP)", met de serveruitleg in één regel erboven.

### 3.8 Nieuwe functies vanaf nu

Een checklist voor elk nieuw verzoek, zodat B138 in het werk zit:

1. Geldt het voor de hele editie? Dan is het een veld in een sectie van het editiepaneel.
2. Geldt het voor één element of een groep? Dan is het een veld in een van de vier secties van het veldenpaneel, met het groepslabel als het voor een groep geldt.
3. Is het een handeling op één element (wisselen, weghalen, toevoegen)? Dan staat het in het menu van de paneelkop.
4. Is het een handeling op de hele editie? Dan staat het in het naammenu.
5. Is het drukwerk? Dan is het een rij in een groep op de printpagina en een onderdeel onder Onderdelen.
6. De kop krijgt er niets bij.

B135 (extra kaarten) past zo: een tegel "Kaart toevoegen" aan het eind van elke stapel in de lijst, en "Kaart weghalen" in het menu van de paneelkop.

## 4. Schermen

In `docs/design/integratie/` (open `index.html`; dezelfde schermen als afbeelding in `na/`):

| Bestand | Wat |
| --- | --- |
| `editor-desktop.html` | Editor op 1440 px, straat gekozen, met de nieuwe kop, de rij Editie en het veldenpaneel met secties |
| `editie-instellingen.html` | Editiepaneel op 1440 px, met het hele bord in het midden |
| `veldenpaneel.html` | Het veldenpaneel voor zes types naast elkaar: straat, station (icoon), kaart, bordmidden, biljet, pion |
| `editor-telefoon.html` | Telefoon op 390 px: overzicht, element, naammenu |
| `printpagina.html` | Printpagina op 1440 en 390 px |
| `mijn-edities.html` | Mijn edities en Nieuwe editie op 1440 px |

Voor-schermen in `docs/design/integratie/voor/`. De belangrijkste:

| Nu | Wat je ziet |
| --- | --- |
| `d-editor-start.jpg` | Kop over twee regels, tabs half weg, foto-knoppen buiten het paneel |
| `d-editor-style.jpg` | Tab Stijl met één item |
| `d-dlg-instellingen.jpg`, `d-dlg-woorden.jpg` | Twee dialogen voor de editie |
| `d-editor-center.jpg` | Drie routes naar een foto in het midden |
| `d-editor-corner-start.jpg` | Hoek met Korte tekst en een leeg Verhaal |
| `d-editor-doos-10.jpg` | Spelregelboekje met `editor.kind_rulesBooklet` |
| `d-dlg-samen-maken-link.jpg` | Twee rode knoppen in één dialoog |
| `d-print.jpg` | Printpagina, hoofdknop onder elf rijen |
| `m-editor-overzicht.jpg`, `m-editor-element.jpg` | Telefoon live: Woorden boven het bord, twee terugpijlen |

## 5. Bouwplan

In deze volgorde, elk als eigen branch, desktop en telefoon samen. Na elke stap de voor- en na-schermen naast elkaar.

1. Patronen eerst (klein, raakt alles): "Standaard" per veld, "Terug naar standaard" in een paneelmenu, één woord per handeling (zie Woorden), uitgeschakelde knoppen weg. Vertaalsleutels van het extra drukwerk fixen.
2. Veldenpaneel met vaste secties. `element-panel.tsx` (1190 regels) splitsen in `PanelHeader`, `TextSection`, `ImageSection`, `AmountSection`, `StyleSection`, `FriendsSection`, met een tabel per type zoals in 3.3. `bedragen-finish` (B132) en `feat/eigen-iconen` (B136) eerst mergen; die hebben al een blok "Bedragen" en een sectie "Afbeelding", dus dit is afmaken en gelijktrekken.
3. Editiepaneel. De editie als element (`edition` in de catalogus), paneel met de secties uit 3.2. Dialogen `settings-dialog`, `words-dialog` en de tab `style` weg. Banknaam en munt verhuizen. Hoeken en belastingnamen alleen bij het vak.
4. Kop en naammenu. Kop op één regel, naammenu (het Meer-menu van main wordt het menu voor alle breedtes), ongedaan maken naast de status, Wisselen naar het paneelmenu.
5. Samen maken in de opbouw. Sectie in het editiepaneel, bijdragen in het veldenpaneel, rij "Van vrienden" links, stip op de naam. Eén primaire knop.
6. Voorbeeld aanvullen met huisregels en extra drukwerk.
7. Printpagina volgens 3.7.
8. Mijn edities en Nieuwe editie volgens 3.7.
9. Landing aanvullen.
10. B135 (extra kaarten) in de nieuwe opbouw.

Besluiten die een nieuwe rij nodig hebben (append-only, met "Vervangt"):

| Nieuw | Vervangt of vult aan | Inhoud |
| --- | --- | --- |
| Kop | vervangt de kop uit B91 | Naam met menu, status met ongedaan maken, Controle, Voorbeeld, Printen |
| Editiepaneel | vervangt de instellingendialoog uit B91 en B99 ("Onderdelen kiezen of overslaan"), de dialoog uit B126, de tab Stijl uit B130 | De editie is een element met een paneel in vaste secties |
| Veldenpaneel | vult B93 aan | Vaste secties Tekst, Afbeelding, Bedragen, Stijl, Van vrienden |
| Terug naar standaard | vervangt "Elk element heeft Terug naar standaard" uit B93 | Per veld "Standaard", per element in het paneelmenu |
| Samen maken | vult B128 aan | Beheer in het editiepaneel, bijdragen per element |
| Munt | vervangt de valutakeuze uit B38 en B72 en de munt uit B126 | Eén veld Munt |
| Banknaam | vult B93 (editor-gaps) aan | Banknaam is een editiewoord |
| Printpagina | vult B95 en B117 aan | Twee groepen, proefvel apart, vaste actiebalk, editienaam in de kop |
| Nieuwe editie | vervangt de opbouw uit B72 | Sjabloon, naam en taal; thema en onderdelen ingeklapt |
| Checklist | vult B138 aan | De vragen uit 3.8 bij elke nieuwe functie |

## 6. Bugs onderweg

Gezien op printopoly.nl op 21 november, tenzij anders vermeld.

1. Veldenpaneel van spelregelboekje, huisjes en hotels en dobbelstenen toont de vertaalsleutel als ondertitel: `editor.kind_rulesBooklet`, `editor.kind_foldModels`, `editor.kind_dice` (`d-editor-doos-10.jpg`).
2. Editorkop breekt op 1440 px over twee regels; de bedieningsknoppen staan op een eigen rij (`d-editor-start.jpg`).
3. De linkerkolom scrolt bij laden naar het gekozen vak, waardoor de tabs Bord en Kaarten half boven de rand staan (1440 en 390 px).
4. "Foto plakken" loopt rechts buiten het veldenpaneel op 1440 px (live; op main mogen de knoppen omslaan, op desktop niet nagekeken).
5. Accentkleur toont standaard Inkt (`#1B1F24`) als gekozen, terwijl de pijlen bij Start en Naar de gevangenis rood zijn (`secondaryAccent` van Klassiek). De uitleg zegt dat het accent de pijlen kleurt.
6. Dialoog Woorden zegt bij Belasting "De bedragen blijven zoals in het origineel"; met B132 klopt dat niet meer.
7. Kaarttekst in de themaminiaturen (Nieuwe editie, Instellingen) en in de kaartenminiatuur op de printpagina mist het munteken: "Je krijgt 200 van de bank" waar de kaart zelf "€ 200" zegt.
8. Voorbeeld (V) heeft geen tabs voor huisregels, spelregelboekje, huisjes en hotels, dobbelstenen en uitnodiging.
9. Hoekvak Start toont naast "Korte tekst" een leeg veld "Verhaal"; niet te zien wat dat op een hoek doet.
10. Toetsenbordhints ("druk op ⌘V", "of druk op W") staan ook op een telefoon.
11. Banknaam telt als aangepast op één biljet (1/7), terwijl hij voor alle biljetten geldt (Heeten 9, nog open).
12. Telefoon (live): Voorbeeld, Woorden en Samen maken zijn alleen via losse links of niet te bereiken; opgelost op main (Meer-menu), nog niet gedeployed.
13. Printpagina noemt de editie nergens, en de huisregels staan niet als onderdeel in de lijst (Heeten 13, nog open).
14. B95 belooft dat gemaakte bestanden 7 dagen onder Mijn edities staan; daar is niets van te zien.

Testdata op productie: editie "Testdorp Integratie" (in de browser van de testsessie) met een Samen maken-link die op 21 december vanzelf verloopt.
