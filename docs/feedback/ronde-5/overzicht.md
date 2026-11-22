# Feedback ronde 5: overzicht

Zes testers op productie (0e93ea6), na de versimpeling van ronde 5. Hoofdvraag: staat alles waar je het verwacht?

| Tester | Apparaat | Taal |
|---|---|---|
| buurt-anouk | desktop 1440 | NL |
| club-lukas | desktop 1920 en 1024 | EN |
| teacher-emma | iPad 1024 en 768, touch | EN |
| oma-gerda | Android 360, tekst 125% | NL |
| vader-mo | iPhone 390, ook liggend | NL |
| getuige-sem | laptop 1280 | NL |

Nummers hieronder (R5-xx) gebruiken de bouwagents. Tussen haakjes staat wie het vond.

## Foto's (agent foto)

- R5-01 Elke staande foto krijgt "De foto bedekt het kader niet helemaal", ook als hij het kader vult. De oorzaak is waarschijnlijk dat `checkPhoto` kader plus afloop meet, of dat de foto op een derde hoogte staat (Anouk, Emma, Gerda, Mo).
- R5-02 "Foto over het hele midden" opent de fotokiezer, maar de gekozen foto verschijnt niet (Mo, twee keer).
- R5-03 Een staande foto over het hele midden laat in de PDF groene stroken en zet gezichten op de vouw (Gerda).
- R5-04 Bij "Naam met foto" is de foto klein en scheef. Bij een foto over het hele midden valt het lint op een gezicht (Sem).
- R5-05 De fotostrook op het eigendomsbewijs is te smal en snijdt gezichten af (Sem).
- R5-06 Op het kleine bord steken foto's in de zijrijen over de rand en bedekken buurvakken (Anouk).
- R5-07 "Extra foto erop" legt de nieuwe laag precies op de hoofdfoto (Anouk).
- R5-08 "Op het bord is de foto ongeveer …" staat ook bij het deksel, een biljet en een pion (Sem).
- R5-09 Een te kleine foto geeft twee meldingen (Lukas, ronde 4 UX 2). De melding "3 pionnen hebben nog geen foto" staat alleen bij één pion (Sem).

## Editor, woorden en sjablonen (agent editor)

- R5-10 Het zoekveld zegt "plak namen", maar plakken geeft geen treffers. Plakken werkt alleen in een naamrij (Anouk, Lukas, Emma, Mo, Sem).
- R5-11 Bij een kaart kun je niet kiezen tussen betalen en ontvangen. "pays back" telt als betalen terwijl de kaart "Collect" zegt. "Bedrag aanpassen" lost een melding op en maakt meteen een nieuwe (Emma, Lukas, Sem).
- R5-12 Wie in "Waarvoor" zelf "voor …" typt, krijgt op de kaart "Betaal € 18 voor voor …" (Mo).
- R5-13 Een editie die met opzet leeg is gemaakt, geeft 60 losse meldingen (Emma).
- R5-14 De Android-terugknop met een open vak verlaat de editor (Gerda).
- R5-15 Namen verschillen per plek: Pawns en Tokens, test sheet en Proof sheet (Lukas, Emma).
- R5-16 Er staan nog resten van Samen maken: "Make it together" met "Make a link" in het namenmenu en het editiepaneel (Lukas).
- R5-17 Inhoud van sjablonen: de Groep-kaarten zijn kantoorgrappen, terwijl Groep ook voor school is (Emma). Bruiloft heeft kaarten die naar een vak met dezelfde naam wijzen ("De trouwauto staat klaar bij De trouwauto") en een vak "De proefproeverij" (Sem). Vrienden waarschuwt over zijn eigen kaarten (Lukas).
- R5-18 Op een telefoon staat tekst over het toetsenbord en "Sneltoetsen" (Gerda). Bij grote tekst is de segmentbalk van het midden te smal ("Naam" is 42 px) en springt de sluitknop van Voorbeeld naar een eigen regel (Gerda).
- R5-19 De Engelse site schrijft "38,22 mm" met een komma (Lukas). Bij een ongeldige bordmaat tekent het bord vreemd (Lukas).

## Start, Mijn edities en Deel je bord (agent start)

- R5-20 Welke onderdelen in de set zitten, verschilt per sjabloon. Groep en Feest zetten stilletjes speelgeld, pionnen en de doos aan, Dorp of wijk niet. Voordat de printpagina iets heeft bewaard, toont de editor niets als "niet in je set" (Anouk, Gerda).
- R5-21 Nieuwe editie op een kleine telefoon: de sjablonen staan onder de vouw en "Editie maken" zit onderaan vast. Zo maakt Gerda per ongeluk een lege editie. Een sjabloon kun je achteraf niet meer kiezen (Gerda).
- R5-22 "Village or neighbourhood" loopt bij 1024 px buiten zijn kaart (Lukas, Emma). De keuze voor munt M bleef misschien niet staan (Sem, controleren). De laatst gekozen munt wordt niet onthouden (Lukas, ook Carlos in ronde 4).
- R5-23 "Mijn edities" is een map-icoon zonder tekst. "Verder met" toont er maar twee. De waarschuwing over browsergegevens schrikt af (Gerda).
- R5-24 "Deel je bord" toont een ander bord: zonder foto's, met de standaardwoorden en met de oude banner "Bedenk mee aan onze eigen editie" (Emma, Mo, Sem).

## Printpagina en PDF's (agent print)

- R5-25 Wie de ZIP voor de drukkerij meteen downloadt, mist soms het bestelblad (Emma).
- R5-26 Het testvel toont £ in plaats van de eigen munt. Op het testvel van de thuisprint staat "bestel dan" (Lukas, Gerda).
- R5-27 De vinkjes op de printpagina zijn 20 px en een tik op de rij zet ze niet om (Gerda).
- R5-28 De uitnodiging gaat met lege stippellijnen de deur uit. Datum en plaats vul je alleen in de editor in, en dat zag Mo pas later (Mo).
- R5-29 Nog open uit ronde 4:
  - het boekje noemt geld in de doos als er geen geld geprint wordt (Hans, bug 34);
  - het deksel past thuis alleen op A3 (Fatima);
  - het geldadvies houdt geen rekening met het aantal pionnen, en het speelgeld begint met 4 vellen van alleen € 1 (Ria);
  - de kaarten zeggen "7 vellen" bij een PDF van 16 pagina's (Ria);
  - de ondertitel op het deksel is heel klein (Sophie).
- R5-30 Woorden in het boekje: "niet ze" (bedoeld als nieten) is onduidelijk (Gerda). Op een Android-telefoon kun je een ZIP niet openen (Gerda).

## Wensen die niet in deze ronde komen

- Een editie bewaren via een link per mail (Gerda). Kan pas als uitgaande mail is ingesteld.
- Een setnummer op kaarten en geld (Emma) en geld in zwart-wit (Emma).
- Een heel bord laten drukken, niet alleen stickers (Anouk), en uitnodigingen per aantal (Anouk).
- Foto's op bestandsnaam aan vakken koppelen (Anouk, Mo). Foto's tussen vakken wisselen (Sem). Een trouwthema (Sem).
