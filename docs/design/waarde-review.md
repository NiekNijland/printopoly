# Waarde-review: wat voegt elk onderdeel toe, en staat het op de goede plek?

Stand van 22 november 2026, live is release 3 met de hotfix (b9c8efa). Antwoord op de vraag van Niek: "Zo mag je kritisch zijn op alle modules en onderdelen van deze website. Wat is de toegevoegde waarde? En is dit wel de plek?"

Bronnen: `plan.md` (het oorspronkelijke doel), alle besluiten tot en met B197, `docs/design/vindbaarheid.md` (de plaatsingsaudit van vandaag; die doe ik hier niet over), de overzichten en verslagen van testronde 3 en 4, en een eigen ronde over printopoly.nl met headless Chrome op 1440 en 390 px. Ik maakte een editie via de kortste weg (Leeg), zette daarna alle onderdelen aan en liep elk paneel, de printpagina in beide sets en Mijn edities langs. Samen maken heb ik niet aangeraakt. Besloten maar nog niet gebouwd (B183 tot B186, B194 op `r4/sjablonen`, B197) beoordeel ik zoals besloten.

Vindbaarheid vroeg "staat het waar je het zoekt?". Dit document vraagt "moet het er zijn, en zo ja, moet de gebruiker er iets voor kiezen?". Waar de twee botsen, staat het erbij.

Er zijn geen gebruiksgegevens. B68 houdt alleen functionele cookies en er is geen telling van wat echte bezoekers doen. "Bewijs" betekent hier: 24 testers met persona's in twee rondes, die met een script werkten. Dat zegt veel over verwarring en weinig over hoe vaak iets echt gebruikt wordt.

## De tien scherpste conclusies

1. De kern is kort en goed. Van de landing tot de editor zijn het twee klikken en zes seconden; van de editor tot een set is het Printen, Set maken, ZIP. Wat in de weg zit, zit eromheen: elf sjabloontegels boven het naamveld, tien vinkjes bij Onderdelen, een printpagina met tien kaarten en vijf soorten knoppen per rij.

2. Dobbelstenen en huisjes en hotels gaan tegen de belofte van het product in. Het plan zegt letterlijk dat je bord, dobbelstenen, huisjes en hotels uit je eigen doos hergebruikt. Geen tester vroeg erom; wie ze aanzette, meldde alleen fouten (woorden, TrimBox). In de editor hebben ze een paneel met alleen "Geen / Foto". Schrappen, of hooguit een rij op de printpagina zonder element in de editor.

3. "Wat zit er in mijn set" wordt op drie plekken gekozen: bij Nieuwe editie, onder Onderdelen in het editiepaneel en met vinkjes op de printpagina. "Hoeveel geld" staat op twee plekken met twee woordenlijsten. Dat is de bron van vindbaarheidsprobleem 1 (een onderdeel dat uit staat, bestaat in de editor niet). Voorstel: de editor toont altijd alles, en alleen de printpagina kiest wat je print. Dat vraagt Niek (vraag 1), want het vervangt B99.

4. De keuze Drukkerij-set of Thuisprint-set is de moeilijkste vraag op de site, en komt op het moment dat je wilt printen. In ronde 4 liepen acht testers vast op welke set, hoeveel of voor wie (UX 3), en vier begonnen op Drukkerij terwijl ze thuis wilden printen; B185 plakt er een uitlegregel en een bestelblad op. Beter: de printpagina opent op Thuisprint (20 van de 38 sets in ronde 4 waren thuis, en elke kopieerwinkelbezoeker hoort daar), en Drukkerij is een duidelijke tweede route. Vraag 2.

5. Samen maken is het duurste onderdeel per gebruiker. Het heeft een eigen collectie, een vriendenpagina, limieten per IP, voorstellen per veld (B175), verbergen van kaartteksten (B176), een plaatje via de wachtrij (B174) en een rij Van vrienden. Twee testers gebruikten het echt (Pim, Maya, ronde 3), ronde 4 kon het niet testen. Het plan zette het onder "later, als je het zelf mist" (B25). Het werkt en Maya noemt het het mooiste; behouden, maar bevriezen: niets meer bij bouwen tot echte groepen het gebruiken, en de landing stopt met het promoten als derde set.

