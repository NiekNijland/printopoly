# Vindbaarheid: staat alles waar je het zoekt?

Stand van 22 november 2026, release d1daef8 op printopoly.nl. Antwoord op de vraag van Niek uit B182: "Staat alles op de plek waar je het zou verwachten?"

Zo is er gekeken: met headless Chrome door de live site op 1440 px (desktop), 820 px (tablet, aanraken) en 390 px (telefoon, aanraken), met een eigen editie "IA-audit Dorp" uit het sjabloon Je dorp of wijk. Daarna zijn alle onderdelen aangezet om de lijst Doos en de printpagina vol te zien. Samen maken is niet live gebruikt (gedeelde limiet per IP), de vriendenpagina ook niet; daarvoor gelden de verslagen van ronde 3. Naast de site zijn de verslagen van ronde 3 en 4 gelezen, de integratie-evaluatie (B138) en de besluiten B141 tot en met B186.

Schermafbeeldingen van nu staan in `docs/design/vindbaarheid/voor/` (voorvoegsel `d-` is 1440 px, `t-` is 820 px, `m-` is 390 px). De mockups van het voorstel staan als HTML in `docs/design/vindbaarheid/`; `index.html` linkt alles.

Niets in dit document is gebouwd. Het voegt geen functies toe (B182): elk voorstel verplaatst, hernoemt of laat iets zien wat er al is.

## Samenvatting

Grotendeels wel. De opbouw uit B138 houdt stand: testers vinden de kop, de lijst, het veldenpaneel en de printpagina zonder hulp, en de nieuwe dingen uit ronde 3 (zoekveld, groot bord, Midden van het bord als rij, aantal pionnen) werden in ronde 4 gevonden en gebruikt. Wat niet gevonden werd, valt in vijf soorten:

1. Een onderdeel dat uit staat, bestaat in de editor niet. Wie de uitnodiging, de pionnen of het speelgeld zoekt in een sjabloon zonder die onderdelen, ziet in de tab Doos niets en geen tab Geld. De enige weg is Editie, dan omlaag naar Onderdelen. Hans en Raj zochten de uitnodigingstekst, Fatima vond pionnen "nummers", Lisa vond niet hoe je pionnen weghaalt.
2. Werkt wel, maar niets zegt het. Namen plakken in de lijst ("het mooiste van de editor", Kim) staat nergens. Op de naam in de lijst klikken zet je in een tekstveld, en alleen het kleurvlakje opent het vak (Hans). Dupliceren staat in het naammenu, maar Sophie zocht het bij de titel en vond het niet.
3. Eén ding heeft op twee plekken twee namen. "Per set" in de editor heet "Volledige bank" op de printpagina (Sophie). "Editie maken" en "Nieuwe editie" staan als twee knoppen naast elkaar op Mijn edities. "Bord" is een tab en ook een sectie in het editiepaneel (de bordmaat). "Verhaal" is de kaarttekst en ook het verhaal op een eigendomsbewijs. Mijn edities heeft een menu met drie streepjes, de editor een menu met drie puntjes.
4. Vaktaal: dpi, variabelen, vinylsticker, SRA3, uitlijntest, afloop, "binnen 20%" (Ria, Bert, Mila, Carlos, Joost).
5. Een paar wegen zijn te lang. Een foto kost twee klikken ("Foto", dan "Foto kiezen"). Onderdelen aanzetten zit vier secties diep. "Aanzetten in de editor" op de printpagina opent de editor bovenaan. Na Dupliceren blijf je op de lijst. Controle zegt wat er mis is, maar brengt je er niet heen.

De tien plaatsingswijzigingen in §4 lossen samen het grootste deel op, zonder nieuwe knoppen in de kop en zonder nieuwe dialogen.

## 1. Featurekaart

Per functie: waar hij nu zit, als klikpad per apparaat (D is 1440 px, T is 820 px, M is 390 px; "zelfde" betekent als op desktop), waar testers hem zochten of verwachtten, en een oordeel. Oordelen: goed, verplaatsen, samenvoegen, beter labelen, beter zichtbaar maken, weghalen.

### 1.1 Openbare kant en kop

| Functie | Waar nu | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Nieuwe editie beginnen | D: kop "Editie maken", landing "Editie maken", Mijn edities "Nieuwe editie". T: zelfde. M: menu ☰, landing | Niemand had moeite. Wel twee namen op één scherm (Mijn edities toont "Editie maken" in de kop en "Nieuwe editie" in de band) | beter labelen: overal "Nieuwe editie", "Editie maken" alleen als laatste knop van het formulier |
| Mijn edities | D: kop, link. T en M: mapicoon zonder tekst in de kop | eigen bevinding: het icoon heeft geen zichtbaar label, en wie de site voor het eerst op telefoon of tablet gebruikt (Bert, Durk) moet raden wat de map is | beter labelen: op T en M "Mijn edities" als tekst naast het icoon, of in het menu ☰ bovenaan |
| Voorbeeld van een ingevulde editie, sjablonen bekijken | landing, Nieuwe editie, per sjabloon "Bekijk dit sjabloon" | goed gevonden (Bert, Joost) | goed |
| Printgids | kop, voet, printpagina rechts | Bert: de gids noemt de kopieerwinkel maar één keer. Carlos: "Go" in plaats van Start | goed (de inhoud valt onder §2) |
| Inloggen met Google | kop, banner Mijn edities, opslagstatus in de editor | goed; Durk en Kim wilden vooral weten dat het werk bewaard is | goed |
| Taal NL / EN | kop | goed | goed |

