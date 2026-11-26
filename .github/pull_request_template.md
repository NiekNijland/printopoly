## Wat en waarom


## Checklist

- [ ] Ticket en type in de titel en in elke commit (`NOTICKET <type>: onderwerp`)
- [ ] Volgt de tabel "One pattern" in AGENTS.md; het voorbeeldbestand gekopieerd
- [ ] Geen regel toegevoegd aan een lijst, baseline of suppressie
- [ ] Brengt deze PR een patroon samen: de guard die het vasthoudt zit in deze PR
- [ ] Verplaatste of hernoemde klassen: het register, de release (van de drie) en de gegenereerde types
- [ ] Nieuwe ingang die een record-id neemt: de controle erop, en hij staat in de dekkingstest
- [ ] Nieuwe route: policy op de route en een rate limit
- [ ] Geen commentaar, behalve wat een lezer later anders zou laten doen
- [ ] Gedrag dat bewust verandert staat in de beschrijving, of "Geen"
- [ ] Welke teller verandert dit, en met hoeveel? (`bash scripts/debt-dashboard.sh --offline`)
- [ ] Het lijkt nog steeds levendig en af (huisregel van het product): geen kale pagina's, geen losse knoppen