6. Er zijn drie PNG's van het bord en twee manieren om een editie te tonen. Het plaatje voor de groepsapp (Chrome-job, kwartier bewaard), de PNG van de uitnodiging en Voorbeeld doen bijna hetzelfde. Voorstel: één "Deel je bord" in het naammenu dat de PNG maakt, en de uitnodigings-PNG blijft bij de uitnodiging. Het plaatje verdwijnt uit Samen maken.

7. De editie heeft meer stijlknoppen dan de testers raken. Accentkleur kleurt alleen de pijlen bij Start en Gevangenis en de titel op het deksel (Raj miste juist de middenbalk). Patronen en lagen op de kaartrug noemt geen tester. Extra lagen in het midden leverden vooral een vergissing op (Carlos). Accentkleur schrappen of opnemen in het thema; kaartrug alleen Standaard, Patroon of Foto zonder lagen; extra lagen alleen in het midden en op het deksel, achter een link.

8. Elf sjablonen met elk twee talen, 28 namen, 32 kaarten en drie huisregels zijn veel onderhoud, en vijf testers herschreven toch bijna alles omdat het sjabloon niet paste (ronde 4, UX 8). B186 maakt er twaalf van. Beter minder en neutraler, plus "Kaarten leegmaken" (B194) en dezelfde knop voor namen. Vraag 4.

9. Uitleg over printen staat op vier plekken: de landing (hoe plak je de sticker), de printgids, een instructie-PDF per onderdeel en straks een bestelblad (B185). De printgids kent de vier extra onderdelen en de huisregels niet eens. Eén bron: de printgids per onderdeel, waar de ZIP het bestelblad en de instructies uit haalt; de landing linkt alleen.

10. Controle naar de printpagina (B197) is de goede richting, en het past bij een breder principe: de editor hoeft niets te vragen of te tellen terwijl je werkt. Zet hetzelfde door voor de "aangepast"-tellingen in de tabs en de opslagstatus met de Safari-zin, die nu ook als zorg lezen terwijl je nog bezig bent.

## Kortste weg van "ik wil een eigen spel" tot printen

Gemeten op 1440 px:

| Stap | Klikken | Wat er in de weg zit |
| --- | --- | --- |
| Landing › Editie maken | 1 | niets; de knop staat in de hero en de kop |
| Nieuwe editie › Editie maken | 1 | het naamveld staat onder elf sjabloontegels (Bert drukte zonder naam en kreeg "Onze editie"); thema, onderdelen en munt staan als drie regels "Wijzigen" eronder |
| Editor, namen typen | per vak | niets, typen in de lijst en plakken werkt; het minibord neemt op 1440 × 900 de bovenste 500 px van de lijst |
| Printen | 1 | na B197 eerst "Nog even nakijken" |
| Set kiezen | 0 of 1 | de printpagina opent op de laatst gekozen set, voor een nieuwe browser op Drukkerij |
| Set maken, wachten, ZIP | 2 | proefvel als eerste kaart, negen rijen met elk Maken, PDF, Delen, PNG en Instructies, een setteller, en de servertekst |

Vijf klikken plus wachten. De editor is de plek waar het werk zit en dat hoort zo. De twee momenten waarop de site te veel vraagt zijn Nieuwe editie (keuzes die je pas later begrijpt) en de printpagina (keuzes over papier en sets die de meeste mensen niet kunnen maken).

## Per gebied

Kolommen: Waarde (welke taak voor wie, met bewijs), Kosten (interface, onderhoud, denkwerk, print- en serverkosten), Plek (volgens B143), Oordeel.

### Openbare pagina's

