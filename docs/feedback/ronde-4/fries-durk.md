# Feedback ronde 4: boer in Friesland op trage verbinding (Android 360 × 740, slow 3G)

Persona: Durk, 47, boer bij Wergea in Friesland. Goedkope Android (360 × 740), slecht mobiel netwerk op het erf. Hij maakt edities van zijn dorp, zijn boerderij en de ijsclub, en print thuis. Hij let op laadtijd, op wat de site laat zien terwijl hij wacht, en op wat er gebeurt als de verbinding wegvalt.

Testopstelling: headless Chrome met Android-useragent. Via CDP `Network.emulateNetworkConditions` op 400 kbit/s, 400 ms vertraging, en CPU 4 keer trager. Voor "verbinding weg" zette ik 20 seconden `offline` aan. De eerste bezoeken (zonder cache) staan apart genoemd, daarna had de browser de bestanden in de cache. Alle cijfers komen van één run per meting, dus lees ze als richting.

Gemaakt:

1. **Wergea en omkriten**. Sjabloon Je dorp of wijk, thema Klassiek, Nederlands, euro. Zes vakken hernoemd naar Friese namen (Skûtsjesilen, Ôfslútdyk, It Âld Swimbad, Coöperatie Wergea, Café De Grutte Pier, Kantine fan de IJsclub), De Tsjerke fan Wergea met plaats en foto, Bakkerij Wiersma Wergea, foto van de boerderij in het midden. Geprint: thuisprint, bord (7 vellen) en kaarten (16 vellen).
2. **Pleats Hiemstra**. Leeg, thema Strak (zwart-wit, zuinig op inkt), Nederlands, eigen munt "Fryske daalder" met teken "fd". Vakken hernoemd (De Skuorre met foto van 6,9 MB, It Greide met een piepkleine foto, De Stâl, Melkfabryk Wergea, Sleat de Wiide Ie, Tún fan Heit en Mem, Treinstasjon Wergea). Geprint: thuisprint, bord en kaarten.
3. **IJsklub De Swalkers**. Sjabloon Club of vereniging, thema Riso, Nederlands, euro. Logo in het midden, vijf vakken hernoemd (It Klubhûs fan de Swalkers, Kantine Op 'e Iis, Jeugd fan 6 oant 12, Tribune Westein, Alvestêdetocht), De Iisbaan fan Wergea met foto. Geprint: thuisprint met alles (bord, kaarten, speelgeld 24 pagina's, pionnen, doosdeksel). Dit was de enige keer dat ik het speelgeld maakte.

Samen maken-links heb ik niet gemaakt.

## Samenvatting

Op trage verbinding werkt het meeste verrassend goed. Foto's worden op de telefoon zelf verwerkt, dus een foto van 2 tot 7 MB staat binnen 1 tot 3 seconden in de editor, ook met 4 keer trage CPU. Bewerken en het voorbeeld werken helemaal zonder verbinding en niets raakt kwijt. De Friese tekens (û, â, ô, ê, ö) komen goed in de PDF's. Het grootste probleem is wachten bij het printen: de foto's gaan in hun geheel naar de server, de teller blijft op "Foto's uploaden: 0 van 2" staan, en dat duurde bij mij 142 seconden zonder iets te laten zien dat er vooruitgang is. De eerste bezoeken zijn ook zwaar: de landingspagina deed er 9 seconden over en een eerste "Editie maken" bijna 7 seconden op een lege beige pagina met alleen "Edities laden...". Valt de verbinding weg tijdens het printen, dan krijg je een algemene foutmelding of helemaal geen melding.

## Werkt niet (bugs)

