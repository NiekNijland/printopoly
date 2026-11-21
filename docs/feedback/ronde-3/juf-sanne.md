# Feedback ronde 3: basisschooljuf die klassenspellen maakt (laptop, 1280 × 800)

Persona: Sanne, 34, juf in groep 6. Ze maakt een editie voor haar klas met schoolgebouwen, namen van leerlingen en leerzame Kans- en Algemeen Fonds-kaarten. Ze wil een goedkope printerset voor meerdere exemplaren en leest de printinstructies goed. Daarnaast een editie voor het personeelsuitje.

Gemaakt:

1. **Groep 6 de Regenboog**: leeg sjabloon, thema Strak, Nederlands, euro. Alle 34 straten, stations en hoeken hernoemd (klaslokaal, gymzaal, "Het bankje van Daan", "Emma's tekentafel", "Fietsenstalling Noord" enzovoort). Beide stapels uitgebreid van 16 naar 32 kaarten, met bedragen (ontvangen of betalen). Woorden aangepast (schooltje, campus, "de nablijfklas", bank "De Schoolbank"). Zeven foto's op vakken, waaronder een piepkleine. Huisregels ingevuld. Onderdelen: bord, eigendomsbewijzen, kaarten, speelgeld, huisregels, spelregelboekje, huisjes en hotels, dobbelstenen. Geprint: Thuisprint-set, alles (6 onderdelen).
2. **Groep 3 Leesdorp**: sjabloon "Je dorp of wijk", Strak, Nederlands, euro. 9 vakken hernoemd, 2 foto's, 6 extra kaarten per stapel (22 per stapel). Geprint: Drukkerij-set (ik wilde Thuisprint, zie bug 4).
3. **Personeelsuitje 2026**: sjabloon "Bedrijf of team", Strak, Nederlands, euro. 11 vakken hernoemd, 2 foto's, 4 extra kaarten per stapel (20 per stapel). Geprint: Drukkerij-set (bord en kaarten).

Alles ging op een laptop van 1280 px breed, headless Chrome, zonder inlog.

## Samenvatting

Het voelt als een echt gemaakt product. Het bord is snel naar eigen smaak om te bouwen, de kaarten volgen de nieuwe vaknamen vanzelf (variabelen), en de Controle vindt de waas van de kleine foto meteen. De printpagina is helder en de PDF's staan binnen 40 seconden klaar. Het mooiste is de bordvoorbeeld in Strak en de eigendomsbewijzen. Het grootste probleem voor mij als juf: een set voor een hele klas is zwaar. Het speelgeld alleen is 35 vellen A4 en er is geen keuze voor minder biljetten of meer exemplaren. Verder is de Enter-toets in de huisregels onbetrouwbaar en het kaartenscherm voelt na 32 kaarten onoverzichtelijk.

## Werkt niet (bugs)

1. **Enter in huisregels verliest regeleinden.** Waar: Doos, Huisregels, veld Regels. Wat: ik typte acht regels met Enter ertussen. Telkens de eerste Enter na een regel leek niet te werken: regel 1 en 2 stonden samen op één regel op de kaart ("...per bank.De bankier is..."). Daardoor werden acht regels vier genummerde regels. Verwacht: elke Enter een nieuwe regel. Ernst: hinderlijk (mogelijk alleen bij snel typen; ik probeerde ook met pauzes, zelfde uitkomst). Stappen: Doos, Huisregels, klik in Regels, typ tekst, Enter, typ tekst, Enter. Screenshot: `img/juf-sanne/24-huisregels.jpg`.
2. **Schermranden bij scrollen.** Na het scrollen van de kaartenlijst (veel kaarten) scrolt soms de hele pagina een beetje mee: onderaan blijft een lege strook zichtbaar (zie `11-kans.jpg`, onderkant). Ernst: klein, niet altijd te reproduceren.
3. **Printpagina houdt niets over na herladen (niet zeker).** Na het maken van de set zag ik de PDF-knoppen. Toen ik de pagina opnieuw laadde, vond ik de download-links niet meer terug via de pagina, terwijl Mijn edities wel "Thuisprint-set klaar tot 28 nov" zegt. Ik heb dit niet goed uitgezocht; kijk of de links na herladen terugkomen. Ernst: onzeker.
4. **Omschakelen naar Thuisprint-set lukt mij niet met een script-klik, wel met een echte muisklik.** Waarschijnlijk geen echt probleem, maar de schakelaar is geen gewone knop en reageert niet op `.click()`. Bij Groep 3 Leesdorp stond de knop op een andere plek (kortere titel) en klikte ik per ongeluk niet, dus kreeg ik een Drukkerij-set. Ernst: klein.

## UX: wat kan beter