| Onderdeel | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Landing, hero | Zegt in één zin wat het is en dat het een sticker is (B97). Niemand begreep het verkeerd | laag | goed | behouden |
| Landing, "Begin met…" | Brengt je met één klik in een sjabloon. Op 390 px is de landing 6600 px lang, deze strook is een van de redenen | tien tegels | dubbel met Nieuwe editie | vereenvoudigen: vier tegels en "alle sjablonen" |
| Landing, "Zo maak je een editie" | Vier stappen; stap 3 belooft waarschuwingen tijdens het werk, wat B197 juist weghaalt | laag | goed | behouden, stap 3 herschrijven naar "nakijken voor het printen" |
| Landing, "Wat er in de sets zit" | Legt de twee sets uit, maar in vakwoorden (vinyl, herpositioneerbaar) die op de printpagina ook al niet werken | middel | dubbel met printpagina en printgids | vereenvoudigen tot één regel per set met een link naar de printgids |
| Landing, "Maak het samen" | Promoot een functie die twee testers echt gebruikten, als roze blok op gelijke hoogte met de sets | middel, zet verwachting | te prominent | verplaatsen: één zin in stap 2 |
| Landing, "Zo plak je de bordsticker" | Vier stappen die woord voor woord in de printgids staan | middel | dubbel | schrappen, de printgids linkt bij de bordrij |
| Landing, vragen-teaser | Vijf vragen die ook op /vragen staan | laag | prima | behouden |
| Printgids | Eén plek om het printen te begrijpen; Bert en Willem gebruikten hem. Mist spelregelboekje, huisjes, dobbelstenen, uitnodiging en huisregels | middel | goed | behouden en de enige bron maken (zie conclusie 9) |
| Vragen | Vijftien korte vragen, nuttig voor zoekmachines en twijfelaars | laag | goed | behouden |
| Contact, privacy, voorwaarden | Verplicht (DSA-meldpunt, AVG, Hasbro-zin) | laag | goed | behouden |
| Voorbeeldeditie (Zaterdagclub) | "Bekijk een ingevulde editie"; overlapt bijna helemaal met de sjabloonvoorbeelden (B127), en lijkt sterk op het sjabloon Vriendengroep | apart databestand, eigen route | dubbel | samenvoegen: de knop opent het voorbeeld van een sjabloon |
| Sjablonen | Starten met vulling scheelt werk (Bert: "in een halve seconde in de editor"). Vijf testers herschreven toch alles; per sjabloon 2 × (28 namen, 32 kaarten, 3 regels), met tests | hoog onderhoud | goed | vereenvoudigen naar zes, zie vraag 4 |

### Nieuwe editie en Mijn edities

| Onderdeel | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Sjabloon kiezen | zie hierboven | | goed | behouden |
| Naam | Nodig, maar staat onder de tegels (Bert) | | verkeerd | verplaatsen naar de kaart bij de knop (vindbaarheid punt 9) |
| Taal | Bepaalt teksten van bord en kaarten. Volgt de interfacetaal | laag | goed | behouden |
| Thema, onderdelen, munt als regels "Wijzigen" | Drie keuzes die je in de editor beter kunt maken, omdat je daar ziet wat ze doen. Carlos koos per ongeluk M | denkwerk bij de start | te vroeg | schrappen hier: het sjabloon of de taal kiest, de editor wijzigt |
| Mijn edities, kaart met Openen en Printen | Iedereen vond het; de status per set wordt gewaardeerd | laag | goed | behouden |
| Dupliceren als nieuwe editie | Sophie maakte drie koppels in een uur; Henk en Raj vonden het niet | laag | twee plekken (kaart en naammenu) is goed | behouden, na dupliceren de kopie openen |
| Banner Inloggen | Eerlijk over opslag in de browser | laag | goed | behouden |

### Editor: kop en linkerkolom

