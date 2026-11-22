# Bouwbrief ronde 3 (for the build agents)

Shared instructions for the five agents that build the fixes and features from feedback round 4. Each agent has its own scope in its task; this file holds what is the same for all.

Read first: `CLAUDE.md`, `docs/feedback/ronde-4/overzicht.md` (bug numbers, UX themes, feature table), the tester files it cites where a point is unclear, and decisions B138, B141–B186 in `docs/beslissingen.md` (B143 is the checklist for where a feature belongs; B182–B186 set the scope of this round: UX, not new features).

Rules:
- Design first (B138, B143): every fix or feature is placed in the existing structure (editor panel sections, edition panel, name menu, ⋯ menu, print page groups). No bolted-on buttons or dialogs. The product must look fresh, polished and impressive; never plain.
- Desktop, tablet and phone together. Check 1440, 1024, 768, 390 and 320 px where your scope shows up.
- Every bug fix gets a test that fails without it. Features get tests.
- User text NL and EN, plain (short sentences, no em dashes, no fluff). Code English.
- Decisions: append rows only in your assigned number range, append-only, with reason and origin.
- Stay in your scope. If you must touch a file another agent owns, keep the change minimal and mention it in your report.
- Environment: Sail with Node in the container; `.env` from `.env.example` with your assigned ports; Chrome `/usr/local/bin/chrome-headless-shell` and `LARAVEL_PDF_CHROME_NO_SANDBOX=true`; copy other local values from `~/git/hobby/printopoly/.env` without printing secrets. Printing needs `npm run build`, not the dev server; start Horizon and Reverb in the container with `docker exec -d`. Screenshots with headless Chrome (puppeteer-core is installed in `/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly/08bf87c2-2f81-4fd8-88d6-54bc7cbea685/scratchpad/fb-tools/`) or the in-app browser in your own tab (close it afterwards).
- Before/after screenshots in `docs/design/ronde-4/<your-branch-name>/`.
- Remove `public/hot`, then `./vendor/bin/sail composer check` must be fully green (rerun Vitest files that only failed on the 5 s timeout with a longer timeout and say so).
- Commit in logical steps (messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), push your branch. Don't push to main, don't deploy. `sail down` at the end.
- Report briefly: what you fixed and built (by bug number and feature), what's left open and why, check result.
