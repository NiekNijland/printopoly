# Feedback ronde 3: Pim organiseert een reünie en een 50e verjaardag, met vier vrienden op de telefoon (desktop 1440 en telefoon 390)

Persona: Pim, 50. Hij organiseert de reünie van zijn oude voetbalteam en maakt ook een editie voor zijn eigen 50e verjaardag. Hij werkt zelf op de desktop (1440 px). Vier vrienden (Henk, Rob, Wim en Dennis) spelen we op vier aparte telefoonprofielen (390 px, mobiele user agent, 3x). Zij sturen via de Samen maken-link straatnamen, kaartteksten, foto's en pionnen in, een deel met opzet dubbel, te lang, te klein of flauw. Pim beoordeelt, past toe en weigert via Van vrienden, sluit de link en maakt een nieuwe. Hij oordeelt over de hele samenwerkingsstroom en over het plaatje voor de groepsapp, en print de Drukkerij-set. Geen account gebruikt.

Gemaakt:

1. **VV Oostrum Reünie 1996.** Sjabloon Vriendengroep, thema Riso, Nederlands, euro. Pim hernoemde zes straten en zette speelgeld, doosdeksel, uitnodiging en spelregelboekje aan. Via Samen maken kwamen er 13 voorstellen binnen in de eerste ronde en 3 in de tweede (na sluiten en een nieuwe link). Toegepast: 12 (waaronder 4 pionnen met foto, 2 straten met foto, 3 kaartteksten, 2 plaatsnamen; één daarvan maakte ik daarna ongedaan). Geweigerd: 4 (de tweede naam voor hetzelfde vak, een flauwe kaart, een flauwe plaatsnaam en de te lange stadionnaam). Geprint: Drukkerij-set, alle zeven onderdelen (bord, kaarten, speelgeld, pionnen, doosdeksel, spelregelboekje, uitnodiging). PDF's gedownload en bekeken.
2. **Pim wordt 50.** Sjabloon Verjaardag, thema Riso, Nederlands, euro. Eigen foto op de eerste straat (team.jpg), speelgeld, doosdeksel en uitnodiging aan. Twee vrienden stuurden vier voorstellen in. Toegepast: 3, geweigerd: 1. Geprint: Drukkerij-set zonder speelgeld (bord, kaarten, pionnen, doosdeksel, uitnodiging). PDF's gedownload en bekeken.
3. **Oostrum Village.** Sjabloon Je dorp of wijk, thema Strak, Engels, dollar. Pionnen en speelgeld aan. Een vriend stuurde één pionvoorstel in via de Engelse vriendenpagina, toegepast. Geprint: Thuisprint-set zonder speelgeld (bord op 7 A4's, kaarten op 16 A4's, pionnen). PDF's gedownload en bekeken.

## Samenvatting

De samenwerking werkt in grote lijnen goed. De vriendenpagina is overzichtelijk, het voorbeeld van het vak verandert mee met wat je intikt, en je ziet wat je zelf gestuurd hebt. Voor Pim is het controleren per vak met Toepassen en Weigeren duidelijk, en de foto van Henk stond direct goed op het vak. Het mooiste vond ik dat een toegepaste naam en foto meteen op het bord en op de eigendomsbewijzen staan, en de drukkerijset binnen 40 seconden klaar was. Het grootste probleem is "Maak het plaatje" voor de groepsapp: dat geeft altijd een serverfout (500) op alle drie de edities, en dat plaatje is precies wat ik in de groepsapp had willen plakken. Daarnaast klopt er iets niet bij kaartteksten van vrienden: de tekst verandert, het bedrag onderaan de kaart niet, dus er staat "Betaal 15" boven "Betaal € 18". Ook is het lastig te zien welke voorstellen botsen: twee namen voor hetzelfde vak staan gewoon naast elkaar en blijven na toepassen van de ene staan.

## Werkt niet (bugs)