| Onderdeel | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Kop met naammenu | Eén regel sinds B144; naammenu met Editie-instellingen, Samen maken, Sneltoetsen, Dupliceren | laag | goed | behouden; "Editie-instellingen" in het menu is dubbel met de rij Editie, maar onschuldig |
| Opslagstatus | Nodig zonder account (B78). "Alleen in deze browser" plus de Safari-zin leest als waarschuwing (Bert schrok, Durk en Kim misten "bewaard") | laag | goed | vereenvoudigen: "Bewaard" na een wijziging, de rest pas als het geldt |
| Ongedaan maken en opnieuw | Lars: twaalf stappen terug zonder verlies. Vangnet voor plakken, wisselen en leegmaken | middel | goed | behouden |
| Controle (B197) | Een teller in de kop terwijl je werkt voelt als een cijferlijst. Een verse lege editie met alles aan toont al "Controle: 1" (huisregels leeg) | | verkeerd, B197 lost het op | verplaatsen naar de printpagina, zoals besloten |
| Voorbeeld | Het enige scherm met alles in één keer (Mila zag haar tekeningen alleen hier). Elf tabs | middel | goed | behouden |
| Sneltoetsen | Eén tester gebruikte ze (Kim), één had er last van (Eva, focus op body, R3-16). Losse letters vroegen al twee rondes fixes | middel onderhoud | menu is goed | behouden, maar de losse letters beperken tot J, K, V en ?; de rest via Ctrl/Cmd |
| Rij Editie en editiepaneel | Eén plek voor de hele editie (B145). Op 1440 px een kolom van zes secties met ruim dertig velden, waarvan Woorden alleen al 12 | hoog denkwerk | goed | vereenvoudigen, zie de tabel editiepaneel |
| Tabs Bord, Kaarten, Geld, Doos | Goed gevonden | laag | goed | behouden, Doos altijd tonen (conclusie 3) |
| Minibord | Herkenbaar, maar op 1440 × 900 zie je drie vakken van de lijst eronder; op de telefoon een kleurraster zonder namen | middel | botst met de lijst | standaard ingeklapt onder 900 px hoog; het grote bord doet het echte werk |
| Groot bord (Bord vergroten) | Ria, Fatima, Joost en Mila vonden het in ronde 4 het fijnst om een vak te kiezen | laag | goed | behouden |
| Lijst met typen en plakken, zoekveld | "Het mooiste van de editor" (Kim). De snelste route naar een eigen spel | laag | goed | behouden, beter laten zien (vindbaarheid punt 3) |
| Rij Van vrienden | Alleen als er iets wacht | laag | goed | behouden |

### Editiepaneel per sectie

| Sectie of veld | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Algemeen: naam, ondertitel, taal | Kern | laag | goed | behouden |
| Algemeen: munt (euro, M, dollar, pond, eigen munt) | Eigen munt is geliefd (ƒ, fd, kn, Kus); de vijf opties met een voorbeeldbedrag werken | laag | goed | behouden |
| Uiterlijk: thema | Drie thema's die echt verschillen (ronde 3, §4); Strak oogt kaal | middel | goed | behouden |
| Uiterlijk: accentkleur | Kleurt pijlen en de dekseltitel; geen tester zocht het, Raj wilde juist de middenbalk | middel (Controle-regels, paletregels B130) | | schrappen, of laten volgen uit de eerste groepskleur |
| Uiterlijk: kleur per straatgroep | Sophie en Raj gebruikten het voor huiskleuren of een gedempt palet; ook in Stijl van elke straat | middel | twee plekken | behouden in Uiterlijk, uit het straatpaneel halen |
| Woorden (12 velden) | Lopen overal door, ook Spaans en Fries (ronde 4). Maar de meeste mensen veranderen er niets aan | hoog denkwerk | goed | inklappen: "Eigen woorden voor huis, hotel, station…" als één regel die openklapt |
| Woorden: naam van de bank | Hoort bij geld | laag | goed | behouden |
| Onderdelen (11 vinkjes) | Maakt de editor korter, maar verstopt wat uit staat (Hans, Raj, Fatima, Lisa) | hoog: drie plekken kiezen hetzelfde | dubbel met de printpagina | schrappen als keuze in de editor, zie vraag 1 |
| Hoeveel geld? | Echte behoefte (zes testers, ronde 3) | middel | dubbel, heet op de printpagina anders | alleen op de printpagina, met de standaard per set |
| Bordmaat | Twee testers met een ander bord (Henk, Lars). Al ingeklapt achter "Andere maat" | laag | goed | behouden, onderaan |
| Samen maken | zie conclusie 5 | | goed | behouden, bevriezen |

### Veldenpaneel per type

