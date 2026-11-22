# Feedback ronde 5: getuige die een trouwcadeau maakt (laptop 1280 × 800)

Persona: Sem, 29, getuige van Thomas. Hij maakt een editie als trouwcadeau voor Lisa en Thomas, met veel foto's van het stel en eigen woorden voor geld en stukken. Daarna een tweede versie voor het vrijgezellenfeest en een derde vanaf leeg. Hij let op ontwerp en controleert de PDF's voor de drukkerij (afloop, snijkader, resolutie). Site in het Nederlands, Chrome op een laptop van 1280 × 800.

Gemaakt:

1. **Lisa & Thomas**. Sjabloon Bruiloft, thema Strak (in de editor gekozen), Nederlands, eigen munt "Kus" met teken ♥. Woorden: taartje/taartjes, bruidstaart/bruidstaarten, trouwauto/trouwauto's, "de schoonmoeder" voor de gevangenis, "Ja, ik wil" en "Huwelijkskas" voor de stapels, "Bank van Lisa & Thomas". Ondertitel "Getrouwd op 12 juni 2027". Midden eerst "Naam met foto", daarna "Foto over het hele midden" met het lint linksonder. Acht foto's tegelijk op straten, één foto op een kaart, foto in het ovaal van het biljet van 500, deksel met foto (Hele vak) en drie eigen regels, 4 pionnen (Lisa met foto), drie eigen kaartteksten. Geprint: Drukkerij-set met alles, volledige bank. Tweede run alleen pionnen en spelregelboekje erbij.
2. **Vrijgezellen Thomas**. Dupliceren van editie 1 via het naammenu. Thema Riso, munt "Biertje" met teken B, nieuwe woorden (shotje, krat, taxi, de kroeg, "Doe of drink", "De pot", "Bank van de Boys"). Negen straatnamen in één keer geplakt. Foto van Thomas in het midden en op twee straten. Alle kaarten van "Doe of drink" leeggemaakt en 16 eigen teksten geschreven. Geprint: Thuisprint-set met bord, kaarten, speelgeld (aanbevolen), pionnen en spelregelboekje.
3. **Utrecht van de getuigen**. Leeg, Klassiek, euro. 22 straatnamen en 4 stations geplakt, logo "L & T" in het midden. Geprint: Thuisprint-set met alleen bord en kaarten.

## Samenvatting

Het voelt veel rustiger dan ik verwachtte. De editor met drie kolommen past goed op mijn laptop, en ik vond bijna alles waar ik het zocht. Het mooiste: de vouwlijnen en kaartvakken die rood gestreept in het midden staan, de lijst "foto → vak" na acht foto's tegelijk, en het plakken van een hele lijst straatnamen. De drukkerij-PDF's zijn netjes: 3 mm afloop, TrimBox en BleedBox kloppen (kaarten nu precies 63 × 88 mm), het speelgeld is 2,5 MB en de ZIP heeft een bestelblad. Het grootste probleem voor een trouwcadeau: "Deel je bord" laat mijn bord zien zonder foto's en zonder mijn eigen woorden, met de tekst "Bedenk mee aan onze eigen editie" erboven. Daarnaast is "Naam met foto" te klein en schuin voor een foto van het bruidspaar, en snijdt de fotostrook op het eigendomsbewijs de gezichten af.

## Werkt niet (bugs)

1. **"Deel je bord" toont een ander bord dan het mijne** (hinderlijk).
   Waar: naammenu, Deel je bord.
   Wat gebeurde: het plaatje voor de groepsapp heeft geen foto in het midden en geen foto's op de straten. De stapels heten "Algemeen Fonds" en "Kans" in plaats van "Huwelijkskas" en "Ja, ik wil". Erboven staat in een rode balk "Bedenk mee aan onze eigen editie", een tekst van Samen maken.
   Verwacht: het bord zoals in Voorbeeld, met foto's en eigen woorden, en een tekst die past bij delen ("Ons eigen bord" of de naam van de editie).
   Stappen: editie met foto in het midden en foto's op straten, eigen woorden voor de stapels, naammenu, Deel je bord.
   Screenshot: `img/getuige-sem/10-deel-je-bord-zonder-fotos.jpg`

2. **"Op het bord is de foto ongeveer … mm" bij dingen die niet op het bord staan** (klein).
   Waar: veldenpaneel, onder Afbeelding.
   Wat gebeurde: bij het doosdeksel staat "Op het bord is de foto ongeveer 267 bij 267 mm", bij het biljet van 500 "47 bij 32 mm", bij een pion "17 bij 16 mm".
   Verwacht: "Op het deksel", "Op het biljet", "Op de pion", of gewoon "De foto wordt ongeveer …".