### 1.2 Nieuwe editie

| Functie | Waar nu | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Sjabloon kiezen | bovenaan, "Begin met…", Leeg als brede tegel | goed (Bert: "in een halve seconde in de editor") | goed |
| Naam | onder alle sjablonen. D: op 1300 px van boven, na twee schermen scrollen. M: na vier schermen | Bert zag pas na scrollen dat hij een naam kon geven; zijn editie heette "Onze editie" (R4). Kim: autofocus slaat de skiplink over | verplaatsen: naamveld in de kaart rechts, boven "Editie maken" (op M in de vaste balk). Zie mockup `nieuwe-editie.html` |
| Taal, thema, onderdelen, munt | ingeklapte regels onder de naam met "Wijzigen" | Carlos koos per ongeluk M en zette het in de editor terug; Lisa en Henk verwachtten speelgeld en deksel aan bij Leeg (R3) | goed; de regel Onderdelen noemt wat ontbreekt: "bord, eigendomsbewijzen, kaarten · geen geld, pionnen, deksel" |
| Uitleg bovenaan | "Alles hieronder kun je later aanpassen door in de editor op de naam te klikken" | klopt niet meer: de naam opent een menu (B144), de instellingen zitten in de rij Editie | beter labelen: "Alles hieronder pas je later aan onder Editie, bovenaan links in de editor." |

### 1.3 Mijn edities

| Functie | Waar nu | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Openen, Printen | twee knoppen op de kaart | goed (Joost, Ria, Hans) | goed |
| Dupliceren | D, T, M: tekstknop "Dupliceren als nieuwe editie" onder de knoppen | Sophie vond hem hier wel. Na dupliceren blijf je op de lijst met dezelfde miniatuur; de kopie heet "(kopie) (kopie)" | beter zichtbaar maken: na dupliceren de kopie openen in de editor met het naamveld actief (in Algemeen) |
| Naam wijzigen, Verwijderen | menu ☰ op de kaart | goed gevonden, maar het icoon is ☰ en in de editor ⋯ | beter labelen: ⋯ zoals overal in de editor, en Dupliceren ook in dit menu |
| Status van gemaakte sets | regel op de kaart | goed ("bijna iedereen", R4) | goed |

### 1.4 Editorkop en naammenu

| Functie | Waar nu | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Naammenu | D: klik op de naam ▾ (Editie-instellingen, Samen maken, Sneltoetsen, Dupliceren). T: plus Voorbeeld. M: plus Voorbeeld en Naar Mijn edities | Sophie zocht Dupliceren "bij de titel" en zag het niet: het menupijltje is klein. Pim zocht Samen maken eerst als knop in de kop (R3) | goed als plek (B143 punt 4); beter zichtbaar maken: Samen maken met een korte regel eronder ("Vrienden sturen namen en foto's"), Dupliceren met "Kopie voor een ander stel of een andere groep" |
| Opslagstatus | D: kop. T en M: bovenaan de lijst ("Alleen in deze browser · Inloggen met Google") | Durk en Kim misten een duidelijk "bewaard". Bert schrok van de Safari-melding | beter labelen: na een wijziging kort "Bewaard op dit toestel"; de Safari-zin pas als er echt iets weg kan (UX 2, ronde 4) |
| Ongedaan maken, opnieuw | D en T: kop. M: onderbalk | goed (Lars: twaalf stappen) | goed |
| Controle | D en T: kop. M: onderbalk. Opent een paneel rechtsboven met alleen "Sluiten" | Bert zocht een kruisje rechtsboven. Sophie, Fatima en Joost misten een knop naar de oplossing | beter zichtbaar maken: per melding een knop die het veld opent ("Andere foto", "Naar Uiterlijk"), kruisje rechtsboven |
| Voorbeeld | D: kop. T: naammenu. M: onderbalk en naammenu | goed; Mila zag haar tekeningen alleen hier | goed; op M één plek (onderbalk), uit het naammenu |
| Sneltoetsen | naammenu, `?` | goed (Kim) | goed |
| Printen | kop, rood | goed | goed |

### 1.5 Linkerkolom

