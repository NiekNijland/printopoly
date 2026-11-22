# Feedback ronde 4: secretaris van een dorpsgemeenschap, nauwkeurig (desktop 1600 × 900)

Persona: Hans, 64, secretaris van een kerkelijke dorpsgemeenschap. Methodisch. Leest het regelboekje en elke instructie-PDF helemaal en legt ze naast de editie: woorden, munt, bedragen, aantallen kaarten. Maakt een editie voor het dorpsfeest (10 sets verkopen), een voor het koor en een voor de jeugdclub. Script via puppeteer, één profiel, geen Samen maken.

Gemaakt:

| Editie | Sjabloon | Thema | Taal | Munt | Aangepast | Geprint |
| --- | --- | --- | --- | --- | --- | --- |
| Dorpsfeest Sint-Joris | Je dorp of wijk | Klassiek | NL | € | 8 straten hernoemd, foto op Sint-Jorisbasiliek, huisregels herschreven met Enter, onderdelen aangezet (pionnen, doosdeksel, boekje, huisjes, dobbelstenen, uitnodiging) | Drukkerij-set, 10 sets (zonder speelgeld) |
| Zangkoor Cantate | Club of vereniging | Klassiek | NL | eigen munt Koorgulden, teken ƒ | ondertitel, woorden (lessenaar, podium), bank "De Koorkas", 2 straten hernoemd, alle onderdelen aan | Drukkerij-set, 1 set, met volledige bank (306 biljetten, 22 vellen SRA3) |
| Jeugdhuis De Schuur | Vriendengroep | Riso | NL | € | ondertitel, woorden (tent, kampvuur), bank "De Clubkas", 6 straten hernoemd, eerst een foto van 160 px (Controle sloeg aan), daarna vervangen | Thuisprint-set (zonder speelgeld) |

Alle drie de sets kwamen er. Ik heb de PDF's van alle drie de sets en alle instructies gelezen en nagelopen (de bord- en kaart-PDF's op maat en aantal, de boekjes en instructies woord voor woord). Het speelgeld heb ik één keer gemaakt (Zangkoor Cantate).

## Samenvatting

Voor iemand die alles naast elkaar legt, klopt het meeste. De aantallen kloppen: 61 kaarten is 28 bewijzen, 16 Kans, 16 Algemeen Fonds en 1 huisregelskaart. Het boekje zegt hetzelfde. De 306 biljetten uit de instructie komen precies uit op de 22 vellen, en het startgeld van € 1.500 is genoeg voor 8 spelers (round 3 bug 21 is opgelost). Eigen woorden staan nu overal: lessenaars en podia, tenten en kampvuren, de eigen munt ƒ, in het boekje, de prijslijst en de instructies (round 3 bug 7 en 17 opgelost). Het mooiste is het geld met de eigen munt en bankbenaming, en de instructie bij "Aantal sets" die alle totalen voor 10 sets uitrekent. Het grootste probleem zit in de kleine tegenstrijdigheden die alleen een nauwkeurig lezer ziet: het boekje noemt speelgeld in de doos terwijl de editie geen speelgeld heeft, een prijslijst die straatnamen afkapt, en in de thuisinstructies "zoals hierboven" zonder dat er iets boven staat.

## Werkt niet (bugs)