**1. "Maak het plaatje" voor de groepsapp geeft altijd een fout. Blokkerend voor dit onderdeel.**
Waar: Editie > Samen maken > Plaatje voor de groepsapp > Maak het plaatje. Wat gebeurde: rode melding "Het plaatje maken lukte niet. Probeer het zo nog eens." De aanvraag `POST /api/share-image` geeft HTTP 500. Het gebeurt op alle drie de edities (met foto's, zonder foto's, Nederlands en Engels), ook als er geen printopdracht loopt, en ook na een paar keer proberen. Verwacht: een afbeelding van het bord om samen met de link in de groepsapp te zetten. Stappen: editor openen, naammenu, Samen maken, Maak een link, Maak het plaatje. De rode foutmelding blijft staan, ook als je daarna een nieuwe link maakt of de link sluit. Screenshot: `img/organisator-pim/10-plaatje-mislukt.jpg`.

**2. Foto en naam van een vriend op een Algemeen Fonds-vak: naam wordt wel toegepast, foto is onzichtbaar en de tekst spreekt zichzelf tegen. Hinderlijk.**
Waar: Van vrienden in het vak Algemeen Fonds. Rob koos (per ongeluk, op de telefoon) het hoekvak Algemeen Fonds op het bord en stuurde foto en naam "Het Terras bij Rob". Toepassen zet de vaknaam op "Het Terras bij Rob", terwijl de tekst in het paneel zegt "Dit vak heet zoals de stapel: Algemeen Fonds". De foto staat wel in het paneel (miniatuur), maar het voorbeeld toont nog het standaardicoon, "Standaardicoon" blijft gekozen en de zoomknoppen zijn grijs. Verwacht: of het voorstel wordt voor dit vaktype niet aangeboden aan de vriend, of de foto wordt echt getoond, of de maker krijgt een waarschuwing. Screenshot: `img/organisator-pim/08-foto-op-algemeen-fonds.jpg`.

**3. Een toegepaste kaarttekst laat het bedrag onderaan ongemoeid. Hinderlijk, en je ziet het pas op de PDF.**
Waar: Kaarten, voorstel van een vriend toepassen. Wim stuurde "Je komt te laat bij de training. Betaal 15 aan de boetepot." Na Toepassen staat op de kaart de nieuwe tekst met onderaan nog "Betaal € 18" van de oude kaart. Bij "Je vindt nog een shirt van 1996 in de kast. Ontvang 50." staat onderaan "Ontvang € 20". Verwacht: een vraag bij het toepassen ("de tekst noemt een bedrag, het bedrag op de kaart is € 18, aanpassen?") of het bedrag mee laten voorstellen. Te zien in de PDF `cards.pdf` van de Drukkerij-set, pagina 79 en 103. Screenshot: `img/organisator-pim/18-pdf-kaarten-ed1.jpg`.

**4. Teller op de printpagina haalt nooit het totaal als je een onderdeel overslaat bij de Drukkerij-set en de Engelse thuisprint. Hinderlijk.**
Waar: Printen. Ik haalde "Speelgeld" weg (zwaar onderdeel). Bij de Thuisprint-set staat het vak dan netjes als "OVERGESLAGEN". Maar na het starten van de opdracht gaat de pagina naar de resultaatpagina (`/nl/print/<code>?set=printer`), waar Speelgeld weer als "NOG NIET GEMAAKT" staat, met "5 van 6 klaar" of "3 van 4 klaar" voor altijd. Bij mij leek het daardoor alsof er iets hing. De ZIP en de losse PDF's zijn wel beschikbaar. Verwacht: het overgeslagen onderdeel blijft overgeslagen en de teller is 5 van 5 (3 van 3). Mijn script wachtte over de twee minuten op "6 van 6". Screenshot: `img/organisator-pim/16-printpagina-5-van-6.jpg`.

**5. Ruwe vertaalsleutel op de vriendenpagina. Klein.**
Waar: telefoon, Plaatsen, kleur Bruin kiezen. Er staat "Nu: group.brown" in plaats van een naam (de kleurnaam of "nog geen naam"). Screenshot: `img/organisator-pim/04-vriend-group-brown.jpg`.