1. **Meerdere exemplaren printen.** Waar: printpagina. Ik wil de set voor 6 groepjes. Er is geen aantal. Ik moet zelf vellen vermenigvuldigen. Voorstel: een aantal-veld ("aantal sets") dat in de instructie het aantal vellen en snijwerk uitrekent, en een melding hoeveel papier dat is.
2. **Speelgeld is veel papier.** 210 biljetten, 35 vellen A4, zonder keuze. Voor een klas is een kwart genoeg. Voorstel: per coupure het aantal instellen, of een keuze "klein pakket".
3. **Kaartenlijst bij 32 kaarten.** In het kaartenscherm staan 32 tegels in het smalle linkerpaneel met afgekapte tekst. Zoeken naar een kaart gaat langzaam. Voorstel: filter of zoekveld, en tonen of de tekst nog een bedrag heeft. Prima dat er onderaan staat: "Deze stapel heeft 32 kaarten. Meer kan niet."
4. **Het bedrag op een kaart.** Voor mijn quizkaarten zou ik naast "Ontvang € 50" willen dat de vraag en het antwoord op de kaart staan (antwoord op de achterkant). Nu is alles één tekst. Voorstel: optioneel antwoordveld.
5. **Elk vak apart hernoemen is veel klikwerk.** 34 vakken, elk klik plus typen. Voorstel: lijst-weergave waarin je alle namen achter elkaar kunt invullen (Tab van veld naar veld), of plak een lijst.
6. **Lijst met vakken in "Vak kiezen" verandert van volgorde in de DOM zodra een vak gekozen is.** Dat is onzichtbaar voor mij als gebruiker, maar de lijst springt wel: zodra je een vak aanklikt komt er een "Vak kiezen"-knop bij boven de lijst. Klein.
7. **Eigendomsbewijzen zijn niet apart uit te zetten.** Bij een nieuwe editie staat het uitgelegd ("nodig als je straatnamen verandert"), maar in de printpagina horen ze bij de kaarten en kan ik ze niet los printen op ander papier. Voorstel: los onderdeel.
8. **Instructies voor thuis.** De instructie "Kaarten en eigendomsbewijzen" is duidelijk en bevat de uitlijntest. Maar voor een hele klas mist een korte tip: print één set en maak kopieën, of print de PDF's meermaals. Voorstel: een alinea "Voor een klas".
9. **Bij een vak op de printpagina staat geen paginatelling per editie bij meerdere sets.** Zie wens 1.
10. **Taal van vaknamen.** "In de cel" blijft op het bord staan als hoeknaam, ook al heet het vak "Op bezoek bij de directeur". Aanpasbaar via het vak zelf, maar de tekst "In de cel" op het getekende hokje bleef zichtbaar. Voorstel: dezelfde naam gebruiken of het woord in de instellingen laten kiezen.

## Ontwerp

- Strak is netjes en bruikbaar voor school: veel wit, gekleurde balken, goed leesbaar. In het voorbeeld ziet het bord er verzorgd uit (`22-voorbeeld.jpg`).
- Eigendomsbewijzen in de PDF zien er goed uit, met de hypotheekwaarde en de bouwkosten. Het bedrag "€ 33" hypotheek naast "€ 30" op de achterkant klopt met de regels.
- Speelgeld: mooie biljetten, bankaam "De Schoolbank" staat erop. De biljetten zijn beige met een patroon; dat kost op een thuisprinter veel inkt.
- Foto's op het bord kloppen en worden netjes bijgesneden. De piepkleine foto (51 dpi) krijgt een duidelijke waarschuwing en blijft in het bord zichtbaar als wazige foto.
- Het kleine lettertype op vakken van het bord in het voorbeeld is op laptop moeilijk te lezen. In print is het groter, maar controleer het op een proefvel.
- PDF's: bord 7 vellen A4 met snijtekens, kaarten 24 pagina's inclusief uitlijntest, speelgeld 35 pagina's, spelregelboekje 8 pagina's, huisjes 3, dobbelstenen 1, instructiebladen van 1 pagina per onderdeel. Drukkerij-kaarten: 138 pagina's voor 69 kaarten, elk een eigen pagina.

Afbeeldingen: `img/juf-sanne/` (o.a. `pdf-e1-kaarten-geld-instructies.jpg`, `pdf-e1-bord.jpg`, `pdf-e3-kaarten.jpg`).

## Features die ik zou willen

- **Aantal sets / klasset** (must): ik print voor 6 groepjes. Rekent vellen uit en kan alles meerdere keren in één PDF zetten.
- **Speelgeld in aantallen kiezen** (must): minder biljetten per coupure, zodat het geen 35 vellen is.
- **Lijst van namen plakken** (nice): alle straatnamen in één keer plakken, bijvoorbeeld de leerlingnamen van de klas.
- **Antwoord op de achterkant van een quizkaart** (nice): ik gebruik de kaarten voor rekenen en spelling.
- **Zoeken in kaarten** (nice): bij 32 kaarten per stapel.
- **Foto's van leerlingen in één keer uploaden en toewijzen** (nice): meerdere foto's tegelijk, elk aan een vak.
- **Eigendomsbewijzen apart printen** (nice): op ander papier of kleur.
- **Sjabloon "School"** (nice): een sjabloon met klaslokalen en schoolstraten als startpunt.

## Wat goed werkte

- Nieuwe editie: sjabloon, thema en onderdelen op één pagina, met live voorbeeld rechts.
- Kaartteksten volgen de vaknamen (variabelen), dus "Wandel naar Sara's leeshoek" past zich vanzelf aan.
- Maximaal 32 kaarten per stapel is duidelijk gemeld, en het toevoegen van een kaart met bedrag is snel.
- Controle meldt de foto met te lage resolutie, met naam van het vak.
- PDF's klaar in 40 seconden, instructies per onderdeel in de ZIP.
- Autosave werkt binnen een seconde, ook met veel kaarten. Mijn edities toont de printstatus per editie.
