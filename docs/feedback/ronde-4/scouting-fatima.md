# Feedback ronde 4: Fatima, leidster bij een scoutinggroep, drie edities op de telefoon (iPhone 393x852)

Persona: Fatima, 26, leidster van een scoutinggroep. Ze werkt alleen op haar iPhone (393 px, 3x). Ze wilde een groepsspel maken met input van drie kinderen via Samen maken, plus een kampweek-editie en een editie voor de leiding. Geen account gebruikt.

Gemaakt:

1. **Scouting De Zonnestraal.** Sjabloon Club of vereniging, thema Klassiek, Nederlands, euro. Ondertitel "Het Scoutingspel". 33 vakken hernoemd (Het Scoutinghok, De klimboom, Het bivak, De Jamboree, enzovoort), 7 woorden aangepast (tent, blokhut, kampvuurplek, keuken, strafbank, Verrassing, Kampkas). Foto op drie straten (Het Scoutinghok, De kampvuurkring, De klimboom), logo in het midden, een kaarttekst herschreven. Geprint: Thuisprint-set met bord (7 A4), kaarten (16 pagina's), speelgeld (24 pagina's), pionnen en doosdeksel (A3). Dat is de volledige set, ik kreeg mijn onderdelen niet uitgevinkt (zie bug 3). PDF's gedownload en bekeken.
2. **Kampweek Ameland.** Sjabloon Je dorp of wijk, thema Riso, Nederlands, euro. 18 vakken hernoemd, grote foto (4000 px), een piepkleine foto (120 px), een derde foto, en "Naam met foto" in het midden. Geprint: Drukkerij-set met bord en kaarten (4 panelen, 61 kaarten). PDF's gedownload en bekeken.
3. **Leiding in de Knoop.** Sjabloon Vriendengroep, thema Strak, Nederlands, eigen munt "knoopjes" (teken kn). Ondertitel "Alleen voor de leiding", 23 vakken hernoemd. Niet geprint.

Samen maken met de kinderen is niet gelukt: elke "Maak een link" gaf 429 (gedeeld IP, het dagelijkse limiet is op). Zie bug 1. Daardoor heb ik voorstellen, toepassen, weigeren en het plaatje voor de groepsapp niet kunnen testen.

## Samenvatting

Het voelt vrolijk en snel: sjabloon kiezen, naam typen, en je zit met de duim in de editor. Het mooiste vond ik de vergrote bordweergave met alle namen, de foto's die meteen op het vak en op het eigendomsbewijs staan, en de PDF's: bord, kaarten en geld zien er netjes uit. Mijn hernoemde woorden (tent, blokhut) staan overal. Het grootste probleem voor deze persona is dat Samen maken niet te testen was (429) en dat de foutmelding daarbij slecht te zien en te algemeen is. Daarnaast past het sjabloon-taalgebruik (clubhuis, supporters, bestuur, sponsor) slecht bij scouting, en kaartbedragen zitten vast aan 12 tot 18, terwijl een leidster "betaal 20" wil.

## Werkt niet (bugs)

**1. Samen maken: "Maak een link" geeft 429 en een algemene melding. Hinderlijk (gedeeld IP, maar de melding is te verbeteren).**
Waar: naammenu, Editie, Samen maken, Maak een link. Wat gebeurde: HTTP 429. Onder de rode knop staat alleen "Dat lukte niet. Probeer het nog eens." Die regel staat onder de vouw, ik zag hem pas na scrollen. Verwacht: "Te veel aanvragen, probeer het morgen weer" en de melding naast of boven de knop. "Probeer het nog eens" is hier misleidend, want opnieuw proberen helpt niet (ik probeerde het tweemaal met hetzelfde resultaat). Stappen: editor, Editie, Samen maken, Maak een link. Screenshot: `img/scouting-fatima/05-samen-429.jpg`.