**6. Oude link na "Nieuwe link" geeft een kale 404. Hinderlijk.**
Waar: een vriend die de oude link nog heeft. Hij ziet "Deze pagina bestaat niet" (de algemene 404 met de landingspagina eronder). Een vriend die de eerste link al gebruikt had, snapt niet dat Pim een nieuwe heeft gemaakt. Bij "Link sluiten" gaat het juist goed ("Deze link is gesloten", met "Wat jij hebt gestuurd"). Verwacht: dezelfde melding bij een vervangen link ("Deze link is vervangen, vraag de maker om de nieuwe"). Screenshot: `img/organisator-pim/13-oude-link-404.jpg`.

**7. Toepassen laat een oude melding staan en is niet te zien. Klein.**
Waar: Van vrienden. Na "Toepassen" verschijnt "Toegepast op Kantine De Eendracht." helemaal onderaan het rechterpaneel, buiten beeld als het paneel lang is. Als je daarna naar een ander vak gaat, staat dezelfde melding ("Toegepast op Plaatsnaam voor Bruin.") daar nog steeds. Ongedaan maken haalt de wijziging terug, maar niet het voorstel zelf: het voorstel is dan weg uit Van vrienden en de melding blijft staan.

**8. Controle toont dezelfde waarschuwing twee keer. Klein.**
Waar: Controle. "Dennis de Verdediger die nooit terugliep · Doos: De tekst past niet, ook niet in de kleinste letter. Haal ongeveer 4 tekens weg." staat er twee keer. Screenshot: `img/organisator-pim/09-controle.jpg`.

**9. De knop "Van vrienden" springt niet naar "de volgende". Klein.**
Waar: linkerpaneel, "Van vrienden 13". Een klik brengt je naar het eerste vak met een voorstel, maar een tweede klik (nadat je er één toegepast hebt) blijft vaak op hetzelfde vak of een eerder vak hangen. Ik moest een paar keer klikken en herladen om bij alle voorstellen te komen. Geen duidelijke "volgende" en "vorige".

**10. Foto's op de pionnen en lange pionnamen. Klein.**
Waar: Doos, pionnen. Een vriend kan een pionnaam van 40 tekens insturen. Dat wordt pas bij Controle (na toepassen) gemeld als "past niet". Op de PDF staat de naam heel klein. Zie ook UX hieronder.

## UX: wat kan beter

**Voor Pim als maker**