1. **Instructie verwijst naar niets.** Waar: instructies Pionnen en Doosdeksel, Thuisprint-set (`instructies-pionnen`, `instructies-doosdeksel`). Gebeurt: "Daarna werk je zoals hierboven" en "Voor de overige stappen geldt hetzelfde als hierboven", maar de stappen staan alleen in het Drukkerij-gedeelte, en dat deel ontbreekt in de thuis-PDF. Verwacht: de stappen staan in de PDF zelf. Ernst: hinderlijk. Stappen: Thuisprint-set maken met pionnen en doosdeksel, instructie openen. Bestand: `pdf/ed3/instr_tokens.pdf`.
2. **Straatnaam afgekapt met "…" in de prijslijst.** Waar: regelboekje, prijslijst deel 2. "De burgemeesterswoni…" en "De clubkampioenschap…", terwijl de naam op het bord wel heel staat. Verwacht: tekst krimpt of loopt over twee regels. Ernst: hinderlijk (de prijslijst is de plek waar spelers de naam opzoeken). Screenshot: `img/secretaris-hans/16-prijslijst-afgekapt.jpg`.
3. **Boekje noemt speelgeld in de doos terwijl de editie geen speelgeld heeft.** Waar: boekje hoofdstuk 1 ("speelgeld en een pion per speler") en hoofdstuk 2 (startgeld € 1.500 met opsomming), bij Dorpsfeest en Jeugdhuis, waar onderdeel Speelgeld uit staat. Verwacht: zin past zich aan ("speelgeld haal je uit je eigen doos") of hoofdstuk 2 noemt het als voorwaarde. Ernst: klein. Bij Zangkoor Cantate (met geld) klopt de zin wel en noemt zelfs "306 biljetten".
4. **Aantekeningenblad heeft Speler 1 tot en met 10 terwijl het spel 2 tot 8 spelers heeft.** Waar: boekje pagina 15, alle drie. Ernst: klein.
5. **Standaardtekst "dan krijg je 10" zonder munt.** Waar: huisregel 2 van het sjabloon Je dorp of wijk (ook op de huisregelskaart). Verwacht: "€ 10" of de eigen munt. Dit is round 3 bug 26, deels nog niet opgelost: kaarten en boekje hebben nu de munt, deze standaardregel niet. Ernst: klein. Screenshot: `img/secretaris-hans/02-huisregels-enter.jpg`.
6. **Knoppen "Standaard" lopen over de koppen heen in het blok Eigen munt.** Waar: Editie, Algemeen, na kiezen van Eigen munt. De knop "Standaard" bij Teken loopt voorbij de rechterrand van het paneel. Ernst: klein. Screenshot: `img/secretaris-hans/04-eigen-munt-knoppen.jpg`.
7. **Print-pagina en editor negeren eigen woorden bij het onderdeel Huisjes en hotels.** Waar: printpagina en onderdelenlijst: "Huisjes en hotels, 32 huisjes en 12 hotels" bij een editie met tenten en kampvuren. In de PDF en de instructie staat het wel goed. Ernst: klein.
8. **Eigen munt kiezen en niet invullen valt stilletjes terug op euro.** Waar: Editie, Munt. Ik koos "Eigen munt", sloot het paneel zonder naam, en de editie stond weer op €. Geen melding. Ernst: klein.

Niet meer aanwezig uit ronde 3: bug 10 (Enter in huisregels) werkt, bug 9 (printen vanuit Mijn edities toont "nog niet gemaakt") is opgelost, bug 7 en 17 (eigen woorden in boekje) zijn opgelost, bug 22 (248 × 248 mm vast) klopt nu met het bordprofiel.

## UX: wat kan beter

- **Sjablonen passen niet bij je doel.** Voor een koor koos ik "Club of vereniging" en kreeg ik een voetbalclub: hoofdveld, tribune, wedstrijdtafel, clubkampioenschappen en een Kans-kaart over de bekerfinale. Ik moest 30 straten en kaarten zelf aanpassen. Voorstel: een neutraler sjabloon "Vereniging" of een knop "Alle plaatsnamen leegmaken", zodat je geen voetbalwoorden overhoudt. Dit heb ik voor het koor maar bij twee straten gedaan.
- **Onderdelen die uit staan, vind ik pas bij het printen.** Het sjabloon Je dorp of wijk heeft alleen bord en kaarten aan. Op de printpagina staat "Niet in deze editie: speelgeld, pionnen, doosdeksel. Aanzetten in de editor." Dat is duidelijk, maar je moet terug naar de editor, het Editie-paneel, naar beneden scrollen tot Onderdelen. Voorstel: de link "Aanzetten" opent het Editie-paneel direct bij Onderdelen.
- **Het Editie-paneel is lang.** Alles staat in één scrollende kolom (Algemeen, Uiterlijk, Woorden, Onderdelen, Bord, Samen maken). De knoppenbalk met de zes ankers plakt bovenaan en bedekt tijdens het scrollen de eerste regel van de sectie. Voorstel: kleine ruimte onder de balk (scroll-padding).
- **Een straat selecteren kan alleen via het kleurvlakje links.** Klikken op de naam zet de naam in een tekstveld, wat bij de eerste keer verrast. Ik zocht even. Voorstel: eerste klik selecteert, tweede klik bewerkt de naam.
- **Uitnodiging: waar staat de tekst?** De instructie belooft "jouw tekst: datum, plek, wat iedereen meeneemt". In de editor heb ik die plek niet gevonden (de Doos-lijst toont wel het deksel, de pionnen, de huisregels en de extra onderdelen, maar ik heb de uitnodiging niet geopend), en de PDF toont alleen "Wanneer: ……". Als ik 10 sets maak voor het dorpsfeest, wil ik de datum erin zetten. Voorstel: Uitnodiging in de lijst bij Doos met drie velden.
- **Doosdeksel, hint in "Eigen regels" staat als voorbeeld "Kerst 2026, voor de hele familie".** Voor een dorpsfeest of koor is dat een vreemd voorbeeld. Voorstel: neutrale tekst als "Zaterdag 6 september, voor het hele dorp".
- **Aantal sets.** Goed gedaan: de instructies tellen alles op voor 10 sets ("samen 610 kaarten, 50 vellen A4 en 20 stuks"). Wat mij mist: bij speelgeld staat niets over aantal sets. Bij 10 sets met geld zou ik 3.060 biljetten moeten bestellen, en dat getal staat nergens. Voorstel: ook bij de keuze "Hoeveel geld?" en bij de instructie Speelgeld het totaal voor n sets.
- **Controle zegt "foto op dit formaat 102 dpi".** Duidelijk, en de waarschuwing bij het vak zelf helpt. Wat ik me afvroeg: wat is genoeg? Voorstel: "gewenst 200 dpi" in dezelfde zin.
- **Proefvel staat bovenaan, maar de uitleg "leg het hoekvak op je bord" geldt alleen als je zelf print.** Voor mij (sticker via drukkerij) is een proefvel precies goed. Ik zou het graag meteen willen starten zonder dat eerst iets anders hoeft.