| Functie | Waar nu | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Rij Editie | bovenaan links, "Editie · Klassiek · Nederlands · €" | gevonden, maar pas als je weet dat de instellingen daar zitten; Hans scrolde lang naar Onderdelen | goed; beter labelen: tweede regel "Naam, thema, onderdelen, woorden" in plaats van "Klassiek · Nederlands · €", zodat je ziet wat erachter zit |
| Tabs Bord, Kaarten, Geld, Doos | onder de rij Editie, alleen gekozen onderdelen | Geld bestaat niet als speelgeld uit staat; niemand weet dan dat het kan | goed; zie Doos |
| Minibord, Bord vergroten | D: vast bovenaan de lijst. T: zelfde, kleiner. M: scrolt mee | Carlos (1366 × 768): je ziet twee vakken van de lijst. Op 1440 × 900 begint de lijst op 760 px; er staan drie vakken in beeld | verplaatsen: op schermen onder 900 px hoog het minibord inklapbaar tot één regel "Bord tonen" (UX 5 noemt dit ook) |
| Zoekveld | boven de lijst, blijft staan | goed (Joost, Lars, Fatima). De rij Midden van het bord valt er half onder (bug 28, ronde 4, nog live) | goed; bug 28 oplossen |
| Rij Midden van het bord | eerste rij van de lijst Bord | gevonden in ronde 4 (Sophie, Mila, Fatima, Willem) | goed |
| Naam typen in de rij, lijst plakken | elke rij is een tekstveld; plakken van meerdere regels vult de volgende vakken | Kim ontdekte plakken bij toeval. Fatima wilde het als functie, maar het bestaat. Ria wist niet dat stations worden overgeslagen. Hans: klikken op de naam opent het vak niet | beter zichtbaar maken: placeholder in het zoekveld "Zoek een vak, of plak een lijst met namen in een rij", en focus in een rij kiest ook het vak (paneel en voorbeeld volgen). Melding na plakken noemt wat werd overgeslagen |
| Kaarttegels, Kaart toevoegen | raster per stapel, tegel "+ Kaart toevoegen" aan het eind | goed (Lars, Sanne) | goed |
| Kans: achterkant | losse tekstrij onder elke stapel, en de schakelaar Voorkant / Achterkant boven het voorbeeld | niemand noemt hem; het is een rij zonder tegel na de tegel "Kaart toevoegen" | beter zichtbaar maken: de achterkant als eerste tegel van de stapel, met het patroon als miniatuur (B138 stelde dit al voor) |
| Doos | Doosdeksel, Pionnen, Huisregels, Spelregelboekje, Huisjes en hotels, Dobbelstenen, Uitnodiging: alleen wat aan staat | Hans vond de uitnodigingstekst niet (de uitnodiging stond aan, maar onderaan). Raj zocht hem in een editie waar hij uit stond (R3). Huisregels staan in Doos maar worden geprint met de kaarten | beter zichtbaar maken: onderdelen die uit staan als lichte rij onderaan ("Uitnodiging · niet in je set · Aanzetten"); Aanzetten zet hem aan en opent hem. De rij Huisregels krijgt "gaat mee met de kaarten" |
| Van vrienden | rij links als er iets wacht, rode stip op de naam | goed (Pim, R3) | goed |

### 1.6 Editiepaneel

Pad: D en T: rij Editie of naammenu › Editie-instellingen of E. M: rij Editie ›. Op D en T een lange kolom met springlinks; op M inklapbare blokken met een samenvatting.

| Sectie | Wat erin zit | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Springlinks | Algemeen, Uiterlijk, Woorden, Onderdelen, Bord, Samen maken | Bert zag niet in welke sectie hij stond. Hans: de balk dekt de eerste regel | beter zichtbaar maken: de link van de sectie in beeld dik, `scroll-padding` onder de balk |
| Algemeen | naam, ondertitel met Tonen, taal, munt | Sophie zette de datum in de naam en kreeg "Welkom bij Eva & Tim 14 mei 2027" in het boekje | beter labelen: onder Naam "Een datum of ondertitel zet je hieronder", Ondertitel heet "Ondertitel of datum" |
| Uiterlijk | thema, accent, kleur per straatgroep | Pim zocht het gekozen thema (R3). Sophie wist niet dat ze na een themawissel "Alles terug naar standaard" nodig had | goed als plek; bij een themawissel de vraag "Ook de kleuren van het thema gebruiken?" valt buiten B182 (gedrag). Wel: de knop "Alles in deze sectie terug naar standaard" direct onder de thema's tonen als er eigen kleuren zijn |
| Woorden | huis, hotel, station, nutsbedrijf, gevangenis, twee stapels, bank | Lars: gevangenis op twee plekken (woord en hoekvak). Carlos zocht vaste teksten | goed; onder "De gevangenis in kaartteksten" een link "Het hoekvak heet anders: naar het vak" |
| Onderdelen | elf vinkjes in twee groepen, Hoeveel geld? | Hans moest "naar beneden scrollen tot Onderdelen". Hans en Raj zochten de uitnodiging in Doos | verplaatsen: Onderdelen als tweede sectie, direct na Algemeen. Het bepaalt wat er in de lijst staat, dus het hoort vooraan. Vervangt de volgorde uit B145 |
| Bord | Modern vierkant of Andere maat | zelfde woord als de tab Bord | beter labelen: "Bordmaat" |
| Samen maken | link, plaatje, beheer | Pim zocht het eerst in de kop, Fatima en Sophie zagen de foutmelding onder de vouw | goed als plek; de melding naast de knop (bug 6) |

### 1.7 Veldenpaneel (alle elementen)