### 1. Printen met zware foto's blijft minuten op "0 van 2" staan, zonder voortgang
- Waar: printpagina, Thuisprint-set, "Set maken".
- Wat gebeurde: edities met een grote foto (Pleats Hiemstra, foto uit mijn test van 6,9 MB, bewust ruiswerk zodat hij niet wegcomprimeert) deden 142 seconden over "Foto's uploaden: 0 van 2". De teller ging in die tijd niet omhoog. Bij edities met kleine foto's (Wergea, IJsklub) was het 9 en 7 seconden.
- Verwacht: een voortgangsbalk (bytes of procent), of minstens een teller die per foto omhoog gaat, en een schatting. Liever nog: de foto's op de telefoon kleiner maken voor het uploaden, zoals de editor al doet voor het scherm.
- Ernst: hinderlijk. Mijn testfoto is zwaarder dan een gewone telefoonfoto, maar op het erf kan een gewone foto van 3 MB ook een minuut kosten.
- Stappen: editie met grote foto, netwerk op 400 kbit/s, Thuisprint-set, "Set maken". Zie `img/fries-durk/72-upload-26s.jpg`.

### 2. De uploadmelding staat ver onder in de pagina, boven staat alleen een grijze knop "Bezig…"
- Waar: printpagina op 360 px.
- Wat gebeurde: de regel "Foto's uploaden: 0 van 2" staat ruim 1400 px onder de kop. In het beeld bij de knop zie je alleen een grijze knop "Bezig…" en "Samen 15 vellen A4". Wie niet doorscrolt weet niet waar hij op wacht.
- Verwacht: de status in de vaste onderbalk, naast of onder "Bezig…".
- Ernst: hinderlijk. Screenshot: `img/fries-durk/72-upload-26s.jpg`.

### 3. Verbinding weg tijdens "Set maken": algemene melding, en daarna een herstart nodig
- Waar: printpagina, direct na "Set maken".
- Wat gebeurde: ik zette de verbinding 12 seconden na de start uit. De aanvraag `generate` mislukte en er kwam "Er ging iets mis. Probeer het opnieuw." Dat is correct, maar het zegt niets over verbinding. Na terugkomst van het netwerk gebeurde niets vanzelf. Met "Set maken" opnieuw ging het wel goed: de bestaande job werd hergebruikt (geen tweede upload) en was binnen 10 seconden klaar.
- Verwacht: "Geen verbinding. Probeer opnieuw zodra je weer internet hebt", en liever een knop "Opnieuw proberen" of automatisch weer proberen.
- Ernst: hinderlijk. Screenshot: `img/fries-durk/44-printing-offline.jpg`.

### 4. Verbinding weg terwijl de server werkt: geen enkele melding
- Waar: printpagina, tijdens "WORDT GEMAAKT".
- Wat gebeurde: de statusaanvragen mislukten 20 seconden lang stil. Op het scherm bleef "WORDT GEMAAKT" staan, alsof alles goed ging. Zodra het netwerk terug was (binnen 2 seconden) sprong alles naar "KLAAR". Dat herstel is goed. Maar wie 20 seconden naar een stilstaand scherm kijkt, weet niet of het hangt of zijn netwerk weg is.
- Verwacht: een kleine regel "Geen verbinding, we proberen het blijven doen" in de balk.
- Ernst: klein tot hinderlijk. Screenshot na 20 seconden offline, nog steeds "WORDT GEMAAKT" en geen melding: `img/fries-durk/j5-offline20.jpg`.

### 5. Een pagina herladen zonder verbinding geeft de Chrome-dinosaurus
- Waar: elke pagina, ook de editor.
- Wat gebeurde: de editor zelf blijft werken als hij al open staat, maar een herlaad (of een link openen) zonder netwerk toont de standaard Chrome-foutpagina. De edities zitten lokaal in de browser, dus de gegevens zijn er wel.
- Verwacht: een offline-schil (service worker) zodat de editor ook zonder verbinding opent. Voor iemand met wisselend bereik is dat meer waard dan een snellere eerste keer.
- Ernst: klein tot hinderlijk (afhankelijk van de wensen, zie Features). Screenshot: `img/fries-durk/92-offline-editor-laden.jpg`.

### Geen bug: wijzigingen vlak voor sluiten (ronde-3 nummer 3)
Mijn vakken bleven behouden als ik naar een andere pagina ging, ook als dat binnen een halve seconde na het typen was. Eén keer ging een wijziging verloren, maar dat was door mijn script: ik sloot de hele browser binnen 0,4 seconden na het typen. Een echte gebruiker die het tabblad sluit, doet dat meestal wel zo snel; ik heb dat niet kunnen testen. Ik zet het daarom niet als bug.