## Ontwerp

Mooi: de bankbiljetten met eigen munt en bank, in het guilloche-patroon, zijn echt gelukt. Ook de kaarten en eigendomsbewijzen zien er verzorgd uit, en het boekje (zestien pagina's) is overzichtelijk, met kleur per hoofdstuk en een rustige opmaak. Riso op de thuisset is levendig en past bij een jeugdclub. De uitnodiging met het miniatuurbord is aardig.

Minder: veel boekjespagina's zijn halflege pagina's met drie alinea's. De pagina's met aantekeningen en "Veel speelplezier" zijn nuttig, maar het boekje had in 12 pagina's gekund. De bordbladen in Riso hebben grote volle vlakken roze (veel inkt bij thuisprint), dat is een keuze, maar een melding "dit thema gebruikt veel inkt" zou eerlijk zijn. De foto in het tegeltje van een straat is erg klein op het bord zelf (zie `img/secretaris-hans/10-bord-pdf-ed1.jpg`), op het eigendomsbewijs is hij prima.

PDF's nagelopen op maat: bord 4 × 248 mm met snijtekens klopt; kaarten 122 pagina's voor 61 kaarten (voor en achter om en om); boekje 16 pagina's A5 (bij thuisprint 8 pagina's A4 liggend, 4 vellen); geld op SRA3 met 14 biljetten per vel, het laatste vel heeft 12. Alles komt overeen met de instructie.

Screenshots: `img/secretaris-hans/10-bord-pdf-ed1.jpg` tot en met `15-overig-ed3.jpg`.

## Features die ik zou willen

- **Totaal speelgeld voor n sets in de instructie en op de printpagina.** Voor 10 sets wil ik weten wat ik bestel. Must.
- **Neutrale sjablonen (koor, kerk, vereniging) of "Alle namen leegmaken".** Het sjabloon voor een club is een voetbalclub. Nice, voor een vereniging als de mijne eigenlijk must.
- **Uitnodiging met eigen tekst** (datum, plaats, wat je meeneemt) en een tweede versie met een eigen logo. Must voor een evenement.
- **Controle voor teksten die niet bij het bord passen**, bijvoorbeeld "dan krijg je 10" zonder munt of "bekerfinale" in een koorspel. Nice, moeilijk.
- **Dubbelzijdig-uitleg per printer** (Canon, HP, Brother). Nice.

## Wat goed werkte

- Enter in de huisregels (round 3 bug 10 is opgelost); de regels staan genummerd op de kaart en in het boekje.
- Een eigen munt met teken ƒ: op het bord, de kaarten, de biljetten, het boekje en de instructies.
- Eigen woorden voor huis en hotel in boekje, prijslijst en instructies.
- Instructies met aantallen voor 10 sets, kloppend tot op de vellen.
- Controle (dpi-waarschuwing) bij een foto van 160 px, op de straat zelf en op het eigendomsbewijs, en weg na een betere foto.
- Mijn edities toont "klaar tot 29 nov" en Printen leidt naar de bestaande resultaten, niet naar een lege printpagina.
- Printen: Drukkerij-set 10 sets zonder geld duurde ongeveer 4 minuten; de run met speelgeld ongeveer 7 minuten, met één keer 429 (gedeeld IP-adres met andere testers), en liep daarna vanzelf door.