| Functie | Waar nu | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Kop met menu ⋯ | D: rechtsboven in het paneel. T: zelfde. M: in de bovenbalk, met de editie-items eronder | Lars vond Wisselen met… Kim: het menu begint op Terug naar standaard | goed; volgorde: eerst de handelingen (Wisselen met…, Pion weghalen), Terug naar standaard onderaan (UX 10) |
| Tekst | eerste sectie | Bert zocht "Tekst" bij een kaart en vond "Verhaal" | goed; zie §2 voor de labels |
| Afbeelding | Geen / Foto, daarna Foto kiezen en Plakken | Ria en Lisa: twee stappen. Op M is de sectie dicht, dus drie tikken | samenvoegen: "Foto" opent meteen de bestandskiezer (zoals Logo al doet, B179); de knop Foto kiezen verdwijnt tot er een foto is ("Andere foto") |
| Afbeelding op M | dichtgeklapt blok "Afbeelding +" | wie een foto wil, ziet in het dichte blok niet of er een foto is | beter zichtbaar maken: samenvatting in de kop van elk blok, zoals het editiepaneel al doet ("Afbeelding · geen foto", "Bedragen · € 60") |
| Bedragen | prijs, huur (ingeklapt "Huur, 6 regels · Tonen"), bouwkosten, hypotheek; kop "Bedragen binnen 20%" | Lars zocht een overzicht van alle huren. Fatima kreeg de grens pas na het typen | goed als plek; beter labelen: kop "Bedragen", met per veld "kies 48 tot 72" vooraf (staat al als "standaard € 60, 48 tot 72", in mono klein) |
| Stijl | groepskleur, lagen | Lars: groepskleur toont het verkeerde hex in Riso (bug 32) | goed |
| Eigendomsbewijs | schakelaar Vak / Eigendomsbewijs boven het voorbeeld | goed sinds B157 en B168 | goed |
| Van vrienden | onderaan, alleen bij een voorstel | niet getest in ronde 4 | goed |

### 1.8 Elementen met eigen vragen

| Element | Wat er nu staat | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Midden van het bord | Tekst: Naam, Ondertitel, Ondertitel tonen. Afbeelding: "Wat staat er in het midden?" Naam / Naam met foto / Logo, "Wat ligt eronder?" Bordgroen / Foto over het hele midden. Stijl: Extra lagen met "Tekst toevoegen" en "Foto toevoegen" | Carlos voegde per ongeluk een laag toe via "Foto toevoegen". Sophie: twee fotovelden. Carlos: "Bordgroen" bij een wit Strak-bord | beter labelen: "Foto toevoegen" bij lagen wordt "Extra foto erop", "Bordgroen" wordt "Bordkleur". Eén foto voor beide keuzes is gedrag en staat in UX 1 (B183) |
| Naam en ondertitel | staan in Algemeen én in het midden (zelfde velden, B145) | geen verwarring gemeld | goed; onder het veld in het midden "Ook onder Editie, Algemeen" |
| Doosdeksel | Tekst: Titel, Ondertitel, Ondertitel tonen, Eigen regels ("Kerst 2026, voor de hele familie") | Hans en Sophie: vreemd voorbeeld. "Titel" is hier wat elders "Naam" heet | beter labelen: "Titel op de doos" met als standaard de editienaam; placeholder zonder kerst ("Voor wie het spel is, of een datum") |
| Uitnodiging | Tekst: Kop, Regel boven de kop, Ondertitel tonen, Tekst op de uitnodiging | Hans vond de tekst niet. Mila: welk vak komt waar? Sophie: de regel onder de kop (de editienaam) is niet te wijzigen | beter labelen: velden in de volgorde van de kaart (Regel boven de kop, Kop, "Naam van de editie eronder" aan/uit, Tekst); "Ondertitel tonen" klopt niet, het is de editienaam |
| Pionnen | rij per pion, groepsveld "Aantal pionnen" in het paneel van elke pion | Fatima vond pionnen "nummers" en wist niet van foto en naam. Bert: Aantal pionnen staat bij één pion | beter zichtbaar maken: kop van de groep in de lijst "Pionnen · 8 van 8 · naam en foto per speler"; het aantal ook als keuze op die kop |
| Biljet | Tekst verwijst naar Woorden ("Naar de woorden") | goed | goed |
| Kaart | Tekst: Verhaal, Invoegen met uitleg over variabelen, Standaardtekst inklapbaar | Bert, Ria, Mila: "variabelen" en grijze chips zijn abstract | beter labelen (§2) |
| Huisregels | Tekst: Regels, Invoegen | Daan: lege huisregels kwamen in de set (R3) | goed |

### 1.9 Printpagina

| Functie | Waar nu | Gezocht of verwacht | Oordeel |
| --- | --- | --- | --- |
| Welke set | schakelaar Drukkerij-set / Thuisprint-set rechts in de kop; opent op Drukkerij-set | Bert ging naar de kopieerwinkel en koos Drukkerij. Ria, Mila, Joost begonnen op Drukkerij en wilden thuis printen | besloten in B185 (regel boven de schakelaar, set onthouden); nog niet live. Het blok rechts "Bij de drukkerij · Je kunt onderdelen uit beide sets combineren" gaat op in die regel |
| Proefvel | eigen kaart bovenaan | Hans wilde hem meteen; Mila vond hem goed | goed |
| Bord | rij zonder vinkje | Raj, Willem, Mila: gaat het bord mee? | beter zichtbaar maken: uitgegrijsd vinkje met "altijd in de set" |
| Hoeveel geld? | in de rij Speelgeld: 2 tot 4, 5 tot 8, Volledige bank | in de editor heet dezelfde stand "Per set" (Sophie, Ria) | beter labelen: zelfde woorden op beide plekken (§2) |
| Onderdelen die uit staan | regel onder de groep "Niet in deze editie: … Aanzetten in de editor" | Hans: de link opent de editor bovenaan, niet bij Onderdelen | verplaatsen: de link opent het editiepaneel bij Onderdelen |
| Maken per rij, setknop | "Maken" per rij, vaste balk met setknop | Mila: niet duidelijk dat de knoppen per rij los werken | goed; in de rij "Alleen dit maken" als tekst van de knop |
| Uploadstatus | regel ver onder de knop (Durk) | Durk zag niet waarop hij wachtte | verplaatsen naar de vaste balk (bug 11 ronde 4) |