| Type en sectie | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Straat: naam, plaats | Kern; de plaats per groep is uit het origineel | laag | goed | behouden |
| Straat: foto, ook op het bewijs, Vullend of Passend | Kern voor familie- en dorpsspellen; B157 en B168 losten de grootste klachten op | middel | goed | behouden |
| Straat: bedragen binnen 20% | Lars gebruikte het grondig; de meeste testers raakten het niet. Vier velden met plus en min staan open tussen Afbeelding en Stijl | hoog: grenzen, herstel bij openen (B181), wisselbug | goed | standaard inklappen tot "Bedragen · standaard" |
| Straat: Stijl met 12 kleurknoppen | Dubbel met Uiterlijk | middel | dubbel | schrappen hier, link naar Uiterlijk |
| Eigendomsbewijs: schakelaar, verhaal | Ria: het verhaal is het mooiste van de site | laag | goed | behouden |
| Station, nutsbedrijf, hoek, belasting: icoonkeuze (4 opties) | "Standaardicoon / Ander icoon / Eigen afbeelding / Foto": Raj vond Eigen afbeelding en Foto hetzelfde | middel | goed | samenvoegen tot Standaardicoon, Ander icoon, Eigen afbeelding |
| Kans- en Algemeen Fonds-vak | Paneel met alleen "Naar de woorden" en een icoon | laag | | behouden |
| Midden: naam, naam met foto, logo, achtergrond | Acht testers wilden het midden als cadeau (ronde 4). Twee fotovelden en drie fotowoorden verwarren | hoog | goed | vereenvoudigen volgens B183: één foto |
| Midden: extra lagen | Vrije opmaak (B43). Carlos voegde per ongeluk een laag toe; geen tester noemt een laag als winst | middel | in Stijl | behouden alleen hier en op het deksel, als link "Extra tekst of foto erop" |
| Kaart: tekst met chips en Invoegen | Variabelen houden namen gelijk (B131); "variabelen" is vaktaal (Ria, Mila, Bert) | middel | goed | behouden, woorden aanpassen (vindbaarheid §2) |
| Kaart: bedrag binnen 20% | Botst met eigen tekst ("Betaal een snoepje" boven "Ontvang € 40", Mila); Controle vangt het half | middel | goed | behouden |
| Extra kaarten | Sanne (32 + 32), Lars | laag | goed (tegel aan het eind) | behouden |
| Kaarten leegmaken (B194, nog niet live) | Het goedkope antwoord op sjablonen die niet passen (Hans) | laag | menu van de stapel | behouden, en hetzelfde voor namen |
| Kaartrug: standaard, 8 patronen, foto, lagen | Niemand noemt de kaartrug (vindbaarheid 1.5). Lagen op een rug van 63 × 88 mm leveren weinig op | middel | | vereenvoudigen: Standaard, Patroon, Foto; lagen weg |
| Biljet | Het mooiste onderdeel volgens vijf testers (ronde 3) en Sophie (ronde 4) | middel (25 MB-PDF, bug R4-3) | goed | behouden |
| Pion: naam, foto, aantal | Ria en Mila maakten pionnen met foto's; Fatima vond pionnen "nummers" | laag | goed | behouden |
| Doosdeksel: titel, ondertitel, eigen regels, foto, lagen | Cadeau (Ria, Mila); ontwerp zwak (ronde 3 en 4) | middel | goed | behouden, verbeteren in het ontwerp, niet in opties |
| Huisregels | Eigen regels zijn leuk, maar het is een losse rij in Doos die met de kaarten wordt geprint, en een lege kaart geeft meteen een melding | middel | verkeerd | verplaatsen: een tegel "Huisregelkaart" aan het eind van de tab Kaarten |
| Spelregelboekje | Prijslijst en huisregels van jouw bord; maar wie een bord heeft, heeft ook de regels. Paneel heeft alleen "Geen / Foto". Hans: veel halflege pagina's | hoog: 16 pagina's, eigen paginaplan, woorden, munt (R3-7, R3-17) | geen element nodig | standaard uit laten, uit de editor halen, alleen een rij op de printpagina |
| Huisjes en hotels | Tegen de belofte van het plan; niemand vroeg erom | middel | | schrappen |
| Dobbelstenen | Idem; een vouwdobbelsteen van 24 mm rolt slecht | laag tot middel | | schrappen |
| Uitnodiging | Echte taak bij feesten: Sophie, Mila, Raj, Pim, Hans zochten of gebruikten hem | middel | goed | behouden |
| Menu ⋯: Wisselen met… | Lars gebruikte het, en het gaf de enige blokkerende bug van ronde 4 | middel | goed | behouden, niet uitbreiden naar andere vaktypen |
| Menu ⋯: Terug naar standaard | Nodig, zeker bij sjablonen (B152) | laag | goed | behouden, onderaan |