**2. Resultaatpagina na printen is breder dan het scherm op 393 px. Hinderlijk.**
Waar: `/nl/print/<code>?set=printer` na het maken van de Drukkerij-set. De knop "Drukkerij-set downloaden (ZIP)" in de balk onderin loopt buiten beeld, de tekst wordt afgeknipt en de pagina krijgt 427 px breedte (mobiele browsers zoomen dan uit). Verwacht: de knop past op 393 px (bijvoorbeeld korter "ZIP downloaden"). De balk met "Thuisprint-set maken" past wel. Screenshot: `img/scouting-fatima/11-download-knop-uit-beeld.jpg`.

**3. Onderdelen uitvinken in de set lukte me niet via de checkbox in mijn script, dus bij Thuisprint stond alles aan. Klein, mogelijk alleen mijn script.**
Ik kon op de pagina wel zien dat er per onderdeel een vinkje staat. De totale balk zei "40 vellen A4 en 1 vel A3, waarvan 24 speelgeld". Dat is veel voor een leidster thuis (zie UX 3). Ik heb dit niet kunnen bevestigen als echte bug.

**4. Grammatica na hernoemen: "het dichtstbijzijnde kampvuurplek". Klein.**
Waar: kaarttekst "Ga naar het dichtstbijzijnde kampvuurplek". De standaardtekst gaat uit van "het station". Bij een woord met "de" klopt de zin niet. Verwacht: een woordgeslacht-keuze (de/het) bij Woorden, of een zin zonder lidwoord. Ook "In de cel" blijft staan op de hoek terwijl ik de gevangenis "de strafbank" noemde (PDF bord 1, `img/scouting-fatima/14-pdf-bord-1.jpg`).

**5. De foto "Naam met foto" in het midden raakt de plek voor de kaartstapel. Klein.**
Waar: Midden van het bord, Naam met foto. De foto staat deels over de rood gestreepte plek voor de stapel Algemeen Fonds. De hint zegt "zet daar niets neer", maar de standaardpositie doet dat zelf. Screenshot: `img/scouting-fatima/08-midden-foto-stapel.jpg`.

## UX: wat kan beter

- **Sjablonen met clubtaal (Club of vereniging).** Elke kaart gaat over clubhuis, supporters, bestuur, sponsor, bardienst, contributie. Voor scouting moet ik 32 kaarten herschrijven. De hernoemde vakken lopen wel mee in de kaarten, maar zinnen als "De supportersbus vertrekt bij De huurbus naar het kamp" lezen slecht (kaart 13, `img/scouting-fatima/06-kaartenlijst.jpg`). Voorstel: bij sjablonen een kaartenset-keuze (neutraal of per sector), of een knop "Kaarten van de standaardeditie gebruiken".
- **Kaartbedragen vast op 12 tot 18.** Ik tikte 20 voor "betaal aan de kampkas". Het veld liet 18 staan en toonde in rood "Maximaal 18. Het bedrag staat nu op 18." Dat voelt als een fout terwijl het een regel is. Voorstel: toon de grenzen vooraf ("kies 12 tot 18") en leg kort uit waarom, of laat een eigen bedrag toe met een Controle-melding. Screenshot: `img/scouting-fatima/07-bedrag-max.jpg`. (Zie ook B132, en ronde 3 wens "eigen bedragen buiten de 20%".)
- **Doosdeksel en Thuisprint.** Het doosdeksel staat op een A3-vel in de Thuisprint-set. Weinig thuisprinters hebben A3. Voorstel: een A4-variant of de optie standaard uit, met een regel erbij.
- **Totaal bij Thuisprint.** 40 vellen A4 en een A3 voor een scoutinggroep is veel. De "Hoeveel geld?" staat standaard op 2 tot 4 spelers (zacht aanbevolen), maar de balk toont de som niet per onderdeel zonder uitklappen. Voorstel: toon per onderdeel het aantal vellen in de kop.
- **Voorbeeld neemt veel plek op de telefoon.** In het vakpaneel staat het voorbeeld boven en het formulier eronder, het paneel scrolt in minder dan de helft van het scherm. Goed bedoeld, maar bij de lange Woorden-sectie zie ik weinig velden tegelijk. Voorstel: voorbeeld inklapbaar in een smalle strook zodra je typt.
- **Secties blijven open.** Open je Woorden terwijl Algemeen open staat, dan staan beide open en wordt de pagina lang. Voorstel: de vorige sectie inklappen (of een duidelijke knop "Alles inklappen").
- **Controle: 2.** Goed dat de dpi-melding het vak noemt. Voorstel: bij een te kleine foto ook de knop "Andere foto" meteen in de melding.