3. **Bedrag aanpassen lost de melding op en geeft meteen een nieuwe** (hinderlijk).
   Waar: Kaarten, Ja, ik wil 7.
   Wat gebeurde: ik schreef "Ontvang 50 van de bank." De melding zei: de tekst noemt 50, maar onderaan staat ♥ 40, zet het bedrag op 50. Na de knop "Bedrag aanpassen" kwam: de tekst noemt 50 en dat staat al onderaan, haal het uit de tekst. De eerste knop stuurt me dus naar de tweede melding.
   Verwacht: de eerste melding zegt meteen beide stappen, of de knop past het bedrag aan en haalt het getal uit de tekst.

4. **Sjabloon Bruiloft: kaarten verwijzen naar een vak met dezelfde naam** (klein).
   Waar: kaarten van het sjabloon Bruiloft.
   Wat gebeurde: "De trouwauto staat klaar bij De trouwauto. Ga erheen." en "Het jawoord klinkt bij Het jawoord. Ga erheen." Het vakje heet net zo als het onderwerp van de zin. Ook staat er een vak "De proefproeverij"; ik denk dat "De proeverij" bedoeld is.
   Verwacht: zinnen die met deze vaknamen kloppen, zoals "De trouwauto staat voor. Ga naar {vak}."

5. **De melding over pionnen zonder foto hangt aan één pion** (klein).
   Waar: Doos, Pionnen, en "Nog even nakijken" op de printpagina.
   Wat gebeurde: "3 pionnen hebben nog geen foto" staat alleen bij Thomas, met een waarschuwingsdriehoek in de lijst. Sem en Fleur hebben ook geen foto, maar daar staat niets. Op de printpagina lijkt het alsof het over Thomas gaat.
   Verwacht: de melding bij "Pionnen" als groep. Eerlijk gezegd is een pion met alleen een naam een prima keuze; dit hoeft voor mij geen waarschuwing te zijn.
   Screenshot: `img/getuige-sem/09-nakijken-pionnen-bij-thomas.jpg`

6. **"Zoek een vak of plak namen": plakken in het zoekveld werkt niet** (hinderlijk).
   Waar: lijst links, zoekveld.
   Wat gebeurde: ik plakte negen namen (elk op een regel) in het zoekveld, zoals de placeholder zegt. Het veld werd één lange zoekopdracht: "Niets gevonden voor Café De Zwaan De Kartbaan …". Plakken in het naamveld van een rij werkt wel, en heel goed ("9 namen ingevuld. 5 vakken van een andere soort zijn overgeslagen.").
   Verwacht: plakken van meerdere regels in het zoekveld vult de vakken vanaf het eerste vak, of de placeholder zegt waar je moet plakken.
   Screenshots: `img/getuige-sem/11-plakken-in-zoekveld.jpg`, `img/getuige-sem/12-plakken-in-rij-werkt.jpg`

Met de hand nakijken: in Nieuwe editie koos ik onder Munt "M (geen echte munt)", maar de editie werd euro. Ik klikte met een script op het verborgen keuzerondje, dus dit kan aan mijn script liggen.

## UX: wat kan beter