- **Conflicten tussen voorstellen.** Henk stuurde "Kantine De Eendracht", Rob "Kantine van Kees" voor hetzelfde vak. Beide staan onder elkaar. Als ik de ene toepas, blijft de andere staan zonder hint dat er al gekozen is. Voorstel: groepeer voorstellen per veld ("2 voorstellen voor de naam"), laat toepassen van de ene de rest van hetzelfde veld naar "Andere voorstellen" schuiven, met een knop "Alles voor dit veld weigeren".
- **Geen overzicht van alle voorstellen op één plek.** Alles zit per vak in het rechterpaneel onder "Stijl". Bij 13 voorstellen wil ik één lijst: wie, wat, welk vak, met miniatuur, en dan beoordelen in een rij. Nu klik ik zes keer op de knop en scroll ik in elk paneel naar beneden.
- **Wie heeft wat gestuurd.** De naam van de vriend staat bij elk voorstel, dat is goed. Maar ik zie niet hoeveel er per vriend binnen is of welke vriend nog niets heeft gestuurd (ik stuur de link in de groepsapp, dus dat wil ik weten).
- **Foto van een vriend: eerst zien, dan toepassen.** Het voorstel toont een miniatuur van 56 px. Ik wil het voorbeeld op het echte vak zien voordat ik toepas (zoals bij Voorbeeld), niet na het toepassen met Ongedaan maken.
- **Foto en naam apart toepassen.** Henks "Kantine De Eendracht" met foto werd als één ding toegepast. Soms wil ik de naam wel en de foto niet (of omgekeerd).
- **"Wacht op jou: Nog niets binnen. Zet de link in de groepsapp."** staat er ook als de link gesloten is en alles verwerkt is. Dat is misleidend. Toon in plaats daarvan "Alles verwerkt: 9 toegepast, 4 geweigerd."
- **Nieuwe link zonder bevestiging.** Een klik op "Nieuwe link" maakt direct een nieuwe en maakt de oude onbruikbaar. Het hulpje eronder ("De oude link werkt dan niet meer") staat klein. Een bevestiging is hier verstandig, zeker omdat "Alles verwijderen" er direct naast staat.
- **De rode foutmelding van het plaatje** blijft staan na elke andere actie in het paneel.
- **Uitnodiging zonder eigen tekst.** Ik organiseer een reünie en een verjaardag. De uitnodigingskaart zegt "SPELAVOND" en "Je bent uitgenodigd" met invullijntjes "Wanneer, Waar, Neem mee". Ik kan de kop niet aanpassen (bijvoorbeeld "Reünie 14 maart, De Eendracht" of "Pim wordt 50"). Voor deze persona is dat de belangrijkste kaart.
- **Printpagina bij een tweede klik binnen een minuut.** "Te veel aanvragen. Wacht een minuut" kwam twee keer: één keer toen ik net een paar plaatjes had geprobeerd en één keer vlak na een andere set. De melding is duidelijk, maar je moet zelf opnieuw klikken. Een automatische nieuwe poging na een minuut met een teller zou prettiger zijn.
- **"Aangepast: 63" op Mijn edities** zegt me niets. Aangepast waarvan? Een voorbeeld ("63 dingen aangepast") of weglaten.

**Voor de vrienden (telefoon)**

- **Een vak kiezen op het bord is nauwkeurig werk.** De tegels zijn op 390 px ongeveer 33 x 44 px. Mijn tikken landden regelmatig op de buurtegel (Rob kwam op Algemeen Fonds uit, Wim op De escaperoom in plaats van De Vaste Kroeg). De kop van stap 3 laat wel zien welk vak gekozen is, maar je moet het zelf controleren. Voorstel: bij tikken het gekozen vak groot tonen en een "Dit vak, klopt dat?"-regel, of een zoekbare lijst naast het bord.
- **Er is geen "voeg een kaart toe".** Een vriend kan alleen een nieuwe tekst voor een bestaande kaart voorstellen. Pim heeft extra kaarten (de editor ondersteunt die), maar de vriend kan er geen nieuwe bedenken. Voor "ik heb een goede grap voor Kans" is dat jammer.
- **Plaatsen heeft geen foto, Bord wel.** Dat verschil is niet uit te leggen aan een vriend. Het tabblad heet bovendien "Towns" in het Engels (zou "Areas" of "Neighbourhoods" moeten zijn) en toont alleen kleurnamen, waardoor niemand weet wat "Plaatsnaam voor Bruin" is.
- **Geen waarschuwing voor een te kleine foto of te lange naam.** Wim's foto van 80 x 60 px werd zonder bezwaar verstuurd. Het voorbeeld toont hem wazig, maar de vriend krijgt geen melding. De naam van Dennis (80 tekens) werd stil afgekapt op 40 ("…Die Ons Altij") zonder teken van afkappen. Voorstel: teller bij het veld en een gele regel bij een foto onder 600 px.
- **Emoji's verdwijnen stil.** "Dennis de Verdediger die nooit terugliep 😂" kwam bij Pim zonder emoji aan. Prima, maar vertel de vriend dat het niet kan.
- **De vriendenpagina onthoudt de voornaam.** Dat is handig. Wel hoort bij mijn dubbele "HenkHenk" dat het veld niet duidelijk toont dat de naam al bekend is (mijn script typte er een tweede keer bij, dus geen bug, maar op een telefoon kan dat ook gebeuren).
- **"Bekeken door de maker"** staat bij zowel toegepaste als geweigerde voorstellen. De vriend wil weten of zijn voorstel erin zit. Voorstel: "Toegepast" (groen) en "Niet gebruikt" (neutraal, vriendelijk).
- **Vriendenpagina in de taal van de editie.** De Engelse editie geeft een Engelse vriendenpagina, dat vond ik goed. Alleen "Towns" en de kleuren van de knoppen staan op het Engels niet helemaal in lijn met de rest.