## Ontwerp

- Mooi: de editor op de telefoon (grote knoppen, duidelijke tabs Bord, Kaarten, Geld, Doos), het vergrote bord met namen en gekleurde groepen (`02-bord-vergroot.jpg`), de Controle-melding in geel (`09-controle.jpg`), de munt-keuze met voorbeeld ("kn 200" in het bord) (`12-munt-keuze.jpg`).
- PDF bord (Thuisprint): schoon, snijmarkeringen, "Bord 1" tot "Bord 7", logo in het midden loopt mooi over de panelen. De diagonale tekst "Zonnestraal" is groot. Zie `14-pdf-bord-1.jpg`.
- PDF kaarten: eigendomsbewijzen met foto, kleurbalk en huurtabel zien er verzorgd uit. De hypotheekkant (achterkant) is netjes. Uitlijntest op de eerste pagina's is een goed idee (`15-pdf-kaarten.jpg`).
- Speelgeld: een bankbiljet met guilloche, oogt echt (`16-pdf-geld-pionnen.jpg`). Pionnen zijn kale tekstkaartjes "Pion 1 ... Pion 8", zonder foto en zonder kleur. Voor een scoutinggroep is dat saai en een gemiste kans.
- Kampweek (Riso): roze/blauw oogt vrolijk en past bij een kamp. De 120 px foto is zichtbaar korrelig op de PDF, zoals de waarschuwing zei (`17-pdf-ed2-bord.jpg`).
- De Plaats-regel "geldt voor alle 3 roze straten" is handig, maar bij scouting wil ik per straat een eigen plek.

## Features die ik zou willen

- **Pionnen met foto van het kind of een eigen kleur en naam (must).** Kinderen willen hun eigen pion met een foto of hun scoutingnaam. Nu zijn pionnen nummers.
- **Neutrale kaartenset of kaartensets per sector, ook voor jeugdwerk (must).** Anders herschrijf ik 32 kaarten, op mijn telefoon.
- **Eigen bedragen op kaarten met een melding (nice).** "Betaal 20" is een normale wens.
- **Alles in één keer opslaan als lijst van namen plakken (nice).** Ik had de namen van 28 plekken al in de groepsapp. Plakken van een lijst in de vakken scheelt tien minuten.
- **A4-versie van het doosdeksel (nice).**
- **Een speel-quiz-kaart met antwoord achterop voor leden (nice).** Past bij een groepsavond.
- **Samen maken-limiet per editie in plaats van per IP (nice).** Een clubhuis of school heeft één IP. Ik kon vandaag geen link maken. Een duidelijke melding met de resetduur zou al helpen.

## Wat goed werkte

- Sjabloon kiezen, naam typen en editor openen is snel en eenvoudig op telefoon.
- Hernoemde woorden (tent, blokhut) komen overal terug, ook in kaarten en eigendomsbewijzen.
- Het vergrote bord met alle namen en de zoek-/volgende-knoppen onderin.
- De dpi-waarschuwing met naam van het vak en de verwijzing naar het eigendomsbewijs.
- Eigen munt (knoopjes met teken kn) in plaats van euro werkt direct in het bord.
- Printen: Thuisprint-set in 45 seconden, Drukkerij-set in 20 seconden, ZIP en losse PDF's, "Instructies" per onderdeel, uitlijntest bij kaarten.
- Geen console-fouten behalve de 429 van Samen maken.