1. **Naam met foto is te klein en schuin voor een trouwfoto.** De foto staat als kaartje van ongeveer 9 cm schuin in het vrije vak. Bij een stel kijk je dan scheef naar de gezichten. "Foto over het hele midden" is wel recht en groot, maar dan ligt het lint op een gezicht (rechtsboven) of op de kleding (linksonder), en de kaartstapels liggen ook op de foto. Voorstel: bij "Naam met foto" een keuze Recht/Schuin zoals bij het logo, en een grootte voor de foto. Screenshots: `02-naam-met-foto-klein-schuin.jpg`, `03-foto-hele-midden-lint-over-gezicht.jpg`.
2. **De lijst "foto → vak" verdwijnt na herladen.** Acht foto's kwamen netjes op lege straten, maar de foto van het aanzoek viel op "De ouders ontmoeten". Na herladen was de lijst weg en moest ik de foto per vak opnieuw kiezen. Voorstel: in het menu ⋯ van een vak "Foto wisselen met…", zoals Wisselen met voor namen.
3. **Samen maken staat er nog twee keer.** In het naammenu en als knop in het editiepaneel. Ik dacht dat het weg zou zijn, en het naammenu heeft nu Samen maken én Deel je bord, die op elkaar lijken. Voorstel: Samen maken alleen in het editiepaneel, of alleen in het menu.
4. **Pionnen en spelregelboekje staan niet in de set van een nieuwe editie.** Bij mijn bruiloftseditie stonden pionnen en boekje uit, terwijl ik net vier pionnen met namen en een foto had gemaakt. Ik zag het pas op de printpagina, toen de eerste set al gemaakt was. Voorstel: zet pionnen aan zodra je er een naam of foto aan geeft, of zeg het bij de pion zelf in gewone woorden ("Komt nog niet mee in je printset. Zet hem aan op de printpagina.").
5. **Een kaart zonder bedrag kan geen bedrag krijgen.** Ik schreef "Iedereen betaalt je 10" en "Ontvang 50" op kaarten die oorspronkelijk een ga-naar-kaart waren. Er kwam geen melding en geen bedragbalk. Voorstel: dezelfde melding als bij kaart 7, met de uitleg dat een vrij bedrag op een extra kaart kan.
6. **Thema kies je in Nieuwe editie in een dichtgeklapte regel.** Strak paste het best bij een bruiloft, maar ik zag pas na het maken dat het thema daar ook al kon. De drie sjabloonplaatjes lijken ook sterk op elkaar: alleen de achtergrondkleur verschilt. Voorstel: in het plaatje van Bruiloft een bruiloftskaart en het lint met "Onze bruiloft" laten zien, zodat je ziet wat je krijgt.
7. **Eigen munt kan niet in Nieuwe editie.** De tekst zegt dat dat later in de editor moet. Voor een cadeau is de munt "Kus" een van de eerste dingen die ik bedenk. Prima zo, maar een vijfde knop "Eigen munt" met naam en teken zou het afmaken.
8. **Woorden telt anders dan ik invul.** Ik paste tien woorden aan en het editiepaneel zei "7 aangepast". Volgens mij telt één paar (huis en huizen) als één. Een kleine zin "7 woordparen aangepast" voorkomt twijfel.

## Ontwerp

- **Editor.** Rustig en duidelijk. De drie kolommen passen op 1280 × 800. Het bord klapt in tot "Bord tonen", dat is op deze hoogte fijn. De rode strepen voor vouwen en kaartstapels in het midden zijn precies wat ik nodig had. De keuze "Naam / Naam met foto / Foto over het hele midden / Logo" is krap: "Naam" en "Logo" zijn smal, met een rode rand die tegen de tekst aan zit.
- **Strak voor een bruiloft.** Strak ziet er elegant uit, maar het bord is erg wit en de vakken zijn grijs. Een zacht ivoor of een thema "Feestelijk" met goud zou voor een trouwcadeau mooier zijn.
- **Doosdeksel.** Nog steeds hetzelfde als in ronde 4 (Sophie, ontwerp-punt deksel): de titel is groot, de ondertitel en de eigen regels zijn piepklein. Op 267 mm staat "12 juni 2027, Kasteel Woerden" in letters van een paar millimeter. Op de foto (Hele vak) zit de titel in een lichte band die mooi werkt. Screenshots: `06-deksel-ondertitel-klein.jpg`, `16-pdf-deksel.jpg`.
- **Eigendomsbewijs met foto.** De foto komt als smalle strook onder de naam. Bij een foto van twee mensen zie je alleen voorhoofd en ogen, of bij één persoon het hoofd tot de kin. Voorstel: de strook hoger, of de foto laten schuiven binnen de strook. Screenshots: `17-pdf-eigendomsbewijs-foto-strook.jpg`, `21-pdf-vrijgezel-kaarten.jpg`.
- **Pionnen met foto.** Op de pion met foto staat de naam "Lisa" heel klein, tegen de vouwlijn aan. Op de pionnen zonder foto staat de naam groot. Onder op elke pion staat "Pion", ook als hij een naam heeft. Screenshot: `19-pdf-pionnen.jpg`.
- **Speelgeld met foto.** Mooi. Het biljet van 500 met het stel in het ovaal, "Bank van Lisa & Thomas" en het hartje als munt: daar worden mensen blij van. Screenshot: `18-pdf-biljet-500-foto.jpg`.
- **Uitnodiging.** Het bord met alle foto's op de uitnodiging is een leuke vondst. Screenshot: `07-uitnodiging.jpg`.
- **Spelregelboekje.** Netjes, maar de omslag heeft alleen de naam en vier iconen. Een foto van het stel op de omslag zou het af maken. Het boekje noemt "32 taartjes en 12 bruidstaarten" en "2 dobbelstenen" in de doos; die print ik niet. Een zin "uit je eigen doos" erbij zou helpen.
- **Het teken ♥ in de PDF.** Het hartje komt uit een andere letter (LiberationSans) dan de rest (Instrument Sans). Op papier zie je het niet echt, maar het hartje is net iets zwaarder.

