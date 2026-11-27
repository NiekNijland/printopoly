# Zero technical debt: burn-down plan (printopoly)

Goal: every part of the codebase clean, every ratchet, list, baseline and suppression at 0, and no way back.

Measured against `origin/main` `8133cf4` (2026-11-26). Nothing in the repository was changed to measure. Every number comes from the command in the appendix or the backlog row with the same id. Scratch folder `<S>` = `/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly--claude-worktrees-zero-debt-b839dd/c0d4a95f-35d2-40d7-b68c-7271bbdace6a/scratchpad` (scripts in `<S>/tools`, detached worktree in `<S>/measure`; scratch containers `zd-mongo`, `zd-redis` on network `zd-net`).

Size (D6): **Medium**. About 700 source files (197 PHP in `app`, 64 PHP tests, 507 TS/TSX in `resources/js`), one backend and one frontend, one domain family. Not Small (over 300 files). Not Large (no big tables, no SQL). Because Mongo documents carry no moved class names (to confirm, Q-07), step 5 is one integration branch plus one small PR for the queue payload names.

Not measured, and why:

- Mutation score of the whole tree: a 10-class sample ran (MSI 89%, 188 mutants, 4 m 14 s); the whole tree measured 7197 mutants, covered MSI 94%, in 30 minutes locally (6 threads); floor 93, weekly scheduled run (D-21).
- Frontend coverage: the coverage run hit the load-dependent failures (T-04); the number comes with step 2 once the network guard is in.
- Unused composer packages (`composer-unused` not installed; the auditor did not install it).
- Production engine and version of MongoDB, queue payload lifetime, retention: not in this repository.
- `cap-autoload-conformance`, `cap-ci-duration-minutes` (needs a run of the new pipeline), `guide-future-tense` (no guides yet).
- The real Chrome PDF render (no Chrome binary in the Sail image; 10 tests skip).
- GitHub-side behavior (merge ref, `edited`, schedule): see `github-findings.md`, all UNVERIFIED until step 2.

## 1. Dashboard

### 1a. Ratchet counters

| Counter | Now | Target | Meaning of the target | Guard |
| --- | ---: | ---: | --- | --- |
| analyser-baseline | 0 | 0 | no baseline file | ratchet row |
| analyser-ignore | 3 | 0 | 1 inline ignore, `excludePaths`, `treatPhpDocTypesAsCertain:false` | ratchet row |
| analyser-level | 0 | 0 | both configs at level 10 | ratchet row |
| analyser-switches | 10 (script prints 11, see K-12) | 18 | every switch of the catalog on | min row |
| refactor-skip | 1 | 0 | no skip entry | ratchet row |
| refactor-sets | 6 | 19 | every set on | min row |
| formatter-rules | 0 | 21 (or lowered, Q-04) | the rules of the formatter config on | min row |
| advisory-block | 0 | 1 | `roave/security-advisories` required | min row |
| audit-ignore / audit-exceptions | 0 / 0 | 0 | | ratchet rows |
| test-skip | 4 | 0 | no skipped test | ratchet row |
| test-doubles | 9 | shrink-only | | ratchet row |
| event-fake-all | 0 | shrink-only | | ratchet row |
| lint-disable | 13 | 0 | | ratchet row |
| lint-config-off | 3 | 0 (category rows by decision) | | ratchet row |
| lint-config-ignores | 14 | 0 (category rows by decision) | | ratchet row |
| lint-baseline / type-baseline | 0 / 0 | 0 | | ratchet rows |
| ts-suppressions | 2 | 0 | | ratchet row |
| frontend-test-skip | 14 as printed, 0 true | 0 | regex fix K-12 | ratchet row |
| comments | 6398 | shrink-only | | ratchet row |
| todo | 0 | 0 | | ratchet row |
| ci-skipped-steps | 0 | 0 | | ratchet row |
| cap-* (13 rows) | UNKNOWN | 0 | read the caps file; exist from step 2 | ratchet rows |
| files-outside-row-paths | 2 | 0 | | dashboard |

Shrink-only rows (kit `01-principles.md`): `comments`, `test-doubles`, `event-fake-all` (the three fixed ones). Proposed by decision row, with evidence: `lint-config-off` and `lint-config-ignores` as category rows (a core rule off because its typed replacement is on; generated and vendored output). No other row is proposed to stay above zero.

### 1b. Other debt

| Id | Debt kind | Where | Now | Target | Guard (exists / add) |
| --- | --- | --- | ---: | ---: | --- |
| M-01 | source files over 400 lines | `app` | 2 | 0 | dashboard row; add |
| M-02 | frontend files over 400 lines | `resources/js` | 59 | 0 | dashboard row; add |
| M-03 | test files over 400 lines | `tests`, `*.test.tsx` | 23 | 0 | dashboard row; add |
| M-04 | methods over 80 lines (PHP) / functions over 80 (TS) | `app` / `resources/js` | 7 / 162 | 0 | method-length guard, step 3 |
| M-05 | controller actions over 40 lines | `Http/Controllers` | 6 | 0 | guard, step 3 |
| M-06 | open concrete classes | `app` | 12 | 0 | dashboard row |
| M-07 | behavior classes: no test names / no own test / support without own test | `app` | 15 / 21 / 10 | 0 | dashboard rows; scope widened (K-14) |
| M-08 | frontend logic / components without a test | `resources/js` | 19 of 26 (scope wrong: 137 files uncounted) / 136 of 176 | 0 | dashboard rows; K-13 |
| M-09 | dependency advisories / majors behind | composer, npm | 5 / 6 | 0 | dashboard rows |
| M-10 | knip hidden by entries | `knip.json` | 14 files, 1 package, 114 exports, 64 types | 0 | strict knip |
| M-11 | frontend type escapes | `as` source / tests, `!` in tests | 141 / 169 / 48 | 0 | lint rule + counter |
| M-12 | swallowed errors | TS / PHP | 41 / 9 `@` + 14 broad | 0 | counter |
| M-13 | tests: `#[Test]` spelling, booting unit tests, hermetic base | `tests` | 420, 23, 0 of 6 | 0, 0, 6 of 6 | guards, step 3/4 |
| M-14 | frontend test hermeticity | `testing/setup.ts` | network allowed, 6-9 files fail under load | 0 | network guard |
| M-15 | indexes missing, TTL | Mongo | 7 fields, 0 TTL | 0 | schema-like test, Q-05 |
| M-16 | layers: models in pure layers / writes in controllers / lib imports components | PHP + TS | 7 / 11 / 4 | 0 | architecture tests |
| M-17 | tracked binary weight | `docs/design` | 1516 files, 187 MB | per Q-12 | counter with cap |
| M-18 | docs: finished rounds not archived | `docs` | 9 files | 0 | archive |