## UX: wat kan beter

- **Eerste "Editie maken" is een lege beige pagina.** Waar: na "Editie maken" bij eerste bezoek zonder cache (6,7 seconden). Je ziet alleen de tekst "Edities laden..." midden op een lege pagina (`img/fries-durk/06-editor-0s.jpg`). Voorstel: direct de kop en het geraamte van de editor tonen (grijze blokken waar het bord komt), zodat het voelt alsof er iets gebeurt. De tweede keer was het 0,7 tot 3,4 seconden en prima.
- **Geen teken van opslaan.** Waar: de editor. Je ziet "aangepast" met een stip bij een vak, maar nergens "opgeslagen". Bij een slecht netwerk (en bij wegvallende verbinding) wil Durk weten dat zijn werk veilig is. Voorstel: één regel boven in de editor, "Alles staat op dit toestel" of "Opgeslagen om 14:03". Dat het offline gewoon werkt weet je pas als je het hebt geprobeerd.
- **Zoeken in vakken: vind-resultaten zijn knoppen zonder zichtbare tekst in de toegankelijkheidsboom.** Waar: "Zoek een vak" in de editor. De resultaatrij heeft zijn naam alleen als `aria-label` (met ", aangepast" erachter), geen eigen tekst. Visueel prima, maar voor tools en schermlezers zonder label lastig, en het maakte het testen lastig. Klein.
- **Kaart "Editie" bovenaan de editor, met de naam "Editie".** Waar: boven het bord. De kaart heet "Editie" met als regel "Klassiek · Nederlands · €". Voor een nieuwe gebruiker is dat niet duidelijk als knop voor thema, taal en munt. Voorstel: "Thema, taal en munt" als titel.
- **Voorbeeld-venster op 360 px: het kruisje valt op een eigen regel.** Waar: Voorbeeld (V) op 360 px. De knoppen "−", "Passend", "+" staan op één regel en het sluitkruisje springt naar een tweede regel, daardoor gaat bovenin veel ruimte verloren (`img/fries-durk/23-offline-voorbeeld.jpg`). Voorstel: kruisje links of rechts in de kopregel, zoomknoppen eronder.
- **Onderbalk op de printpagina kapt de tekst af.** Waar: Thuisprint-set bij edities met alles: "Samen 40 vellen A4 en 1 vel A3, waarvan 24…". Je leest niet waar de 24 vellen voor zijn. Voorstel: twee regels toestaan, of de samenvatting kort houden ("41 vellen") en de rest in het uitklapdeel.
- **Logo in het midden staat diagonaal.** Waar: Midden van het bord, optie Logo. Een vierkant logo met tekst ("IJC") komt 45 graden gedraaid op het bord, het wordt een ruit en de letters zijn bijna niet te lezen (`img/fries-durk/82-logo-gezet.jpg`, `img/fries-durk/91-mijn-edities.jpg`). Er staat bij dat het logo "in plaats van de naam" komt, maar niet dat het meedraait met het lint. Voorstel: bij Logo de keuze "recht" of "schuin", of een korte uitleg erbij.
- **Lage-resolutiewaarschuwing is helder.** Een foto van 160 px breed gaf direct "102 dpi, te laag" en een Controle-melding (`img/fries-durk/64-controle.jpg`). Dit werkt goed, maar de melding kon bij Pleats Hiemstra ook voor het eigendomsbewijs staan: "75 dpi", twee losse meldingen voor één foto. Eén melding met "ook op het eigendomsbewijs" zou rustiger zijn.

## Ontwerp

Het kleurrijke, speelse uiterlijk werkt ook op een klein scherm. De landingspagina, de sjabloonkaarten en de kop met het bord ogen af (`img/fries-durk/01-landing-1.5s.jpg`). De editor op 360 px is overzichtelijk met bord, tabs en zoekveld (`img/fries-durk/08-editor-idle.jpg`).