### 1.10 Vriendenpagina

Niet live bekeken. Volgens ronde 3 duidelijk; Pim en Emma tikten op het buurvak (opgelost met B175 en het zoekveld). Geen nieuwe plaatsingsvragen.

## 2. Woorden

Labels die onduidelijk zijn, vaktaal zijn, of op twee plekken anders heten. Voorstel in gewone taal, NL en EN. Sleutels uit `lang/nl.json` waar bekend.

| Nu (NL / EN) | Waar | Probleem | Voorstel NL | Voorstel EN |
| --- | --- | --- | --- | --- |
| "De foto heeft 85 dpi op dit formaat. Kies een grotere foto of zoom minder in." | Controle, `lib/checks/checks.ts` | dpi zegt Ria, Mila, Bert, Joost niets; twee getallen voor één foto | "Deze foto is te klein en wordt korrelig op papier. Kies een grotere foto." Met "ook op het eigendomsbewijs" als het daar ook geldt | "This photo is too small and will look grainy on paper. Choose a larger photo." |
| "Resolutie … dpi, scherp genoeg" | Afbeelding | zelfde | "Scherp genoeg" | "Sharp enough" |
| Verhaal / Story (`editor.story`) | kaarttekst | Bert zocht "Tekst"; hetzelfde woord als het verhaal op het bewijs | "Tekst van de kaart" | "Card text" |
| Verhaal / Story (`editor.deed_story`) | eigendomsbewijs | zelfde woord, ander ding | "Verhaal op de achterkant" | "Story on the back" |
| "Namen van vakken en woorden als station zijn variabelen: ze veranderen mee. Gebruik Invoegen om er een te plaatsen." (`editor.card_text_hint`) | kaart | "variabelen" is abstract (Ria, Mila, Bert) | "Een woord in een grijs blokje verandert mee als je het vak of het woord anders noemt. Met Invoegen zet je er een neer." | "A word in a grey block changes along when you rename the space or the word. Use Insert to add one." |
| Bedragen binnen 20% / within 20% (`editor.amounts_note`) | kop van Bedragen | klinkt als een regel zonder reden | kop "Bedragen", bij elk veld "kies 48 tot 72" | "Amounts", "choose 48 to 72" |
| Per set (`edition_panel.money_amount_per_set`) en Volledige bank (`print.money.full`) | editiepaneel en printpagina | dezelfde keuze met andere woorden (Sophie, Ria) | in beide: "Aanbevolen", "2 tot 4 spelers", "5 tot 8 spelers", "Volledige bank". Op de printpagina bij Aanbevolen wat dat voor deze set is | "Recommended", "2 to 4 players", "5 to 8 players", "Full bank" |
| Bord (sectie in het editiepaneel) | editiepaneel | ook de naam van een tab | "Bordmaat" | "Board size" |
| Doos en extra's / Box and extras (`editor.tab_box`) en Doos (`editor.tab_box_short`) | tab | twee namen; de korte staat bijna overal | "Doos" overal, ook als voorleestekst | "Box" |
| Editie maken (`nav.create_edition`) naast Nieuwe editie (`editions.new`) | kop en Mijn edities | twee knoppen op één scherm voor hetzelfde | knop in kop en band: "Nieuwe editie"; alleen de laatste knop van het formulier "Editie maken" | "New edition" / "Create edition" |
| Foto toevoegen / Add photo (`editor.layer_add_photo`) | Extra lagen | lijkt op de gewone foto (Carlos) | "Extra foto erop" | "Add another photo on top" |
| Bordgroen / Board green (`editor.center_ground_green`) | midden | het bord is niet altijd groen (Carlos) | "Bordkleur" | "Board colour" |
| Ondertitel tonen (`editor.subtitle_show`) op de uitnodiging | uitnodiging | het is de editienaam, geen ondertitel | "Naam van de editie eronder" | "Edition name below" |
| Tekst op de uitnodiging | uitnodiging | Hans vond niet waar datum en plek komen | "Wanneer, waar, wat neem je mee" | "When, where, what to bring" |
| Titel (doosdeksel) | deksel | elders heet het Naam | "Titel op de doos" | "Title on the box" |
| Eigen regels, placeholder "Kerst 2026, voor de hele familie" | deksel | past niet bij koor of bruiloft (Hans, Sophie) | placeholder "Voor wie het spel is, of een datum" | "Who it is for, or a date" |
| Bestel als vinylsticker op maat, wit, mat gelamineerd, herpositioneerbaar (`print.order.printer.board`) | printpagina, Drukkerij-set | vaktaal (Ria, Bert, Carlos) | "Bestel als sticker op maat (mat, opnieuw te plakken). Zeg tegen de drukker: vinyl, wit, mat gelamineerd." De vakwoorden staan er nog voor de drukker, met de uitleg ervoor | "Order as a custom sticker (matt, can be moved). Tell the printer: vinyl, white, matt laminated." |
| SRA3 (`print.spec.printer.money`) | rij Speelgeld | Bert en Carlos kennen het niet | "SRA3 (iets groter dan A3)" de eerste keer op de pagina | "SRA3 (a bit larger than A3)" |
| uitlijntest (`print.order.home.cards`, `print.spec.home.cards`) | Thuisprint | Ria kent het woord niet | "proefpagina om voor- en achterkant te laten passen" | "test page to line up front and back" |
| afloop, snijtekens | spec-regels in mono | voor de drukker; Ria leest het niet | laten staan in de mono-regel (die is voor de drukker), niet in de zin erboven | idem |
| "Bij de drukkerij · Je kunt onderdelen uit beide sets combineren." (`print.aside_title`, `print.combine_note`) | printpagina rechts | onduidelijk wat het betekent; staat los van de schakelaar | weghalen; de regel uit B185 boven de schakelaar vervangt het | idem |
| Editie · Klassiek · Nederlands · € (rij Editie) | linkerkolom | zegt niet wat je er vindt | "Editie · naam, thema, onderdelen, woorden" | "Edition · name, theme, parts, words" |
| Editie · geldt voor alles (`edition_panel.kind`) | kop editiepaneel | goed | goed | goed |
| "Alles hieronder kun je later aanpassen door in de editor op de naam te klikken." (`edition.intro`) | Nieuwe editie | klopt niet meer sinds B144 | "Alles hieronder pas je later aan onder Editie, bovenaan links in de editor." | "You can change all of this later under Edition, top left in the editor." |
| Alleen in deze browser (`editor.saved_in_browser`) plus de Safari-zin | opslagstatus | Bert schrok; Durk zag geen "bewaard" | na een wijziging "Bewaard op dit toestel"; de Safari-zin alleen als hij geldt | "Saved on this device" |
| Menu ☰ op een editiekaart, ⋯ in de editor | Mijn edities, editor | twee iconen voor hetzelfde soort menu | ⋯ overal voor een menu van één ding; ☰ alleen voor het sitemenu op de telefoon | idem |
| Mapicoon zonder tekst | kop op T en M | onduidelijk | "Mijn edities" erbij als tekst (op M in het menu bovenaan) | "My editions" |