Rows with a cap (the caps file; set from a clean clone with the pipeline's own install in step 2; `cap-<key>` rows read UNKNOWN until then):

| Key | Now | Cap | Zero when | Decision row, if it stays above 0 |
| --- | ---: | ---: | --- | --- |
| source-files-over-limit | 2 | 2 | step 7 | |
| frontend-files-over-limit | 59 | 59 | step 7 | |
| test-files-over-limit | 23 | 23 | step 7 | |
| open-classes | 12 | 12 | step 8 | |
| classes-no-test-names | 15 | 15 | step 9 | |
| classes-without-own-test | 21 | 21 | step 9 | |
| support-classes-without-own-test | 10 | 10 | step 9 | |
| frontend-logic-without-test | 19 (to re-measure with the fixed scope) | same | step 9 | |
| frontend-components-without-test | 136 | 136 | step 9 | |
| docs-older-than-limit | 0 | 0 | | |
| dependency-advisories | 5 | 0 (fixed in the first PR of step 2) | step 2 | |
| dependencies-abandoned | 0 | 0 | | |
| dependencies-majors-behind | 6 | 6 | step 2/6, or pinned (Q-01) | pin decision |

### 1c. Re-measured at `<commit>`

(Filled at the end of each step.)

## 2. The catalog mapped onto this project

Full tables with the commands: `mapping-catalog.md` (66 KB, 16 sections, section numbers below as §n). The independent start audit: `start-audit.md` (24 findings, backlog ids K-, S-, T-, ...).

- **Version floor**: PHP 8.5.13 (floor 8.4), Laravel 13.43, PHPStan 2.3, Larastan 3.15, Rector 2.8, Pint 1.32, PHPUnit 13.4, React 19.3, TypeScript 6.0, ESLint 9.39, knip 6, Vite 8, Vitest 5, Inertia 3: **every floor is met**, so there is no platform upgrade step. Missing packages (tools, not versions): rector-laravel, roave/security-advisories, infection, composer-unused (P-04). Upgrade questions above the floor: Q-01 (majors).
- **Domains and modules** (proposal; the owner sees it, §12): `Editions` (Edition/*, Game/StandardEdition, Actions/Editions, EditionDeleted/Duplicated events, CopyEditionAssets), `Print` (Print/* 37 files, the two print jobs, Print* data and enums, print events/listeners/commands), `Boxes` (Boxes/*, BoxActivity, box listeners and command, share-image classes: Q-10), `Photos` (7 files; used by Boxes, Print and Editions), `Accounts` (Actions/Account, Actions/Auth, AccountDeleting, InactiveAccountWarning, InactiveAccountsCommand, AuthUserData), `Content` (ContentLibrary, PrintGuide, content data, SeoData, StructuredData, LocalizedUrls, PublicPage, Locale), `Analytics` (FeatureCounter, FeatureEvent: kept tiny or folded into Accounts, decided in step 3), `app/Integrations/<System>` (Chrome, Poppler, Ssr, Google adapters, B3), `app/Support` for domain-free helpers (MailConfig, PublicConfig). The framework layer stays flat: `Http/*`, `Models`, `Policies`, `Providers`.
- **Frontend layers**: `types`, `lib` (domain-free), `hooks`, `components/ui` (vendored shadcn), `components`, `features/<domain>` (edition/editor/print/photos/boxes/checks/game plus their components), `layouts`, `pages`. The `render` code is shared by several features: Q-10.
- **Per catalog row** (selected; every row with its count is in the mapping file): validation inline 18 against 0 form requests (N-01); authorization inline 47, 3 policies, 0 `can:` (N-02); 33 JSON sites, no DTO (N-03); 0 TTL indexes, 7 unindexed fields (D-01); 59 controllers `final class` (N-04); 420 `#[Test]` (T-01); hermetic base absent (T-02); 29 facade fakes; 551 `function` components (U-01).
- **MongoDB** instead of SQL: rows on migrations, foreign keys, schema tests, database image and `DB_HOST` apply in their document form: index and field-presence tests (D-01), `DATABASE_IMAGE=mongo:8` (to confirm, P-05), strict models (Q-06). Everything else in `catalog/backend-laravel.md` "models and data access" is N/A or 0 (no `SoftDeletes`, no `DB::`, no `Schema::` in `app`).
- **Tasks the catalog does not cover** (way chosen by `03-conventions.md` B1: closest to the stock framework, flat, not over-built; each one named in the guide in step 3): the Chrome print pipeline with poppler and zip packaging (kept as the `Print` module with an `Integrations/Chrome` adapter), photo handling with Intervention and HEIC, the local-first editor with IndexedDB and offline sync, capability URLs (box tokens, anonymous print jobs), Reverb channels (public token channel and private owner channel), the Inertia SSR gateway with release check, SVG style tables as data, SEO and locale routing (`/nl`, `/en`), Google sign-in with the inactive-account cleanup, Horizon admin allow-list, Wayfinder and typescript-transformer generated files, the cookieless feature counter, the local Sail stack and the deploy in another repository (the kit's CI covers checks, not release).
- **Exceptions the owner may grant**: Q-04 formatter URL, Q-05 Dependabot, Q-06 strict models, Q-08 capability tokens next to `can:`, Q-16 typed `fetch` door for offline sync, Q-10 `render` shared layer. Each is a question below; nothing is a silent variant.
- **Team rules against catalog rows** (house rules of `CLAUDE.md` and the owner's memory): the stack follows `motormonitor` (B47): catalog wins for patterns, B47 stays for the choice of stack (Laravel, React, Sail) and for hosting; "use shadcn components themed to house tokens": stays (vendored `components/ui`, a category in lint and knip); "integrate features into the design, no bolted-on buttons" and "the product looks lively": product business, stay and constrain splits in steps 5 and 7 (no visual change); "tests and plans in Dutch, code English": stays. Proposal: the catalog wins on every code pattern, the repo's rules win on product. (Q-18.)

## 3. What blocks what

- The definition of clean is signed before any code change (this step's exit).
- No platform upgrade is needed (every floor met). The fresh symfony advisories are fixed first in step 2: the first PR carries the dependency update because `composer security` in the existing `tests` workflow goes red on the next run on `main`.
- The smoke suite is the first PR of step 2 and every later step ends in its runtime check. Because Google is the only sign-in, a seeded test user for local/test environments comes with it (K-01).
- Frontend tests must be hermetic (network guard, T-04) before the whole-tree coverage floor and mutation can be set honestly and before the pipeline is split into parts; the flake list is made first (D2 step 2).
- Hermetic base set-up and real-path tests (step 4) come before classes are closed (step 7/8), which come before missing tests (step 9).
- Layout moves (step 5) come before splits (step 7) so splits land in final places; the generated TypeScript files wait for final backend names; Wayfinder routes regenerate after controller moves.
- A dependency major is its own PR and never mixed with a move.
- The deploy lives in the ansible repository: a move that renames a script the deploy calls (`scripts/ssr-release.mjs`, `scripts/check-ssr-self-contained.mjs`, composer scripts) is a breaking change for the deploy and waits for the owner.

## 4. Definition of clean (runnable checks)

Signed by the owner (Niek) on 2026-11-26 at `8133cf4`, with the answer "Ja, ok" to the question "akkoord met alle voorstellen Q-00..Q-20 en de definitie van clean". Rows are only added; a redefinition is a decision row with the number under both definitions. Every check runs from `bash scripts/debt-dashboard.sh --final`, the ratchet script and the commands below. A count of 0 is proven by listing the files its pathspec matches.

Backend
- `scripts/` holds the kit's scripts; `phpstan-baseline.neon`, `eslint-suppressions.json`, `baselines/` and `scripts/audit-exceptions.json` do not exist; `analyser-*` and `refactor-skip` rows are 0 (except category rows by decision); `analyser-switches` is 18, `refactor-sets` 19, `advisory-block` 1, `formatter-rules` at its goal.
- Every class sits in the folders of the layout table of `app/AGENTS.md` (the layout list is gone); `git ls-files 'app/*.php'` outside `Modules`, `Integrations`, `Http`, `Models`, `Policies`, `Providers`, `Support`, `Console` is 0.
- `source-files-over-limit` 0; methods over 80 lines 0; controller actions over 40 lines 0; `open-classes` 0 (or decision rows); no concrete class extended; 0 `app/Http` `validate()` calls outside form requests; 0 inline authorization checks outside policies and token guards; every JSON endpoint returns a DTO.
- Every Mongo field a query filters on has an index in a migration; expiry per Q-14.
- `Model::shouldBeStrict()` per Q-06 and a config test asserts each strictness call.
- Backend line coverage at least 95 (`coverage-floor` at 95); `strict-types-missing`, `loose-comparisons`, `mutable-dates`, `byte-string-functions` 0.

Frontend
- `tsc` strict with the extra flags, 0 `@ts-*`, 0 `as` assertions outside a named allowed place, 0 `!`, 0 keyed baseline; ESLint 0 errors 0 warnings 0 disable comments 0 bulk suppressions; knip with strict entries clean and `unused-ignore` 0; `frontend-files-over-limit` 0; functions over 80 lines 0; frontend logic coverage at least 95, components at their measured floor; `lib` and `hooks` import nothing above them; layers per the kit with the `render` decision (Q-10).

Tests
- 0 skipped, todo or incomplete tests (the Chrome render runs in CI); one spelling per construct (`test` methods with sentence names or the `#[Test]` choice recorded); the hermetic base set-up is in `TestCase` and no test reaches the network or the clock; architecture presets pass; `classes-no-test-names`, `classes-without-own-test`, `support-classes-without-own-test`, `frontend-logic-without-test`, `frontend-components-without-test` 0; mutation floor committed and held; the flake sweep (ten random-order runs) has no differing id.

CI and tooling
- `bash scripts/debt-dashboard.sh --final` exits 0 on `main`; the contract test over the CI files passes; the scheduled run is green and calls the full dashboard and the whole-tree mutation run (cadence per Q-03); secret scan on every PR; the commit-message check is on; audits block at every level; every action pinned to a sha; the three old workflows are folded into `kit-checks.yml`; the kit's required checks are set on the host or the lack of enforcement is recorded in the profile with its reason (Q-02).

Runtime
- The runtime check of D4 point 5 on the local production-like stack (Mongo, Redis, Horizon, SSR, Chrome): the pages requested twice (home NL/EN, editor, print start, print page, box page, health), one write (create an edition, run a print job to a PDF), failed jobs before and after, the application log error count.

Docs
- `AGENTS.md` set, one-pattern table, layout table, test conventions, review rubric present; every path a guide names exists; no transition language (`guide-future-tense` 0); finished rounds archived in `docs/archive`; `docs-older-than-limit` 0.

## 5. Steps

Plan at step level (kit `05-program.md` D2). Exit artifacts are pasted here when the step ends.

| Step | What this project does in it | Counters it drives | Exit artifact | Runtime-check row | Owner's go |
| --- | --- | --- | --- | --- | --- |
| 1 Discover and define | This document, `backlog.md`, `project-profile.md`, `CONTINUE.md`, `github-findings.md`, the two sub-reports | all (measured) | this plan with section 4 signed and Q-01..Q-20 answered | none | yes (gate) |
| 2 Make the checks tell the truth | First PR: symfony security update plus the smoke suite with a seeded test user and the Chrome print render. Then one integration branch: fix the kit regexes (K-12), install the kit scripts, `kit-checks.yml` with the existing three workflows folded in (pinned shas, container or runner per Q-04), `scripts/checks.sh` parts, bleeding-edge PHPStan and rector-laravel, strict knip, whole-tree prettier/tsc/eslint, coverage floors, mutation floor, gitleaks, contract test, `composer bump`, Dependabot config, network guard for vitest and the flake list | Z-02..Z-06, Z-13, Z-15, Z-25..Z-29, K-01..K-20, P-01..P-05 | green pipeline of the integration PR, dashboard output, caps at measured values; the owner sets required checks if the plan allows | yes: the smoke suite and the main pages | no |
| 3 Freeze the patterns | One integration branch: `AGENTS.md` set, one-pattern table, layout table (modules above), test conventions, rubric, decision record, guard over the guides, rules guard, layout guard, class-shape guards, banned calls, size, method-length, architecture tests, index test, route coverage, object-level access coverage, register of stored names | T-03, W-01, S-01 (guard with counted list) | merged PR, guard over the guides green, caps lowered | none (docs and tests only) | **yes (stop)** |
| 4 Test foundation | Dead code first pass (knip strict: 14 files, 114 exports), one spelling for `#[Test]`, hermetic base, vitest network guard and shared Inertia fake, real-path tests, skipped Chrome tests enabled, flake sweep, strict-model recording commit per Q-06, strict types and strict comparison rules on | Z-07, Z-08, T-01, T-02, T-04, K-15, K-20 | ten run logs, base-set-up test green | yes | no |
| 5 Layout | Move every class by a move tool from a map: `app/Modules/*`, `app/Integrations/*`, frontend `features/*`; controller verbs and `final readonly`; tests move with their classes; stored names per Q-07 (queue payloads of 3 jobs) | S-01, S-05, N-04 | move map, empty layout list | yes | no |
| 6 Types | Frontend type escapes to zero (141+169+48), lint disables and `off` rules, analyser ignores, `mixed` and `@var`, typed config | Z-01, Z-09..Z-12, E-02 | dashboard with the rows at 0 | yes | no |
| 7 Module hygiene | Pure layers (Models out of Data/Edition/Photos; writes into Actions), splits: EditionValidator, PrintEditionData, 6 controller actions, 7 methods, EditorWorkspace and PrintShow functions, style tables, 59 frontend files and 23 test files, closing classes | Z-16..Z-19, S-02..S-05, M-04, M-05 | dashboard, characterization tests per split class | yes | no |
| 8 Patterns | Form requests, authorization on the route, DTOs, errors, Mongo indexes and TTL per Q-13/Q-14, security headers and throttle per Q-15, byte/mutable-date rows, `function` to const codemod, the frontend fetch way per Q-16 | N-01..N-03, E-01, C-01, C-02, D-01, U-01 | each theme behind its guard, lists gone | yes | no |
| 9 Fill and trim | Coverage to 95 (backend and frontend logic), the missing tests (classes, 136 components), key-use test, mutation on changed files from here | Z-20..Z-24, W-06 | coverage floors at 95, mutation floor | yes | no |
| 10 Lock and audit | Delete every list, review-only sweep, two fresh auditors, `--final`, runtime check on the final commit, archive this plan in `docs/archive`, write lessons back into the kit | all | `--final` exit 0, two clean audits | yes | **yes (stop)** |

### Releases of a move with stored names (step 5)

To be filled after the pre-scan (Q-07). Today's finding: Mongo collections store no class names (not yet pre-scanned) and the queued classes are `GeneratePrintJob`, `RefreshPrintTextsJob`, `RenderShareImageJob`; Horizon payloads carry the job class name.

| Release | PR | Deployed | Who rolls back, and how | Watch result |
| --- | --- | --- | --- | --- |
| 1 aliases and register | | | the owner, rolling back the release in ansible | |
| 2 the move | | | | |
| 3 data migration | | | | |

### PRs of the current step only

(none: step 1 opens no PR)

### Audit log

| When | Auditor's findings | Became counters | Of a kind in the signed definition? |
| --- | --- | --- | --- |
| Start | 24 findings F1..F24 (`start-audit.md`); 2 wrong counts (`frontend-test-skip`, `analyser-switches`), 5 wrong mapping figures | backlog K-12..K-20, S-02..S-05, E-01, E-02, T-02, D-01, M-10..M-18 | yes, all added to section 4 |

## 6. Process facts this plan rests on

- The lead may merge a green PR (the owner's answer); squash is the proposal (Q-09); merges between the owner's own deploys; nobody to announce to; no freeze.
- There is no enforced merge gate: the repository is private on the free GitHub plan, so required checks, required code-owner reviews and rulesets answer HTTP 403 (`github-findings.md` G-01). The lead merges only on a green `gh pr checks` of every kit check and a cold-review note, and records it in the PR.
- Nothing runs in parallel on the same database: each scratch container pair gets its own network and name; two suites never share one Mongo.
- Package installs are run by the lead inside the Sail image; the local clone has no `vendor` until then.
- Never run in parallel: the print render tests (Chrome), two vitest runs on one machine (12 CPUs, 20 s timeouts), anything on port 80 (another project's Sail stack holds it).
- The deploy and production are the owner's; no step touches them.

## 7. Decisions

Append-only.

| Id | Decision | Why | Decided by |
| --- | --- | --- | --- |
| D-01 | Ticket prefix `NOTICKET`; commits read `NOTICKET refactor: ...`, branch prefix `claude/` | no ticket system | owner |
| D-02 | Hand-off files live outside the repository in the shared notes folder | kit rule; plan archived in `docs/archive` at the close | owner |
| D-03 | PRs target `main`; the 95 old branches are untouched | all 0 ahead of main | owner |
| D-04 | The lead may merge a green PR; stops after steps 1, 3, 10 stay | owner answer | owner |
| D-05 | Local runs go through the Sail image and scratch containers; gitleaks and the mutation tool only in a scratch worktree; production never | verification policy | owner |
| D-06 | The GitHub merge settings cannot be changed on this plan: record it as a finding, add CODEOWNERS anyway | free private repository returns 403 | owner |
| D-07 | The kit's skeleton becomes its own file `.github/workflows/kit-checks.yml` | kit rule; existing workflows are never merged into | owner (task) |
| D-08 | Test spelling: convert all 420 `#[Test]` methods to the kit's spelling by codemod | the kit decides test conventions; the choice is not behavior | lead, on request |
| D-09 | 18 inline validations become form requests, 59 controllers `final readonly`, controller verbs follow the kit's list with the first needing controller adding a verb to the guide | kit patterns, no behavior change | lead, on request |
| D-10 | Unit tests that boot the app become pure unit tests or move to Feature | kit tier rule | lead, on request |
| D-11 | The size counter excludes data by category (json, generated), counts css and md; SVG style tables are split into per-part data modules, `lang/*.json` stays whole as a translation source | kit: exempt by category, never by list | lead, on request |
| D-12 | 551 `function` components become const arrows by codemod; pages keep `export default` | kit rule | lead, on request |
| D-13 | The kit's regex rows fixed in the project's copy: `frontend-test-skip` without `fit`, `analyser-switches` without `strictRules:` | measured wrong on this tree (audit §B), changed with `[ratchet: script]` | lead, on request |
| D-14 | `FRONTEND_LOGIC` and the backend test rows widened to today's folders until the moves land | kit 1.6: numbers the owner signs are the real ones | lead, on request |
| D-16 | Q-00..Q-20 answered "Ja, ok": every proposal in the table of open questions stands (symfony update now; majors done except `@types/node` pinned at 24; GitHub unenforced; weekly whole-tree mutation; Pint URL pinned to a sha; Dependabot kept; models strict except missing-attribute; one-release stored names after pre-scan; token capability pattern; squash; shared `render` layer; both decision records; `docs/design` kept with a counter; indexes with unique after duplicate check; commands kept instead of TTL; throttle test + narrowed origins + report-only CSP; one typed fetch door; Chrome in every PR run; `NOTICKET <type>: subject (B###)` for every PR; Dutch guides; catalog wins on code patterns) | owner answer | owner |
| D-15 | Guide language: Dutch prose with the rule ids and file names in English (open Q-19 if the owner prefers English) | `CLAUDE.md`: plans and texts Dutch, code English | lead, on request |
| D-17 | The hosted Pint config (pinned to commit 2478b98 of DIJ-digital/pint-config) holds 2 of the kit's 21 formatter rules (`declare_strict_types`, `visibility_required`): `MIN_ROW_TARGETS` has `formatter-rules:0`; the other rules are guarded by the counting rows (`loose-comparisons`, `mutable-dates`, `byte-string-functions`, `open-classes`) held at 0 by hand-read fixes in steps 4 and 8; the row `formatter-rules` cannot see a hosted config (kit finding) | Q-04 answer b; the kit lowers the goal for a hosted config | lead, on request |
| D-18 | The integration PR of step 2 was merged with a merge commit so the whole-tree rector commit stays reachable for `.git-blame-ignore-revs`; every other PR squashes (Q-09) | a squash would hide hand-written changes in a blame-ignored commit | lead, on request |
| D-19 | No seeded test user: the app is anonymous-first and Google is the only sign-in; the smoke suite drives the pages in headless Chrome through `chrome-php` (already a dependency for the PDF render) instead of Dusk, with the stack on `APP_ENV=staging` (production forces https) and production drivers asserted by the suite | kit: a seeded user only where a sign-in can be seeded; avoids a second browser tool | lead, on request |
| D-20 | CI jobs run on the runner with `setup-php`/`setup-node` pinned by sha and services on 127.0.0.1, not in a container image pinned by digest | no image exists, none is needed; `ubuntu-24.04` pins the machine | lead, on request (Q-02 context) |
| D-21 | Whole-tree mutation measured: 7197 mutants, covered MSI 94%, 30 minutes (6 threads, local): floor 93; the scheduled run does it weekly (Sunday) and the dashboard nightly (Q-03 b) | measured, not the 85-minute estimate | owner (Q-03) / lead |
| D-22 | The helpers named `fit` (frontend, `Imposition::fit`) are renamed (`scaleToFit`, `slotsThatFit`) because the kit's focused-test row reads `fit(` as a focused test; the regex stays unchanged (kit text keeps Jest's `fit`) | guards only shrink: rename the code, never weaken the row | lead, on request (supersedes D-13) |
| D-23 | The task `Type coverage` of `scripts/checks.sh` runs the analyser with the type-coverage extension a second time (type coverage is configured inside `phpstan.neon`); accepted duplication of about 25 s | a separate configuration would need a second file to keep equal | lead, on request |
| D-24 | The audit's claim that `analyser-switches` counts `strictRules:` is wrong: the 11th match is the Carbon `extension.neon` include, counted on purpose by the kit; the row is correct and reaches 18 with the bleeding-edge include, Octane check and four tsconfig flags | checked with the row's own regex over the config files | lead, on request (supersedes the part of D-13 about `analyser-switches`) |

### Open questions for the owner

Each has a proposal. "ok" means the proposal stands.

| Id | Question | Options | Proposal | Blocks |
| --- | --- | --- | --- | --- |
| Q-00 | Five fresh symfony advisories (published 2026-11-25) make `composer security` in `tests.yml` fail on the next run on `main`. Update `symfony/*` now, ahead of the gate? | a) a one-commit PR with the patch update (no program change, `composer.lock` only), b) wait for step 2, c) a dated audit exception line (kit allows 7 days, never renewed) | a) it is a patch update, the first PR of step 2 anyway; you may say go before the gate | CI red on the next `main` run |
| Q-01 | Majors above the floor: `spatie/laravel-typescript-transformer` 2.6→3.3, `@bugsnag/js` 8→9, `eslint` and `@eslint/js` 9→10, `@testing-library/jest-dom` 7→8, `@types/node` 24→26. Do or pin? | do each as its own PR in step 2 / pin with an end date | do all but `@types/node`; pin `@types/node` at 24 (Node runtime is 24, `.nvmrc`) until the runtime moves | step 2 |
| Q-02 | GitHub enforcement: the repo is private on the free plan, so required checks and code-owner review cannot be set. Options | a) accept it: the lead merges on a green `gh pr checks`, CODEOWNERS file added but unenforced, recorded in the profile, b) upgrade to Pro or make the repo public so the settings exist (the setting is yours), c) move the guard files' review to a git hook | a) for this run; and keep the answer as the kit test of the "no enforcement" case | step 2, contract test point 22 |
| Q-03 | What the pipeline costs, and the scheduled mutation run. Today: three workflows, about 12 minutes wall time and about 17 billed minutes per run (PR and push to main). The kit's pipeline (4 check parts with installs, backend and frontend tests with coverage, smoke with Chrome) is an estimate of about 35-40 billed minutes per PR run and again on the push to main (not measured: no run yet). The daily whole-tree mutation run is an estimate of about 85 minutes (the sample of 10 classes took 4 m 14 s, the tree has about 20 times as many) plus the scheduled full dashboard (about 10 minutes): about 95 minutes per night, about 2,850 per month. The free plan includes 2,000 Linux minutes per month. | a) nightly as the kit says, b) weekly (Sunday) whole tree, c) nightly on a changed-files-only sample, d) pay or go public | b): weekly whole-tree mutation, nightly dashboard only; the kit's "once a day" becomes a decision row with the reason | step 2 schedule |
| Q-04 | The Pint rules come from `https://raw.githubusercontent.com/DIJ-digital/pint-config/main/pint.json`, a moving branch of another repository. The kit says an organisation-hosted config stays. Keep the URL, pin it to a commit, or copy the kit's `pint.json`? | a) keep the URL, b) keep the URL pinned to a commit sha, c) commit the kit's config (the formatter would then be yours) | b) pinned to a sha: the source stays the organisation's, CI stops depending on a moving `main`; the kit's rules the config lacks become decision rows and `formatter-rules` is lowered to what the config has | step 2 |
| Q-05 | Dependabot instead of the kit's Renovate. Keep Dependabot (with a `github-actions` ecosystem so pinned shas are kept current and commit messages in the `NOTICKET` form)? | a) keep, b) swap to Renovate | a) keep: it works, it is GitHub-native, the kit's rule is "a bot that opens dependency PRs is configured to the commit form", which Dependabot supports with `commit-message.prefix` | step 2 |
| Q-06 | Mongo and strict models. `Model::shouldBeStrict()` is off on purpose (documents may lack newer fields). Keep the missing-attribute check off as a decision row with a counted list, or backfill documents and turn it on? | a) keep off for missing attributes only, lazy-loading and discarded-attribute checks on everywhere, recorded not thrown; b) backfill production data (a data migration: yours) | a) | step 4 |
| Q-07 | Class names in stored data: queued payloads of 3 jobs carry class names; Mongo collections (pre-scan pending). Three releases (default) or the one-release variant with a drained queue? | three / one-release with `horizon:terminate` and an empty queue before the deploy | one release: you deploy by hand, so the queue can be drained first, and the pre-scan shows whether any collection stores a class name | step 5 |
| Q-08 | Authorization and capability URLs. The kit authorizes on the route with `can:` and policies. Boxes and anonymous print jobs use secret tokens, not accounts. Keep a second, documented pattern "token capability" (a guard-tested middleware) next to policies? | yes with its guard / convert to something else (a behavior change) | yes: one documented, tested token pattern, a decision row with its object-level access test | step 3/8 |
| Q-09 | Squash, merge commit or rebase for program PRs? | three | squash, so one commit per PR with its `[ratchet:]` tags readable | all PRs |
| Q-10 | Frontend `render` (44 + 37 files) is used by editor, print, boxes and pages, so the kit's "feature does not import feature" does not fit. Make `render` a shared layer below the features (a deviation, decision row) or keep it a feature with an exception? Also: the share-image classes (`ShareImageRenderer`, `ShareImages`, `RenderShareImageJob`) serve Boxes. | shared layer / feature with exception / split | shared layer `render` below features, and the share-image classes move to Boxes | step 3/5 |
| Q-11 | Decision record form. The project's record is `docs/beslissingen.md` (B1..B277, Dutch, append-only, with the project's rules). The kit wants `docs/decisions/NNNN-*.md`. | a) both: `beslissingen.md` stays for product, `docs/decisions` is for code patterns, b) migrate | a) both, with one sentence in `AGENTS.md` saying which is which | step 3 |
| Q-12 | `docs/design` holds 1,516 tracked files, 187 MB of evidence screenshots and prototypes; the kit clones full history in CI. Keep, move out of tracking (history stays), or delete? | keep with a counter and cap / `git rm` plus a note (the history keeps them) / separate repo | keep tracked, add a counter `tracked-binary-bytes` with a cap, and exempt `docs/design` and `docs/feedback` from the docs-age and size rows by category | step 2 |
| Q-13 | Mongo indexes and the login race (behavior and data, deploy-bound): `users.google_id` and `users.email` have no unique index (two accounts can be created by a race), 7 filtered fields have no index. Add them (a migration that builds indexes on production; if duplicates exist it fails)? | add indexes only / add unique indexes after a duplicate check by you / leave | indexes for the cleanup fields, unique for `google_id` and `email` after you check production for duplicates (a read-only query I will write for you) | step 8 |
| Q-14 | Expiry by TTL index instead of three scheduled commands (a behavior change: the database deletes, not the scheduler). | TTL / keep commands | keep the commands (no behavior change) unless you want TTL | step 8 |
| Q-15 | Security hardening (behavior changes): a Content-Security-Policy header, `trustProxies(at: '*')` narrowed to the Cloudflare/proxy range, Reverb `allowed_origins` narrowed to the site origins, a throttle on every mutating route (34 route lines have none). | each yes/no | yes to the throttle test and to narrowing origins after checking the deployed hosts with you, CSP report-only first | step 8 |
| Q-16 | Frontend HTTP: the kit uses the Inertia 3 HTTP hook for requests; the offline sync (`lib/edition/remote`) and print API (`lib/print/api.ts`) use a typed `fetch` (34 lines). Keep one typed `fetch` door as the exception for the local-first sync or migrate everything? | a) one typed door, documented and guard-tested, b) migrate all | a) | step 8 |
| Q-17 | Smoke suite and the print render in CI need Chrome and poppler on the runner (cost: a download of about 150 MB per run, cached). Required, as the kit says (mandatory), or keep the render tests skipped locally and only in the scheduled run? | in every PR run / only scheduled | every PR run: the print render is the product, and it is what is not gated today | step 2 |
| Q-18 | Commit form for everything on `main`, not only the program: `NOTICKET <type>: subject (B###)` (the project's B-numbers stay in the subject). The check fails a PR with a commit outside it. | yes / only for the program's PRs | yes for every PR | step 2 |
| Q-19 | Language of the new guides (`AGENTS.md`, rubric, decision record): Dutch prose with the rule ids and names in English (the rules guard reads fixed words), or English? | Dutch / English | Dutch prose, English ids | step 3 |
| Q-20 | The team rules table (section 2): "catalog wins on code patterns, repository rules win on product" as above. Anything on that list that should win over the kit? | ok / name one | ok | step 3 |

One fact, no question: the cost of the pipeline of step 2 is stated in Q-03 with its numbers (and which are estimates).

## Appendix: measure commands

All run from the detached worktree `<S>/measure` (tracked files only) unless stated.

```
M-ratchet  bash <S>/tools/ci-ratchets.sh --head
M-board    bash <S>/tools/debt-dashboard.sh --report --details --offline
M-full     bash scripts/checks.sh --scheduled                       (exists from step 2)
M-ci       gh run list --limit 30 --json workflowName,conclusion,event,startedAt,updatedAt
M-audit    docker run ... sail-8.5/printopoly -c 'composer audit --locked --format=json'
M-outdated docker run ... -c 'composer outdated --locked --direct --major-only'; npm outdated
M-secrets  gitleaks git --no-banner --redact .
M-cover    docker run ... -c 'php -d pcov.enabled=1 vendor/bin/phpunit --coverage-text'   (93.77% lines, 4355/4644)
M-tests    docker run ... -c 'composer test'   (608 tests, 4289 assertions, 10 skipped, 26 s)
M-vitest   docker run ... -c 'npx vitest run'  (165 files, 2327 tests, 6-9 files fail under load, 204-380 s)
M-static   rector dry-run, pint --test, parallel-lint, phpstan x2, prettier, eslint, tsc, knip: all green
M-mutation docker run ... 'php -d pcov.enabled=1 vendor/bin/infection --threads=6 --filter=<10 files>'  (188 mutants, covered MSI 89%, 4 m 14 s)
M-routes   docker run ... 'php artisan route:list --json'   (65 routes, 48 with a parameter)
```

Where `docker run ...` stands for `docker run --rm --network zd-net -u "$(id -u):$(id -g)" -e HOME=/tmp -v <S>/measure:/var/www/html -w /var/www/html --entrypoint bash sail-8.5/printopoly -c`.

## D-25 Productiecontrole (2026-11-27, alleen lezen, op verzoek van de eigenaar)
- users: 1 document; 0 dubbele groepen op `email`, 0 op `google_id` -> unieke indexen mogen (Q-owner afgehandeld).
- Horizon draait, wachtrij `default`: 0 wachtend / 0 vertraagd / 0 gereserveerd -> hernoemde jobs veilig bij een deploy nu.
- Productie-.env: `APP_URL=https://printopoly.nl`, `REVERB_ALLOWED_ORIGINS=printopoly.nl`; `config/reverb.php` staat nog op `['*']` -> origins uit de env laten lezen. `trustProxies(at: '*')` blijft tot er een lijst van Cloudflare/nginx-adressen is (apart besluit).
- Pad: `/home/printopoly/printopoly.nl/{current,releases}`, gebruiker `printopoly`.

## D-26 Rij-herdefinitie (2026-11-27)
`loose-comparisons`, `mutable-dates` sluiten `tests/Guards` en `tests/Support/Architecture` uit (voorbeeldtekst in strings); `byte-string-functions` niet (18 echte aanroepen, nu `mb_` met `8bit`). Herkomst: r2-be-leftovers, commit-tags. D-27: `mixed` alleen bij JSON-ingangen, decision record 0003. D-28: events via `Event::dispatch(new X)`.

## Final dashboard (--final) at fe107a06

```
Zero-debt dashboard (final), fe107a06, 2026-11-27
group    counter                                    now  target  status
ratchet  analyser-baseline                            0       0  ok
ratchet  analyser-ignore                              0       0  ok
ratchet  analyser-level                               0       0  ok
ratchet  analyser-switches                           18      18  ok
ratchet  refactor-skip                                0       0  ok
ratchet  refactor-sets                               19      19  ok
ratchet  formatter-rules                              0       0  ok (goal lowered: the kit holds 21; needs a decision row in the plan)
ratchet  advisory-block                               1       1  ok
ratchet  audit-ignore                                 0       0  ok
ratchet  audit-exceptions                             0       0  ok
ratchet  test-skip                                    0       0  ok
ratchet  test-doubles                                 4       -  shrink-only
ratchet  event-fake-all                               0       0  ok
ratchet  lint-disable                                 0       0  ok
ratchet  lint-config-off                              0       0  ok
ratchet  lint-config-ignores                          1       -  shrink-only
ratchet  lint-suppressions                            0       0  ok
ratchet  frontend-functions-over-limit                0       0  ok
ratchet  frontend-inertia-mocks                       0       0  ok
ratchet  unused-ignore                                0       0  ok
ratchet  ts-suppressions                              0       0  ok
ratchet  frontend-test-skip                           0       0  ok
ratchet  comments                                  6662       -  shrink-only
ratchet  todo                                         0       0  ok
ratchet  ci-skipped-steps                             0       0  ok
ratchet  cap-source-files-over-limit                  0       0  ok
ratchet  cap-frontend-files-over-limit                0       0  ok
ratchet  cap-test-files-over-limit                    0       0  ok
ratchet  cap-open-classes                             0       0  ok
ratchet  cap-classes-no-test-names                    0       0  ok
ratchet  cap-classes-without-own-test                 0       0  ok
ratchet  cap-support-classes-without-own-test         0       0  ok
ratchet  cap-frontend-logic-without-test              0       0  ok
ratchet  cap-frontend-components-without-test         0       0  ok
ratchet  cap-docs-older-than-limit                    0       0  ok
ratchet  cap-dependency-advisories                    0       0  ok
ratchet  cap-dependencies-abandoned                   1       -  shrink-only
ratchet  cap-dependencies-majors-behind               3       -  shrink-only
ratchet  coverage-floor                              97      95  ok
ratchet  frontend-coverage-floor                     95       -  held (only goes up)
ratchet  frontend-logic-coverage-floor               95      95  ok
ratchet  mutation-floor                              93       -  held (only goes up)
ratchet  strict-types-missing                         0       0  ok
ratchet  loose-comparisons                            0       0  ok
ratchet  mutable-dates                                0       0  ok
ratchet  byte-string-functions                        0       0  ok
ratchet  mixed-outside-json-entry                     0       0  ok
ratchet  queue-bus-fake-all                           0       0  ok
ratchet  guide-future-tense                           0       0  ok
ratchet  one-pattern-list                             0       0  ok
ratchet  model-strictness-violations                  0       0  ok
ratchet  files-outside-row-paths                      0       0  ok
size     source-files-over-limit                      0       0  ok
size     frontend-files-over-limit                    0       0  ok
size     test-files-over-limit                        0       0  ok
classes  open-classes                                 0       0  ok
tests    classes-no-test-names                        0       0  ok
tests    classes-without-own-test                     0       0  ok
tests    support-classes-without-own-test             0       0  ok
tests    frontend-logic-without-test                  0       0  ok
tests    frontend-components-without-test             0       0  ok
docs     docs-older-than-limit                        0       0  ok
         docs-older-than-limit cannot fire before 2027-05-19: the first commit of this repository is newer than 180 days, so 0 does not say the docs are fresh
command  dependency-advisories                        0       0  ok
command  dependencies-abandoned                       1       1  ok (shrink-only by a decision row: held to the cap)
command  dependencies-behind                          8       -  shown (never fails)
command  dependencies-majors-behind                   0       0  ok (shrink-only by a decision row: held to the cap)
66 rows: 66 at target or held, 0 open, 0 not measured, 0 skipped
The test rows counted: 102 behavior classes, 17 support classes, 262 frontend logic files, 294 frontend components (--counted lists them; a folder missing from the expressions of the config block shows as too few)
```

## After-zero backlog (two fresh final auditors, 2026-11-27)
Soorten schuld die niet in de definitie van schoon staan, met telling. Elke soort gaat als vraag naar de eigenaar: opnemen in de definitie, of niet.

Goedkoop en mechanisch (voorstel: opnemen):
1. Verwijder de map-uitzondering van `mixed-outside-json-entry`: 43 `mixed`-parameters in 16 bestanden in `app/Modules/Editions/Support` en `app/Http/Requests`; uitzonderen per bestand, niet per map.
2. Toegestane-plek-lijsten zonder rij: 43 `allowIn`-regels in `phpstan.neon`, 10 deuren in `eslint.config.js`.
3. Analyserregels uitgezet: 3 (`phpstan.neon` 1, `phpstan-tests.neon` 2) die `analyser-ignore` niet ziet.
4. `knip --production`: 100 exports die alleen tests gebruiken.
5. Grenzen die niets vastzet: `MAX_FUNCTION_LINES = 80` in `eslint.config.js`, 4 PHP-testmethoden en 1 vitest-test boven 80 regels.
6. Tijdwachten in frontendtests: 5 (`setTimeout` met echte tijd).
7. Wachtrijtijden zonder test: `retry_after` 360 > Horizon-timeout 300 >= `#[Timeout(300)]`; geen test; de browser stuurt tot 5 tokens per lokale editie, de server weigert meer dan 50.
8. `down()` van migraties zonder test: 5 van 6. Ongezaaide `Str::random` in tests: 22, waarvan 8 voor een unieke kolom.

Ontwerp nodig (voorstel: apart besluit):
9. Typeguards die minder controleren dan ze beloven: 68, waarvan 38 op `unknown` (bijv. `boxes/local.ts:88`, `bus.ts:25`).
10. ESLint-eigen regels zonder falend voorbeeld: 8 regels, 17 selectors, 0 `RuleTester`-tests; `eslint.config.js` is 1425 regels.
11. Dubbele logica: 42 groepen van 8+ regels (vooral `components/render`), de print-CSP op twee plekken, tokenlengte 40 op 5 plekken.
12. Laden-alles en N+1: 6 collectiebrede `get()` in de opruimklassen, een N+1 in `EditionPrintReadinessService`; 26 `get()` zonder limiet. Tellen-dan-invoegen zonder lock: 3 plekken.

## After-zero backlog, third audit (2026-11-27, kit 425621c, main 32801f8f)
Twee verse auditors vonden geen teller van een soort uit de definitie van schoon die niet op nul staat: `debt-dashboard.sh --final` slaagt met 72 rijen op doel of vastgehouden. Zij vonden wel andere soorten; die staan hier met telling en gaan als vraag naar de eigenaar.

Goedkoop en mechanisch:
1. Frontend leest de klok en toeval buiten een deur: 23 aanroepen van `Date.now`, `new Date()` en `Math.random` in 12 niet-testbestanden; zes testbestanden gebruiken de echte klok zonder nepklok. Een deur `lib/clock` in `eslint-rules/doors.js`.
2. Frontend-testdubbels zijn niet geteld: 34 `vi.mock` (32 niet-Inertia), 53 `vi.spyOn`, 54 `vi.stubGlobal`; dezelfde nep van `echo` en `ingest` staat in elk 9 bestanden. Een krimp-rij en gedeelde fakes in `resources/js/testing/`.
3. PHPUnit laat risky en notice door: 5 runs zonder `--fail-on-risky` en `--fail-on-notice`, ook `phpunit.xml` zonder `failOnRisky`; vitest zonder `expect.requireAssertions`.
4. Nederlandse validatieteksten ontbreken: geen `lang/nl/validation.php`; standaardtaal is `nl`, dus een regel zonder eigen tekst geeft de ruwe sleutel (16 regels in 28 bestanden). Een test dat elke gebruikte regel een vertaling heeft.
5. Pint ziet verkeerde inspringing niet: 77 methodes in 32 testbestanden staan op 8 spaties. Een rij of een formatterregel.
6. De padguard leest alleen de AGENTS-bestanden: `docs/voortgang.md` noemt 17 oude paden, `docs/plan.md:58` zegt "PHPStan level 8" (is 10), en twee besluiten delen nummer 0003. De guard breder, of de bestanden bijwerken.
7. De lokale stack is niet vastgezet: `compose.yaml` gebruikt `mongodb-atlas-local:latest` en `redis:alpine` tegen `mongo:8` in CI; `docker/8.5/Dockerfile` heeft 6 niet-vastgezette installs; Chrome 131 staat op twee plekken zonder koppeling.
8. `.env.example` mist `PRINTOPOLY_CONTACT_EMAIL` (voor de eigen configbestanden).

Oordeel zonder guard: 7 controllers lezen met `::query()`; 28 array-index React-keys.

## Slot (2026-11-27, na de derde audit)
De eigenaar liet alle keuzes aan de lead; de vier ontwerpsoorten zijn daarna toch gebouwd en gemerged:
- te veel laden en N+1: opruimklassen per pagina, één query voor de gereedheid (guard `QueryLoadGuard`, rij `cleanup-load-all` 0);
- tellen-dan-invoegen: atomaire plekken met een gedeeltelijke unieke index (guard `QuotaCountGuard`, rij `quota-count-checks` 0; de migratie draait bij de deploy);
- dubbele code: teller `code-clones` 38 naar 16 groepen, besluit 0012;
- type-predicaten: parser in `lib/parse.ts`, rij `lint-type-predicates` 1 (`isServerElements`), besluit 0011.
Het programma is hiermee gesloten; wat de eigenaar nog met de hand doet staat in `CONTINUE.md` van de overdrachtsmap.