**Overige**

- **Munt "M" bij Engels.** Bij Nieuwe editie met taal English stelt de pagina als munt "M" voor (Monopoly-geld). Voor een Engels sprekende neef is "$" of "£" logischer. Het zinnetje "Munt: M. Die volgt de taal." is verwarrend omdat M niet als een munt wordt herkend. Screenshot: `img/organisator-pim/23-engels-munt-m.jpg`.
- **Nieuwe editie, thema "Strak" kiezen** werkt met een klik op de miniatuur, maar de selectie is zichtbaar pas na scrollen in het paneel Editie > Uiterlijk. Dat is een beetje zoeken.
- **Onderdelen aanzetten** moet in de editor (Editie > Onderdelen). Op de printpagina staat "Niet in deze editie: speelgeld, doosdeksel. Aanzetten in de editor." als link, dat is handig en werkte.
- **Samen maken zit in het naammenu en in het Editie-paneel onder een lange scroll.** De pillen bovenaan (Algemeen, Uiterlijk, Woorden, Onderdelen, Bord, Samen maken) helpen, maar ik zocht eerst naar een knop in de kop.

## Ontwerp

- **Vriendenpagina:** vrolijk (roze kop, kleurbalk, grote knoppen), duidelijk in drie stappen, voorbeeld van het vak naast het invoerveld. De kaart met tekst en bedrag komt goed over. Het ziet er niet "goedkoop" uit. Screenshots: `img/organisator-pim/05-vriend-telefoon-voorbeeld.jpg`, `img/organisator-pim/14-vriend-engels.jpg`.
- **Editor en Van vrienden:** de voorstellen als kaartjes met "Toepassen" en "Weigeren" zijn netjes en kloppen met de rest. De rode stip bij het naammenu en de teller "13" in het linkerpaneel vallen op. Screenshot: `img/organisator-pim/06-voorstellen-in-vak.jpg`.
- **Printpagina:** nette lijst per onderdeel met miniatuur, status en knoppen. De miniatuur bij "Proefvel" is een lege kaders-tekening, die oogt niet af. Screenshot: `img/organisator-pim/15-printpagina.jpg`.
- **Mijn edities:** drie edities als schuine kaartjes met kleurbalk, statusregels voor Samen maken en klaarstaande set. Fris en duidelijk. Screenshot: `img/organisator-pim/22-mijn-edities.jpg`.
- **PDF bord (Drukkerij-set):** vier panelen van 254 mm (248 mm plus afloop). Straatnamen staan scherp en goed leesbaar. De foto van Henk op "Kantine De Eendracht" staat netjes in het vak, plaatsnaam erboven. De foto van 80 px (De Vaste Kroeg) is zichtbaar wazig en daardoor lelijk op een bord van 500 mm; Controle waarschuwde terecht (51 dpi). Screenshots: `img/organisator-pim/17-pdf-bord-ed1.jpg`, `img/organisator-pim/20-pdf-bord-ed2.jpg`.
- **PDF kaarten:** eigendomsbewijzen en Kans-kaarten zien er goed uit. Alleen het bedrag onderaan botst bij kaartteksten van vrienden (zie bug 3). Screenshot: `img/organisator-pim/18-pdf-kaarten-ed1.jpg`.
- **PDF pionnen:** foto's staan met naam op de vouwstrook, lege pionnen krijgen "Pion 5" enzovoort. De naam van Dennis is erg klein. Screenshot: `img/organisator-pim/19-pdf-doos-uitnodiging-pionnen.jpg`.
- **PDF doosdeksel:** erg kaal (naam, "Een spel voor 2 tot 8 spelers", vier iconen). Dat is op een kleurloos deksel van 267 mm een beetje armoedig, zeker voor een verjaardagsspel.
- **PDF uitnodiging:** mooi, met mini-bord. Maar zonder aanpasbare tekst (zie UX).
- **PDF speelgeld en spelregelboekje:** speelgeld (€ 1 biljetten, roze) ziet er verzorgd uit. Het boekje (16 pagina's) is helder en gebruikt de editienaam, de aantallen kloppen met de set (28 eigendomsbewijzen, 16 plus 16 kaarten).
- **PDF thuisprint (Engels, Strak):** het bord komt op 7 A4's, elk vak los, het middenstuk over twee vellen. Zwart-wit en rustig. De uitlijntest voor dubbelzijdig printen is er. Screenshot: `img/organisator-pim/21-pdf-thuisbord-ed3.jpg`.

## Features die ik zou willen

- **Eigen tekst op de uitnodiging** (datum, plaats, wat mee te nemen, wie je bent): voor de reünie is dit het eerste wat ik zou versturen. Must.
- **Voorstellen groeperen per veld en conflicten tonen:** bij vier vrienden die allemaal een naam voor "het clubhuis" bedenken is dat dagelijkse kost. Must.
- **Eén overzicht van alle voorstellen** (met wie, wat, waar, miniatuur, en snel toepassen of weigeren, ook voor meerdere tegelijk): Must.
- **Werkend plaatje voor de groepsapp** (nu 500): hierop was ik gekomen voor de stroom "maak link, plak plaatje, iedereen reageert". Must.
- **Vriend kan een nieuwe extra kaart voorstellen** (met tekst en bedrag): Must voor een vriendengroep met grappen. Nice voor andere groepen.
- **Bedrag meesturen bij kaartteksten** (of een waarschuwing als het bedrag in de tekst niet klopt met het bedrag op de kaart): Must.
- **Terugmelding naar de vriend** ("je voorstel staat erin" of "niet gebruikt, bedankt"), eventueel met een lijstje van wat erin kwam: Nice. Zorgt dat vrienden opnieuw meedoen.
- **Meldingen naar Pim bij nieuwe voorstellen** (bijvoorbeeld e-mail of een telefoonmelding met een dagelijkse samenvatting, zonder account kan dat ook via een privélink): Nice.
- **Vrienden mogen stemmen** op voorstellen ("welke naam voor het clubhuis?") zodat Pim niet alleen kiest: Nice.
- **Foto bijsnijden door de vriend voor verzenden** met een voorbeeld op het vak (ook op de telefoon): Nice.
- **Een melding bij te kleine foto en te lange tekst voor de vriend**, nog voor het verzenden: Nice.
- **Doosdeksel met foto of groter ontwerp**, zodat een verjaardags- of reüniespel een mooi deksel krijgt: Nice.
- **Standaard "overgeslagen" onderdelen onthouden** bij de printpagina (Speelgeld wil ik maar één keer maken): Nice.

## Wat goed werkte

- De vriendenpagina zonder account: link openen, voornaam, tikken, versturen. Hij werkt op de telefoon zonder uitleg, in NL en EN.
- Het voorbeeld van het vak op de vriendenpagina, met naam, foto en prijs, en de lijst "Wat jij hebt gestuurd".
- Foto's van 3200 tot 6000 px gingen vlot omhoog en kwamen goed uitgesneden op het vak. Controle noemde de foto van 80 px terecht (51 dpi).
- Een gesloten link toont vrienden een vriendelijke melding en hun eigen bijdragen.
- Emoji, HTML en lange namen worden veilig behandeld: `<b>test</b>` stond als gewone tekst in het voorstel, niet als opmaak.
- De Drukkerij-set (zeven onderdelen, inclusief 15 vellen speelgeld) stond in 40 seconden klaar en de ZIP en losse PDF's liggen er direct. De PDF's hebben afloop en snijtekens en de maten kloppen.
- Ongedaan maken na een toegepast voorstel haalt het vak netjes terug.
- De Controle-lijst met pionwaarschuwingen, dpi en tekst die niet past is concreet en helpt.