## 3. Flows

Per taak de stappen van nu, wat er schuurt, en de kortere weg. Een stap is één klik of tik.

### 3.1 Een editie beginnen

Nu (D): landing › Editie maken › sjabloon kiezen › scrollen tot Naam (1300 px) › naam typen › Editie maken (in de kaart rechts). Vijf stappen plus scrollen. Op M zit de naam vier schermen lager; de knop staat vast onderaan, dus wie niet scrolt, maakt "Onze editie" (Bert).

Voorstel: het naamveld in de kaart rechts, boven de knop (op M in de vaste balk: "Naam" en "Editie maken"). Dan is het sjabloon kiezen › naam typen › Editie maken, zonder te scrollen. Uitlegtekst bovenaan aanpassen (§2).

### 3.2 Alle straten hernoemen

Nu: rij in de lijst aanklikken en typen, Tab naar de volgende; of een lijst met namen in één rij plakken. Plakken werkt goed maar niemand weet het (Kim, Fatima). Klikken op een naam zet je in het veld zonder het vak te openen (Hans). Op 1440 × 900 zie je drie rijen, omdat het minibord boven de lijst staat.

Voorstel: placeholder van het zoekveld noemt plakken; focus in een rij kiest ook het vak, zodat paneel en voorbeeld meelopen; na plakken een melding die de overgeslagen vakken noemt ("10 namen ingevuld. Stations en nutsbedrijven heb ik overgeslagen."). Minibord inklapbaar op lage schermen.

### 3.3 Foto's toevoegen

Nu (D): vak kiezen › Foto › Foto kiezen › bestand. Op M: vak › Afbeelding openen › Foto › Foto kiezen › bestand. Bij Logo en Naam met foto in het midden is het al één stap (B179). Meerdere foto's tegelijk overschrijft andere vakken (bug 7) en de lijst "foto → vak" staat buiten beeld.

Voorstel: Foto opent meteen de bestandskiezer, overal. Op M toont de kop van het blok Afbeelding "geen foto" of een miniatuur, en tikken op "Foto" in een open blok is één stap. De verdeling van meerdere foto's is bug 7, met de lijst in beeld (UX 4).

### 3.4 Het midden instellen

Nu: rij Midden van het bord (of klik op het midden van het minibord) › Afbeelding: Naam / Naam met foto / Logo, daarna Bordgroen / Foto over het hele midden › onder Stijl Extra lagen met "Foto toevoegen". Drie plekken waar "foto" staat; Carlos kwam bij de laag terecht.

Voorstel: alleen woorden. "Extra foto erop" bij lagen, "Bordkleur" in plaats van "Bordgroen". De vouwlijnen en één foto voor beide keuzes vallen onder B183.

### 3.5 Pionnen kiezen

Nu: alleen als Pionnen aan staat. Anders: rij Editie › springlink Onderdelen (of scrollen) › Pionnen aanvinken › tab Doos › Pion 1 › naam en foto; het aantal staat in het paneel van elke pion. Wie Pionnen uit heeft, ziet in Doos niets (Fatima: "pionnen zijn nummers").

Voorstel: in de lijst Doos een lichte rij "Pionnen · niet in je set · Aanzetten". Aanzetten zet het onderdeel aan en opent Pion 1. De groepskop "Pionnen · 8 van 8" krijgt "naam en foto per speler".