### Samen maken en delen

| Onderdeel | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Link, vriendenpagina, voorstellen per veld | Pim (16 voorstellen) en Maya (4) vonden het sterk. Ronde 4: niet te testen door de limiet van 10 links per IP per dag | hoog: eigen collectie, opruimen na 30 dagen, limieten, policies, vriendenpagina in twee talen | goed (B146) | behouden, bevriezen |
| Kaartteksten alleen voor mij (B176) | Eén wens (Maya) | laag tot middel | | standaard uit laten; niet verder uitbreiden |
| Plaatje voor de groepsapp | Maya: must. Gaf in ronde 3 altijd een 500, kreeg een eigen job (B174), is daarna niet meer getest | middel: Chrome-job, cache | verkeerd: zit in Samen maken | samenvoegen tot "Deel je bord" in het naammenu |

### Printpagina

| Onderdeel | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Proefvel | Voorkomt een dure fout bij de drukkerij (Hans, Mila). Voor thuis is het minder nodig, want daar print je toch | laag | eigen kaart bovenaan voor beide sets | verplaatsen naar de bordrij bij de Drukkerij-set ("Eerst het proefvel") |
| Twee sets | Nodig: thuis en drukker zijn echt verschillend drukwerk | hoog denkwerk | goed | behouden, standaard Thuisprint (vraag 2) |
| Vinkjes per onderdeel | Doet wat Onderdelen in de editor ook doet | | dubbel | behouden als enige keuze (vraag 1) |
| Hoeveel geld? | zie editiepaneel | | goed hier | behouden, alleen hier |
| Setteller (1 tot 40) | Hans (10 sets), Sanne (klas). Klein en nuttig voor een kleine groep | laag | in de vaste balk, die op de telefoon al te vol is | verplaatsen naar een regel onder de balk: "Meer dan één set?" |
| Schatting in de balk | Ria en Daan wilden vooraf weten hoeveel papier | laag | goed | behouden |
| Maken per rij, PDF, Delen, PNG, Instructies | Vijf knoppen per rij naast de setknop. Mila begreep niet dat rijen los werken | hoog | | vereenvoudigen: per rij alleen PDF als hij klaar is; Instructies verhuizen naar de printgids en de ZIP |
| ZIP | Kern | laag | goed | behouden; na "Set maken" vanzelf downloaden als alles klaar is |
| Instructies in de ZIP en per rij | Goede teksten, maar dubbel met de printgids | middel | | één bron (conclusie 9) |
| Bestelblad (B185) | Willem, Bert en Carlos wilden het | laag | in de ZIP | behouden, gemaakt uit dezelfde bron als de printgids |
| "Bij de drukkerij · combineren" | Onduidelijk (vindbaarheid) | | | schrappen |

### Account en taal

| Onderdeel | Waarde | Kosten | Plek | Oordeel |
| --- | --- | --- | --- | --- |
| Werken zonder account | De belofte van de landing; Ria, Joost, Durk werkten zo dagen achter elkaar | middel (IndexedDB, printupload per job) | goed | behouden |
| Inloggen met Google | Veilig bewaren, meerdere apparaten. Testers konden het niet testen; Bert wil geen Google | hoog: sync, conflicten, import, inactieve accounts, mail | goed | behouden; export als bestand blijft open (R4-2, B182) |
| Taalwissel NL/EN | Nodig voor Carlos en Emma; instructies volgen de site (B184) | middel | goed | behouden |
| Taal van de editie los van de site | Nodig: een Engelse editie op de Nederlandse site | laag | goed | behouden |

## Een slanker product

### Wat weggaat

- Dobbelstenen en Huisjes en hotels als onderdelen, met hun paginaplannen, instructies en Controle-regels.
- Accentkleur als los veld.
- Lagen op de kaartrug.
- De keuzes thema, onderdelen en munt op Nieuwe editie.
- Op de landing: "Zo plak je de bordsticker" en het blok "Maak het samen".
- Het blok "Bij de drukkerij" op de printpagina.
- Groepskleur in het straatpaneel (staat in Uiterlijk).