**PDF's voor de drukkerij (editie 1):**

| Bestand | Maat | Afloop en kaders | Beelden |
| --- | --- | --- | --- |
| Bord, 4 pagina's | 266 × 266 mm pagina | TrimBox 248 × 248 mm, BleedBox 254 mm | middenfoto 3000 px, 212 ppi; straatfoto's 300 ppi; kleine testfoto 173 ppi |
| Kaarten, 122 pagina's | 81 × 106 mm | TrimBox precies 63 × 88 mm (ronde 4 bug 40 is opgelost) | fotostroken 300 ppi, kleine foto 151 ppi |
| Speelgeld, 22 pagina's SRA3 | 320 × 450 mm | geen afloop, snijtekens (zo bedoeld) | patroon 508 ppi, 2,5 MB in totaal (ronde 4 bug 3 is opgelost) |
| Doosdeksel | 285 × 285 mm | TrimBox 267 mm, 3 mm afloop | foto 3224 px, 300 ppi |
| Uitnodiging A6 | 3 mm afloop | klopt | |
| Pionnen | A4 | geen TrimBox | |

Het bestelblad is precies wat een drukker wil: product, aantal, eindmaat, maat met afloop, paginamaat, kleur sRGB, hoeken. Eén puntje: bij het bord staat in de instructie "Upload elke PDF zoals hij is", maar het is één PDF met vier pagina's. Een drukker met een uploadveld per sticker vraagt dan wat hij moet doen.

De middenfoto haalt maar 212 ppi, omdat mijn foto 4000 × 3000 was. De editor zei "Scherp genoeg". Dat klopt voor een bord, maar als kieskeurige maker had ik graag het getal gezien, of "goed" tegenover "heel scherp".

## Features die ik zou willen

1. **Middenfoto recht en groter bij "Naam met foto"** (must). Voor een trouwcadeau is de foto van het stel het belangrijkste beeld. Recht, groter, en het lint ernaast in plaats van eroverheen.
2. **"Deel je bord" met mijn echte bord** (must). Ik wil in de getuigengroep laten zien wat we geven, met foto's.
3. **Foto's tussen vakken wisselen** (nice). Na acht foto's tegelijk wil ik er twee omdraaien zonder opnieuw te uploaden.
4. **Foto op de omslag van het spelregelboekje** (nice). Dan voelt het boekje ook als cadeau.
5. **Een bruiloftsthema** (nice). Ivoor en goud, of een sierlijke letter. Klassiek, Riso en Strak zijn alle drie vrolijk of zakelijk.
6. **Bij Dupliceren meteen kiezen wat mee moet** (nice). Bij de vrijgezellenversie wilde ik de opmaak houden, maar niet de foto's van het stel en de bruiloftskaarten. Nu moest ik alles los weghalen of overschrijven. "Kaarten van deze stapel leegmaken" hielp wel.
7. **De naam op de voet van de pion** (nice). Nu staat er "Pion".

## Wat goed werkte

- Nieuwe editie is duidelijk: Leeg en zes sjablonen, taal, thema en munt in drie regels.
- Vouwlijnen en kaartvakken in het midden, en een logo staat nu recht (ronde 4 punten van Sophie opgelost).
- Eén foto voor het midden: wisselen tussen "Naam met foto" en "Foto over het hele midden" houdt dezelfde foto.
- Acht foto's tegelijk, met de lijst per foto en een keuzelijst per vak. Lege vakken worden gevuld, gevulde vakken overgeslagen.
- Plakken van een lijst namen in een rij: 22 Utrechtse straten in één keer.
- Dupliceren staat in het naammenu en de kopie opent meteen met het naamveld.
- Eigen woorden komen overal door: kaarten, eigendomsbewijzen ("Huur met 2 taartjes"), biljetten, boekje.
- "Nog even nakijken" bovenaan de printpagina is duidelijk, en printen blijft mogelijk.
- De printpagina onthoudt Drukkerij-set per editie. Een tweede run maakt alleen wat er nieuw bij komt (pionnen en boekje in een paar seconden).
- Bestandsnamen dragen de editienaam (`lisa-thomas-01-bord.pdf`) en de ZIP heeft een bestelblad.
- Mijn edities is overzichtelijk, met de status "Drukkerij-set klaar tot 29 nov".