### 3.6 Vrienden uitnodigen

Nu: naammenu › Samen maken (of rij Editie › springlink Samen maken) › Maak een link › kopiëren of delen. Bij een fout staat de melding onder de vouw (bug 6). Pim zocht het eerst in de kop.

Voorstel: plek houden (B146). In het naammenu een regel onder Samen maken: "Vrienden sturen namen en foto's". Melding naast de knop (bug 6).

### 3.7 Een set kiezen en printen

Nu: Printen › printpagina opent op Drukkerij-set › wie thuis of bij de kopieerwinkel print, moet zelf bedenken dat dat Thuisprint is (Bert) › Maken of setknop. Onderdelen die uit staan: link "Aanzetten in de editor" opent de editor bovenaan (Hans). Hoeveel geld heet anders dan in de editor.

Voorstel: B185 (regel boven de schakelaar, set onthouden) bouwen, het blok rechts weghalen, vinkje "altijd in de set" bij het bord, de link Aanzetten opent het editiepaneel bij Onderdelen, en dezelfde woorden voor Hoeveel geld.

### 3.8 Later terugkomen

Nu: kop › Mijn edities (op M het mapicoon) › kaart › Openen of Printen. Printen na herladen gaat naar de bestaande set (opgelost in ronde 3). Wie een tweede editie wil op basis van de eerste: Dupliceren als nieuwe editie op de kaart, of naammenu › Dupliceren; daarna blijf je op de lijst met een kaart die er hetzelfde uitziet.

Voorstel: na Dupliceren de kopie openen met het naamveld actief; Dupliceren ook in het menu ⋯ van de kaart; mapicoon met tekst.

## 4. Plaatsingswijzigingen

Op volgorde van wat het meeste oplevert. Elk punt is klein en past in de opbouw van B138, B141 en B143: geen knop in de kop, geen nieuwe dialoog. Twee agents kunnen ze tegelijk bouwen: A doet de editor, B de openbare kant en de printpagina. De kolom "bestanden" zegt wat elk punt raakt.

Gedeeld zijn alleen `lang/nl.json` en `lang/en.json`. Afspraak: A wijzigt alleen sleutels die beginnen met `editor.`, `edition_panel.`, `words.` en `shortcuts.`; B alleen `nav.`, `edition.`, `editions.`, `print.` en `home.`. Elk voegt nieuwe sleutels toe direct onder de laatste sleutel van zijn eigen voorvoegsel, zodat de merge niet botst. Punt 3 en punt 8 raken beide kanten; daar staat per agent wat hij doet.