De PDF's zien er goed uit:
- Bord in stukken met knipstreepjes en kruisen, namen leesbaar (`img/fries-durk/e1-board-montage.jpg`, `img/fries-durk/e2-board-montage.jpg`, `img/fries-durk/e3-board-montage.jpg`).
- Eigendomsbewijzen met Friese namen in hoofdletters, û en ô blijven heel (`img/fries-durk/e1-cards-montage.jpg`).
- Strak (zwart-wit) is voor thuisprint met een goedkope printer een goede keuze: duidelijk en zuinig. Het hoekvak en de kaarten zijn grijs in plaats van gekleurd.
- Speelgeld in Riso (`img/fries-durk/e3-money-montage.jpg`) is mooi: roze met het lint met de editienaam.
- Eigen munt "fd" verschijnt overal waar bedragen staan (bord, kaarten, "Betaal fd 100").
- Het logo, in stukken over twee bordvellen, is op het bordvel gesneden zoals het hoort (diagonaal), maar bij een logo met tekst wordt het raadsel hoe het eruit moet zien na het plakken (zie UX).

Kleine dingen: de grote vaste "Editie maken"-knop op de nieuwe-editiepagina bedekt onderaan de voettekst; de mini-bordjes op de kaart "Editie" zijn op 360 px klein maar herkenbaar.

## Features die ik zou willen

- **Voortgang bij het uploaden van foto's (bytes of procent) en foto's kleiner maken voor ze worden verstuurd.** Waarom: op het erf is het netwerk traag en wil Durk weten of het nog loopt. Belang: must.
- **Foutmelding bij wegvallende verbinding met "Opnieuw proberen", of automatisch hervatten.** Waarom: Durk zit soms halverwege in de lucht van het bereik. Belang: must.
- **Offline openen van de editor (service worker).** Waarom: edities zitten al lokaal, dus alleen de pagina zelf ontbreekt. Voor de schuur of het veld is dat ideaal. Belang: nice, maar voor deze persoon bijna must.
- **Duidelijke "opgeslagen"-aanduiding.** Waarom: zekerheid dat niets kwijtraakt bij wegvallend bereik. Belang: nice.
- **Een lichte eerste lading (laadscherm met het geraamte van de editor, minder tekstlettertypen).** Waarom: de eerste bezoeken zijn 7 tot 12 seconden. Belang: nice.
- **Voor een logo de keuze tussen recht en schuin in het midden.** Waarom: ijsclublogo's zijn vaak vierkant of rond met tekst. Belang: nice.

## Wat goed werkte

- Foto's verwerken op de telefoon: 2,4 MB in minder dan 3 seconden, 6,9 MB in ongeveer 1 seconde, ook met 4 keer trage CPU en zonder netwerk.
- Bewerken, bord en kaarten, en het Voorbeeld werken volledig zonder verbinding, en de wijzigingen staan er na terugkomst nog (`img/fries-durk/23-offline-voorbeeld.jpg`).
- Terugkeer van het netwerk tijdens het maken: de statuscontrole pakte het binnen 2 seconden op, zonder dat ik iets hoefde te doen.
- Een tweede keer "Set maken" na een mislukte poging hergebruikt de bestaande job: geen nieuwe upload, klaar in 10 seconden.
- Printtijd na de upload was kort: bord en kaarten binnen 10 seconden; de volledige set met speelgeld (24 pagina's), pionnen en doosdeksel in ongeveer 25 seconden.
- Friese tekens (û, â, ô, ê, ö) blijven in bord en kaarten-PDF heel; de lettertypes zijn ingebed.
- De waarschuwing "102 dpi, te laag" bij een kleine foto is duidelijk en wijst naar Controle.
- Eigen munt komt overal op de goede plek terecht, ook in de standaard kaartteksten.
- Meetpunten op 400 kbit/s met 4 keer trage CPU: landingspagina eerste bezoek: inhoud na 9,3 s, eerste tekst na 4,7 s, alles klaar na 12,4 s, 394 KB in 31 aanvragen. Nieuwe-editiepagina met cache: 1,3 s tot inhoud, 4,4 s klaar. Printpagina met cache: 1,4 s en 4,6 s. Mijn edities met cache: 3,6 s.