### Wat samengaat

- Voorbeeldeditie en sjabloonvoorbeelden: één route.
- Plaatje voor de groepsapp en de editie delen: "Deel je bord" in het naammenu.
- Onderdelen (editor) en vinkjes (printpagina): alleen de printpagina kiest.
- Hoeveel geld? op twee plekken: alleen de printpagina.
- Printgids, instructie-PDF's, uitleg op de landing en bestelblad: één bron per onderdeel.
- Proefvel in de bordrij van de Drukkerij-set.
- Huisregels als kaart in de tab Kaarten.
- Icoonkeuze: drie opties in plaats van vier.

### Wat standaard wordt in plaats van een keuze

- Printpagina opent op Thuisprint, of op de set die deze browser laatst gebruikte.
- Thema en munt komen uit het sjabloon en de taal; wijzigen in de editor.
- Bedragen, Woorden en extra lagen zijn ingeklapt tot je ze opent.
- Spelregelboekje, uitnodiging en deksel staan in de editor altijd klaar; aan of uit is een vinkje bij het printen.
- Na "Set maken" komt de ZIP vanzelf.
- Minibord ingeklapt op lage schermen.

## Beslissingen voor Niek

1. Mag Onderdelen als keuze uit de editor, zodat alleen de printpagina bepaalt wat je print? De editor toont dan altijd alles (Doos en Geld altijd zichtbaar), de printpagina heeft de vinkjes en Hoeveel geld?. Dit vervangt B99 deels: overslaan blijft, maar op één plek. Advies: ja. Het lost vindbaarheidsprobleem 1 op zonder lichte rijen of Aanzetten-knoppen.

2. Mag de printpagina standaard op Thuisprint openen (of op de laatste set van deze browser), met Drukkerij als tweede keuze? Dat wijkt af van B22 (drukkerij als hoofdroute). Advies: ja. De meeste testers printten thuis of bij de kopieerwinkel, en daar hoort Thuisprint bij.

3. Mogen Dobbelstenen en Huisjes en hotels eruit? Ze gaan tegen het plan in (die haal je uit je eigen doos) en niemand vroeg erom. Bestaande edities negeren het onderdeel. Advies: ja, schrappen. Als je ze wilt houden: alleen als rij op de printpagina, zonder element in de editor.

4. Mag het aantal sjablonen naar zes (Je dorp of wijk, Vriendengroep, Familie en verjaardag, Bedrijf, club of school, Bruiloft en vrijgezellen, en Leeg), met "Kaarten leegmaken" (B194) en "Namen leegmaken" als vangnet? Dit vervangt B159 en B186 deels. Advies: ja. Minder teksten om bij te houden, en neutrale sjablonen passen bij meer groepen dan specifieke.

5. Mag Samen maken bevroren worden: niets meer erbij bouwen tot echte groepen het gebruiken, het plaatje naar "Deel je bord" in het naammenu, en het blok weg van de landing? Advies: ja.

6. Mag de accentkleur weg? Advies: ja, het effect is klein en niemand zocht het. Wil je hem houden, laat hem dan ook de middenbalk kleuren, anders zoekt iedereen hem op de verkeerde plek.

7. Mag het spelregelboekje uit de editor (alleen een rij op de printpagina, zonder foto-optie)? Advies: ja. Het blijft een onderdeel dat je aanvinkt; het paneel met alleen een foto voegt niets toe.

8. Mag de printgids de enige bron voor printuitleg worden, met bestelblad en instructies in de ZIP daaruit gemaakt, en zonder knop Instructies per rij? Advies: ja. Dit raakt B67 niet (die zegt al: dezelfde bron) en maakt B185 kleiner.

9. Wil je een anonieme telling per functie op de server (aantal printjobs per onderdeel, aantal Samen maken-links, gebruik van sjablonen), zonder cookies en zonder persoonsgegevens? Advies: ja, alleen tellers in MongoDB of Pulse. Zonder gebruiksgegevens blijft elke volgende review gissen op basis van testers met een script.