| Nr | Wijziging | Waarom (testers) | Plek (B143) | Agent | Bestanden |
| --- | --- | --- | --- | --- | --- |
| 1 | Onderdelen die uit staan als lichte rij onderaan de lijst Doos ("Uitnodiging · niet in je set · Aanzetten"); Aanzetten zet het onderdeel aan en opent het. Speelgeld uit: in Doos een rij "Speelgeld · niet in je set", geen lege tab Geld | Hans, Raj, Fatima, Lisa | lijst links (punt 2: het is een element) | A | `components/editor/element-list.tsx`, `lib/editor/catalogue.ts` (onderdelen per tab) |
| 2 | Foto in één stap: "Foto" opent meteen de bestandskiezer, ook bij Afbeelding van vak, kaart, pion, deksel, uitnodiging; daarna "Andere foto". Op M toont de kop van elk blok een samenvatting ("Afbeelding · geen foto") | Ria, Lisa, Joost, R3 UX 1, R4 UX 4 | Afbeelding (punt 2) | A | `components/editor/panel/image-section.tsx`, `components/editor/panel/panel-parts.tsx` |
| 3 | Namen typen en plakken zichtbaar maken: placeholder "Zoek een vak, of plak een lijst met namen in een rij"; focus in een rij kiest het vak; melding na plakken noemt overgeslagen vakken | Kim, Fatima, Ria, Hans | lijst links | A | `components/editor/list-search.tsx`, `components/editor/name-row.tsx`, `components/editor/element-list.tsx` |
| 4 | Editiepaneel: Onderdelen als tweede sectie, springlink van de huidige sectie dik, `scroll-padding` onder de balk, sectie "Bord" heet "Bordmaat"; het paneel opent op een sectie via `?edition=parts`. Vervangt de volgorde uit B145 | Hans, Bert, Pim | editiepaneel (punt 1) | A | `components/editor/edition-panel.tsx`, `components/editor/editor-workspace.tsx` (alleen het lezen van de parameter) |
| 5 | Link "Aanzetten in de editor" op de printpagina gaat naar `?edition=parts` | Hans | printpagina (punt 5) | B (na A punt 4; tot dan valt de link terug op de editor) | `pages/print/show.tsx` |
| 6 | Dupliceren: na dupliceren de kopie openen met het naamveld actief, op Mijn edities en vanuit het naammenu; Dupliceren ook in het menu van de kaart; dat menu krijgt ⋯ | Sophie, Henk, Raj | naammenu (punt 4), Mijn edities | A: naammenu. B: Mijn edities | A: `components/editor-header.tsx`. B: `components/editions/edition-card.tsx`, `pages/editions/index.tsx` |
| 7 | Controle: per melding een knop die het veld opent ("Andere foto", "Naar Uiterlijk", "Bedrag aanpassen" bestaat al) en een kruisje rechtsboven; dpi-teksten in gewone taal | Sophie, Fatima, Joost, Bert, Ria, Mila | Controle | A | `components/editor/check-panel.tsx`, `lib/checks/checks.ts` |
| 8 | Hoeveel geld? met dezelfde woorden op beide plekken ("Aanbevolen", "2 tot 4 spelers", "5 tot 8 spelers", "Volledige bank") | Sophie, Ria | editiepaneel en rij Speelgeld | A: editiepaneel. B: printpagina | A: `components/editor/edition-panel.tsx`. B: `components/print/money-choice.tsx` |
| 9 | Nieuwe editie: naamveld in de kaart rechts boven "Editie maken" (M: in de vaste balk), geen autofocus, uitleg bovenaan klopt weer | Bert, Kim | Nieuwe editie | B | `pages/editions/create.tsx`, `components/editions/new-edition-card.tsx` |
| 10 | Printpagina: vinkje "altijd in de set" bij het bord, blok rechts "Bij de drukkerij" weg (gaat op in de regel van B185), vakwoorden met uitleg (sticker, SRA3, uitlijntest) | Raj, Willem, Mila, Bert, Ria, Carlos | printpagina (punt 5) | B | `components/print/part-row.tsx`, `pages/print/show.tsx` |
| 11 | Kaart en uitnodiging: "Tekst van de kaart", "Verhaal op de achterkant", uitleg over grijze blokjes; uitnodiging in de volgorde van de kaart met "Naam van de editie eronder"; deksel "Titel op de doos" en een placeholder zonder kerst | Bert, Ria, Mila, Hans, Sophie | Tekst (punt 2) | A | `components/editor/panel/text-section.tsx`, `components/editor/card-text-editor.tsx` |
| 12 | Midden: "Extra foto erop", "Bordkleur" | Carlos | Afbeelding en Stijl | A | `components/editor/panel/image-section.tsx`, `components/editor/panel/style-section.tsx` |
| 13 | Rij Editie zegt wat erachter zit ("naam, thema, onderdelen, woorden"); naammenu-items Samen maken en Dupliceren krijgen een regel uitleg | Sophie, Pim, Hans | lijst links, naammenu | A | `components/editor/edition-row.tsx`, `components/editor-header.tsx` |
| 14 | Kop op T en M: "Mijn edities" als tekst; overal "Nieuwe editie" als knop, "Editie maken" alleen onderaan het formulier | eigen bevinding | openbare kop | B | `components/app-header.tsx`, `pages/editions/index.tsx`, `pages/home.tsx` |
| 15 | Menu ⋯ van een element: handelingen eerst, Terug naar standaard onderaan | Kim | menu ⋯ (punt 3) | A | `components/editor/panel/panel-header.tsx` |
| 16 | Minibord inklapbaar tot één regel op schermen lager dan 900 px | Carlos, eigen meting (drie rijen op 1440 × 900) | lijst links | A | `components/editor/board-navigator.tsx` |

Wat al besloten of in ronde 4 voorgesteld is en hier niet opnieuw staat: de regel boven de setkeuze en de set onthouden (B185), de vouwlijnen en één foto in het midden (B183), Samen maken-melding bij de knop (bug 6), meerdere foto's verdelen (bug 7), de Safari-zin en "Bewaard" (UX 2 en UX 10). Punt 2, 7, 8 en 11 overlappen met UX 2 en UX 4 van ronde 4; bouw ze één keer, met deze plek.

Volgorde voor twee agents:

- Agent A (editor): 1, 2, 3, 4, 7, 8 (editiepaneel), 11, 12, 13, 15, 16, en het editordeel van 6.
- Agent B (openbaar en print): 9, 10, 14, het printdeel van 8, het Mijn edities-deel van 6, en 5 als laatste, na de merge van A punt 4.

Geen van de punten raakt `editor-workspace.tsx` buiten het lezen van de parameter in punt 4; dat bestand is groot en wordt in andere branches ook aangepast, dus houd die wijziging klein.

## 5. Mockups

In `docs/design/vindbaarheid/` (open `index.html`). Elk scherm zet de schermafbeelding van nu naast het voorstel. Een afbeelding van elke mockup staat in `na/`.

| Bestand | Wat |
| --- | --- |
| `editor-lijst.html` | Linkerkolom op 1440 px: rij Editie met wat erachter zit, zoekveld met de plakhint, lijst Doos met onderdelen die uit staan (punt 1, 3, 13) |
| `veldenpaneel.html` | Afbeelding in één stap, kaarttekst met gewone uitleg, uitnodiging in de volgorde van de kaart, menu ⋯ met de handelingen eerst, en op 390 px de blokken met samenvatting (punt 2, 11, 15) |
| `editiepaneel.html` | Editiepaneel met Onderdelen als tweede sectie, de huidige springlink dik, Bordmaat, Hoeveel geld? met de nieuwe woorden (punt 4, 8), en Controle met een knop per melding en een kruisje (punt 7) |
| `printpagina.html` | Printpagina met het bord altijd in de set, gewone woorden, zonder blok rechts, en de link naar Onderdelen (punt 5, 8, 10) |
| `nieuwe-editie.html` | Nieuwe editie met het naamveld bij de knop, en Mijn edities met ⋯ en Dupliceren in het menu (punt 6, 9, 14) |
