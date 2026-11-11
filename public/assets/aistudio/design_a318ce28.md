# HumanManuscript: design.md (Legal & Human Rights Manuscript Studio)

> Name: **HumanManuscript**
> Status: Draft v0.2, 11 November 2026 (platform decided: Windows 10 desktop app, offline-first; Evidence Workbench added in section 19)
> Scope: writing, citing, revising and tracking journal articles in **law and human rights** for **Scopus / Web of Science** journals.

---

## 1. Purpose

A writing workspace that helps a legal researcher take an article from outline to accepted manuscript:

1. Write the article **part by part**, with each part having its own goal, word budget and citation rules.
2. **Cite and keep references** in a verified library, with correct footnotes and bibliography.
3. Turn **reviewer comments** into a structured revision plan, generate edit proposals, and apply them.
4. Keep a **complete trace of every change** (who or what changed it, why, and in response to which comment).
5. Run on **free or low-cost AI models** (Claude, Kimi, Gemini and others) through the user's own API key, without locking the user to one vendor.

### Design principles

| Principle | Meaning in practice |
|---|---|
| The author stays the author | AI proposes; the human accepts. Nothing is written into the manuscript without review. |
| No invented authority | The AI can never create a citation. It can only point to sources that exist in the verified library. |
| Local-first | Unpublished manuscripts are sensitive. Data stays on the user's device by default. |
| Model-agnostic | One provider interface, many adapters. Swapping models never changes the manuscript data. |
| Traceable | Every edit is an event with a reason. Reviewers' comments link to the exact edits that answer them. |
| Law-specific | Treaties, general comments, statutes, cases and pinpoints are first-class, not afterthoughts. |

### Non-goals

- Generating a whole article from a title.
- Guaranteeing indexing, acceptance or journal ranking.
- Replacing a plagiarism or similarity checker.
- Acting as a legal authority. Legal claims must be checked by the author against primary sources.

---

## 2. Users and key scenarios

**Primary user:** an academic or researcher in international human rights law, constitutional law, refugee law, criminal law or socio-legal studies, often writing in English as an additional language, often submitting to journals with strict style rules.

| Scenario | Flow |
|---|---|
| Start an article | Pick a journal profile, choose an article type (doctrinal, socio-legal, comparative), get a section skeleton with contracts. |
| Draft a section | Write in the editor. Ask AI for outline, clarity pass, argument-gap check or counter-argument. Insert citations from the library. |
| Add a source | Paste a DOI, URL, treaty name or case name. The app resolves it, stores it, and asks the user to confirm the record. |
| Check integrity | Run the citation audit: orphan footnotes, uncited bibliography entries, duplicates, inconsistent short forms. |
| Receive reviews | Paste or upload reviewer comments. The app splits them into atomic items and maps them to sections. |
| Revise | For each comment: choose an action, get proposed edits, accept or reject, and mark the comment resolved. |
| Respond | Generate the response-to-reviewers letter, with exact locations of changes. |
| Submit | Export a clean manuscript, a tracked-changes manuscript, and a title page / blinded version. |

---

## 3. System overview

```
+--------------------------------------------------------------+
|                     UI (web app / PWA)                       |
|  Editor | Section board | Library | Review desk | History    |
+------------------------------+-------------------------------+
                               |
+------------------------------v-------------------------------+
|                    Core (TypeScript, local)                  |
|  Document model | Citation engine | Change log | Rules/lint  |
|  Review parser  | Prompt builder  | Export                   |
+----------+-------------------+-------------------+-----------+
           |                   |                   |
+----------v------+   +--------v--------+  +-------v----------+
| Local storage   |   | Provider layer  |  | Source resolvers |
| SQLite (WASM)   |   | Claude  Gemini  |  | Crossref OpenAlex|
| or IndexedDB    |   | Kimi  OpenRouter|  | DOI  URL fetch   |
| encrypted keys  |   | Ollama (local)  |  | treaty/case DBs  |
+-----------------+   +-----------------+  +------------------+
```

### Suggested stack (adjust freely)

| Layer | Choice | Why |
|---|---|---|
| App shell | **Windows 10 desktop app** (Tauri or Electron) with a React + Vite UI | Offline-first, local files, secure key storage, no browser CORS limits. See section 21. |
| Editor | ProseMirror / Tiptap with custom nodes (footnote, citation, section) | Native footnotes and structured blocks are essential for legal writing. |
| Storage | SQLite via WASM (OPFS) or IndexedDB | Local-first, queryable history. |
| Citations | CSL JSON + `citeproc-js` | Standard format, hundreds of styles, OSCOLA and Chicago supported. |
| Export | `docx` library (tracked changes, footnotes), PDF via print stylesheet | Journals expect Word with tracked changes. |
| Optional sync | User-owned export folder, Git repo, or simple encrypted backup | Avoids running a server at first. |

---

## 4. Document model

The manuscript is a tree of **sections**, each a list of **blocks**. Footnotes and citations are separate nodes with stable IDs so they survive edits.

```
Manuscript
 |- meta: title, journal profile, article type, language(s), version
 |- Abstract(s)         (one per language, e.g. English + Indonesian)
 |- Keywords
 |- Section[]           (id, title, role, contract, blocks[])
 |    |- Block[]        (id, type: paragraph | heading | list | table | figure | quote)
 |         |- text with inline marks
 |         |- FootnoteRef -> Footnote (id, content, citations[])
 |- Bibliography        (generated from cited Sources only)
 |- Appendices
```

### Core entities

| Entity | Key fields |
|---|---|
| `Manuscript` | id, title, journalProfileId, articleType, status, languages |
| `Section` | id, manuscriptId, order, role, title, contract, wordTarget, status |
| `Block` | id, sectionId, order, type, content, hash |
| `Source` | id, cslJson, kind, verification, notes, tags, pdfPath |
| `Footnote` | id, blockId, order, content |
| `Citation` | id, footnoteId, sourceId, pinpoint, prefix, suffix, supports (claimId) |
| `Claim` | id, blockId, text, needsSupport, supportedBy[] |
| `ReviewRound` | id, manuscriptId, journalDecision, receivedAt, snapshotId |
| `ReviewerComment` | id, roundId, reviewer, raw, kind, severity, targetSectionIds, status |
| `Proposal` | id, commentId, targetBlockId, operations[], rationale, model, status |
| `ChangeEvent` | id, ts, actor (human or model), op, blockId, before, after, reason, commentId, proposalId |
| `Snapshot` | id, label (e.g. "Submitted v1", "R1 revised"), eventCursor |

### Source kinds (legal-specific)

| Kind | Examples | Special fields |
|---|---|---|
| Journal article | Schauer, Cook and Heilmann | DOI, volume, issue, pages |
| Book / chapter | Hart, Fuller | edition, editors, publisher |
| Treaty / convention | ICCPR, UDHR | adoption date, entry into force, UNTS cite, article |
| UN document | General Comment No. 34, Concluding Observations | body, symbol (e.g. CCPR/C/BGD/CO/1), date |
| Statute / ordinance | ICT Act 2006, Cyber Security Ordinance 2025 | jurisdiction, year, section, amendment status |
| Case | Lamont v Postmaster General, DLR reports | court, year, report citation, paragraph |
| Report / grey literature | HRW, Article 19, TIB | organisation, date, URL, accessed date |
| News / web | Daily Star | outlet, date, URL, accessed date |
| Constitution | Constitution of Bangladesh, Art. 39 | jurisdiction, article |

Every Source has a `verification` state: `unverified`, `resolved` (matched in Crossref/OpenAlex/official site), `confirmed` (author checked it), `flagged` (problem found).

---

## 5. Writing by parts: section contracts

Each section carries a **contract**: what the section must do, how long it should be, and what the AI should and should not do there. Contracts are templates the user can edit.

### Default skeleton for a doctrinal / socio-legal article

| Order | Role | Typical contract |
|---|---|---|
| 1 | Title | Specific, includes jurisdiction and core concept. |
| 2 | Abstract (EN) | 150 to 250 words: problem, method, finding, contribution, recommendation. |
| 2b | Abstract (second language) | Optional, mirrors the English abstract. Flag mismatch of facts or numbers. |
| 3 | Keywords | 4 to 6, check against journal limit. |
| 4 | Introduction | Problem, gap, research question, thesis, method summary, roadmap. |
| 5 | Theoretical framework | Define concepts precisely, distinguish near-synonyms, justify transplant of theory. |
| 6 | Legal / historical background | Chronological or thematic account of instruments. Primary sources first. |
| 7 | Analysis (one or more) | Apply framework to provisions, cases, practice. Each paragraph: claim, authority, reasoning. |
| 8 | Discussion | Implications, counter-arguments, limits. |
| 9 | Conclusion and recommendations | No new authority. Answer the research question. Recommendations tied to findings. |
| 10 | Bibliography | Generated. |

### What a contract enforces

- **Word budget** with live count and warning.
- **Required moves**, for example Introduction must contain: gap, question, method, roadmap. The AI checks and reports missing moves.
- **Citation rules**, for example "every statement about what a statute says must cite the statute section".
- **Consistency hooks**, for example the roadmap in the Introduction must match the actual section headings. (A manuscript can promise "Section B ... Section G" while headings are unlettered; the checker catches this.)

### Per-section AI actions

| Action | Output |
|---|---|
| Outline this section | Bullet outline with proposed claims and where authority is needed. |
| Argument gap check | List of unsupported claims, leaps in reasoning, undefined terms. |
| Counter-argument | Strongest objection plus where the text could answer it. |
| Clarity pass | Proposed sentence-level edits in tracked form. Meaning preserved. |
| Terminology audit | Same concept named differently across sections (e.g. "CSA", "the Act", "the Ordinance"). |
| Tighten to budget | Proposed cuts to reach the word target. |

---

## 6. Citation and reference engine

### Library

- Import: DOI, URL, BibTeX, RIS, CSL JSON, Zotero export, pasted reference text.
- Resolve: Crossref and OpenAlex for articles and books; direct fetch for web pages (store title, date, URL, accessed date); manual forms for treaties, UN documents, statutes and cases.
- Dedupe: fuzzy match on title, authors and year. Merge duplicates and rewrite all citations to the surviving record.
- Notes: each Source has a free-text note field and optional PDF attachment, used as context for AI (never sent without user choice).

### Styles

- Journal profile selects the style: OSCOLA, Chicago notes-and-bibliography, Bluebook, APA, Harvard, Vancouver or custom CSL.
- Footnote-heavy styles are the default design target, because most law journals use them.
- Short-form rules handled by the engine: *ibid.*, *supra*, *n X*, short titles, and pinpoints (page, paragraph, article, section).

### Rule: the AI never writes a citation from memory

1. The AI may *suggest that a claim needs support* and *describe the kind of source needed*.
2. The AI may *rank sources already in the library* for a given claim.
3. If the AI proposes a new source (title, author, year), it enters the library as `unverified`, is shown with a red badge, and cannot be inserted until it resolves against Crossref, OpenAlex or an official URL **and** the author confirms it.
4. Quotations and pinpoints are typed or pasted by the author from the source. The AI can check whether a pinpoint is plausible only if the source text is attached.

### Citation audit (runs on demand and before export)

| Check | Example finding |
|---|---|
| Footnote without citation | Footnote 4 is only "Ibid." but footnote 3 holds two sources: ambiguous. |
| Cited but not in bibliography | Case cited in footnote, absent from list. |
| In bibliography but never cited | Orphan entry. |
| Duplicate entries | Same article listed twice with different dates. |
| Inconsistent form | Same body cited as "UNHRC", "Human Rights Committee" and "UN HRC". |
| Wrong body or acronym | A claim about the UN Human Rights Committee or OHCHR cites "UNHCR" (the refugee agency). Flag acronym collisions. |
| Missing accessed date | Web source without access date, if the style requires it. |
| Dead or changed URL | Link check with Wayback fallback. |
| Pinpoint missing | Direct statement about a provision with no section or paragraph. |
| Primary-source gap | Paragraph describes a statute but cites only commentary. |
| Self-citation balance | Optional warning. |

### Claim-to-source linking

Authors can mark a sentence as a **claim** and link it to one or more citations. The Review desk later uses these links: if a reviewer says "this assertion is unsupported", the app shows which claim, which sources, and what is missing.

---

## 7. Review desk: reviewer comments to revision

### 7.1 Intake

- Paste text, or upload `.docx` / `.pdf` / `.txt` reviewer reports.
- Decision letter and each reviewer's report are stored separately inside a `ReviewRound`.
- A parser (rules first, AI second) splits the report into **atomic comments**, keeping the original wording untouched in `raw`.

### 7.2 Classification

Each comment gets:

| Field | Values |
|---|---|
| Kind | theory, methodology, legal accuracy, missing literature, citation form, structure, argument, language, figure/table, ethics, scope |
| Severity | major, minor, editorial |
| Target | one or more sections or blocks (suggested by AI, confirmed by user) |
| Action | revise text, add source, restructure, rebut politely, clarify, no change |
| Status | open, planned, drafted, applied, verified |

### 7.3 Plan, propose, apply

```
Comment ──> Revision plan (what to change, where, why)
        ──> Proposal(s): concrete edit operations on specific blocks
        ──> Author review: accept / edit / reject each operation
        ──> ChangeEvents written, linked to the comment
        ──> Comment marked applied, location recorded
```

- **Proposals are operations, not whole-document rewrites**: `replace_text`, `insert_block`, `delete_block`, `move_block`, `add_footnote`, `add_citation`, `rename_heading`. Small operations are easy to review and easy to roll back.
- A proposal always shows: before, after, rationale, and the comment it answers.
- If a comment asks for new literature, the AI suggests *search directions*; sources enter only through the library rules in section 6.
- If a comment is wrong or out of scope, the app drafts a **respectful rebuttal** for the response letter instead of an edit. The author decides.

### 7.4 Response letter generator

Produces a table per reviewer:

| # | Reviewer comment (verbatim) | Response | Changes made | Location |
|---|---|---|---|---|
| R1.3 | "…" | Draft reply in the author's voice | Summary of edits | Section 4, paragraphs 2 to 3, fn 41 to 44 |

Locations are generated from the change log, so they cannot drift from the real manuscript. Export to Word.

---

## 8. Change tracking and history

### Event-sourced log

Every edit, human or AI, is an immutable `ChangeEvent`. The current manuscript is the result of replaying events up to a cursor.

```
ChangeEvent {
  id, timestamp,
  actor: { type: "human" | "model", provider, model, promptHash },
  op: "replace" | "insert" | "delete" | "move" | "format" | "cite",
  target: { sectionId, blockId, range },
  before, after,
  reason: "free text or reviewer comment id",
  commentId?, proposalId?,
  status: "accepted" | "rejected" | "superseded"
}
```

### Features

- **Inline diff** (insertions and deletions colored, with author badge: you vs model name).
- **Per-block history** and **per-comment history** ("show everything done for R2.4").
- **Snapshots**: automatic at submission, at each review round, and on user request ("Submitted v1", "R1 revised", "Accepted version").
- **Compare any two snapshots** at section or full-document level.
- **Rollback** of a single event, a proposal, or a whole round, producing a new event rather than deleting history.
- **Provenance report** (optional export): share of text written by human vs AI-assisted edits, useful for journal AI-use disclosure statements.

### Export of tracked changes

- `.docx` with real Word tracked changes (insertions, deletions, comments) between two snapshots, so editors can see revisions the way they expect.
- Clean version (all accepted) and highlighted version (changes in colour) for journals that ask for both.

---

## 9. AI provider layer

### 9.1 Adapter interface

```ts
interface ModelProvider {
  id: "anthropic" | "gemini" | "moonshot" | "openrouter" | "ollama" | string;
  auth: "api_key" | "oauth" | "none";
  capabilities: { contextTokens: number; json: boolean; streaming: boolean };
  listModels(): Promise<ModelInfo[]>;
  complete(req: CompletionRequest): AsyncIterable<CompletionChunk>;
  estimateTokens(text: string): number;
  limits(): { rpm?: number; rpd?: number; tpm?: number };   // from config or headers
}
```

All AI features call the interface, never a vendor SDK directly.

### 9.2 Provider notes (verify before building; terms change often)

| Provider | Realistic free path | Login method | Caveats |
|---|---|---|---|
| Google Gemini | API free tier through a Google AI Studio key, with tight rate limits that Google has changed more than once | API key; Google OAuth may be possible, verify current rules | Free-tier content may be used to improve Google products, which matters for unpublished manuscripts. Free access depends on model. |
| Anthropic Claude | The Claude API has no standing free tier; free usage is the Claude.ai chat itself | **API key only** | Anthropic's terms say Free, Pro and Max account logins are reserved for Claude Code and Claude.ai, so a third-party app must not offer "Sign in with Claude" or reuse subscription tokens. |
| Moonshot Kimi | API needs a prepaid balance (small top-up, sometimes a starter voucher); the kimi.com chat is free but separate from the API | API key (OpenAI-compatible, base URL `https://api.moonshot.ai/v1`) | Chat subscription does not include API credits. Free access through aggregators exists but is rate-limited. |
| OpenRouter | Some `:free` model variants, rate-limited | API key | Free models rotate; treat as best-effort. |
| Ollama / local | Free, runs on the user's machine | None | Needs a capable computer; best privacy. Smaller models, weaker legal reasoning. |

### 9.3 About "connect via account login"

Be explicit in the product, because it is a common trap:

- **Do not** scrape or automate consumer chat sessions (Claude.ai, Gemini web, kimi.com). It breaks terms of service, is brittle and risks account bans.
- **Do** support: (a) paste-your-own API key; (b) official OAuth only where the provider documents it for third-party apps; (c) a **manual bridge** mode: the app prepares a prompt, the user pastes it into the free chat of their choice, then pastes the answer back and the app parses it. This keeps free chat usable without violating anything.
- "Login" inside the app means the user's **own app account** (optional, for sync). It is separate from model authentication.

### 9.4 Key handling

- Keys entered by the user, stored only on-device, encrypted with a passphrase (WebCrypto AES-GCM; key derived with PBKDF2 or Argon2).
- Never sent to any server owned by this app. Calls go from the browser or desktop shell straight to the provider (check CORS; if blocked, use the desktop shell or a user-run proxy).
- Per-provider "test connection" button and clear "remove key" button.
- Optional spending guard for paid keys: monthly cap and per-request token preview.

### 9.5 Routing and resilience

| Concern | Design |
|---|---|
| Rate limits | Central queue with per-provider RPM/RPD/TPM budgets, exponential backoff on HTTP 429, visible "waiting" state. |
| Small context windows | Context packer sends only the target section, neighbouring headings, the section contract, linked claim notes and selected source notes. |
| Model choice per task | Cheap/fast model for classification and linting; strongest available model for drafting edits. User can pin per task. |
| Fallback | If a model fails or runs out of quota, offer the next configured provider. Never silently switch for tasks involving confidential text on a provider marked "may train". |
| Determinism | Store prompt, model, parameters and raw response with each Proposal for audit. |
| Structured output | Ask for JSON matching the operation schema; validate; on failure re-ask once, then show the raw text for manual use. |

### 9.6 Privacy labels

Each provider profile has a label the user sees before every send:

- `Private (local)`: nothing leaves the device.
- `Provider processes data`: sent to the provider under API terms.
- `May be used to improve products`: typical for some free tiers. The app shows a warning and offers redaction of author names, institutions and unpublished data before sending.

---

## 10. Prompt design (principles)

1. **Role and limits first**: "You edit a law journal manuscript. You may not invent sources, cases, quotations, page numbers or statute sections."
2. **Provide the contract** for the section and the journal profile rules.
3. **Provide only the library sources the user selected**, as a numbered list with IDs. Require that any reference to a source uses its ID.
4. **Ask for operations in JSON**, not rewritten full sections.
5. **Require a rationale** and a **risk note** (for example "this change alters the legal meaning of the sentence").
6. **Preserve meaning**: for language edits, require an explicit statement of any change in legal effect (shall/may, must/should, "knowing" vs "reckless").
7. **Respect the author's voice** and dialect setting (British / American English).
8. **Distinguish levels**: fact about law, interpretation, argument. Edits must not turn an argument into a fact.

Example output schema for a revision proposal:

```json
{
  "commentId": "R2.4",
  "plan": "Clarify the difference between vagueness and ambiguity in 2.1.",
  "operations": [
    {
      "op": "replace_text",
      "blockId": "b_0231",
      "before": "…",
      "after": "…",
      "rationale": "…",
      "legalMeaningChanged": false,
      "needsSources": [{ "description": "Hart on open texture", "libraryIds": ["src_017"] }]
    }
  ],
  "risks": ["Defines 'overbreadth' narrowly; check against US doctrine."],
  "openQuestions": ["Does the reviewer want a comparative example?"]
}
```

---

## 11. Journal profiles (Scopus / Web of Science targeting)

A **Journal Profile** is a user-editable configuration, not a claim that the journal is indexed.

| Field | Notes |
|---|---|
| Journal name, publisher, ISSN | Entered by the user. |
| Index flags | `scopus`, `wos` (SCI-E, SSCI, ESCI, AHCI): **user-entered** and shown with "verify on the official source" and a last-checked date. |
| Quartile / metrics | Optional, user-entered, with source and year. |
| Article types | Research article, case note, comment, review. |
| Limits | Word count, abstract length, keyword count, figure/table limits. |
| Style | CSL style, footnotes vs in-text, spelling variant. |
| Structure rules | Required headings, order, second-language abstract, declarations. |
| Submission extras | Blinding rules, cover letter, highlights, AI-use statement, conflict of interest, funding, data availability, ethics. |
| Reference checks | Min/max references, DOI requirement, accessed-date requirement. |

The app ships with a few generic profiles (OSCOLA law journal, Chicago footnote journal, APA social-science law journal) and lets users import and share profiles as JSON.

**Pre-submission checklist** is generated from the profile: word counts, abstract, keywords, blinded files, declarations, reference format, figure resolution, and an AI-use disclosure draft built from the provenance report.

### Fit-checking, not predicting

- Compare the article's scope and keywords with the journal's stated aims (user pastes the aims text). The AI returns a short fit note and risks. It does **not** predict acceptance.
- Optional "recent titles" import (pasted list) to check topic overlap and novelty.

---

## 12. Legal and human-rights quality checks

These checks are the product's differentiator. Each returns **flags with locations**, never silent rewrites.

| Check | What it looks for |
|---|---|
| Legality / necessity / proportionality | If the article applies an ICCPR Article 19(3)-style test, are all prongs analysed? |
| Primary vs secondary balance | Provisions discussed without quoting or citing the instrument itself. |
| Amendment and repeal tracking | Statute timeline consistency: names, years, "repealed", "replaced" used consistently across text and tables. |
| Number consistency | Case counts, arrest figures, percentages: same figure same value everywhere; flag when a figure appears with different values or no source. |
| Table / figure integrity | Every table and figure is referenced in text, captioned, sourced, and its numbers match the narrative. |
| Definition discipline | Key terms (e.g. vagueness, ambiguity, overbreadth) defined once and used consistently. |
| Overclaiming | Causal or intent language ("deliberate", "weaponizes", "proves") without supporting evidence. Suggest hedging or evidence. |
| Attribution of bodies | Acronym collision checks (UNHRC / UNHCR / OHCHR / UNHCHR). |
| Sensitive subjects | Allegations about named persons or institutions: prompt the author to verify facts and consider defamation risk before submission. |
| Ethics | Interview or human-subject data: consent, anonymisation, ethics approval statement. |
| Roadmap consistency | Introduction's roadmap matches actual section structure and labels. |

---

## 13. Languages and accessibility

- UI and editor support **multiple writing languages**; per-section language tag (e.g. English main text, Indonesian or Bengali abstract).
- Cross-language abstract check: facts, numbers, statute names must match between versions.
- Spelling variant and legal-English style setting (UK, US).
- Keyboard-first editor, high-contrast theme, screen-reader labels for diff views.
- Offline editing; AI features disabled gracefully when offline.

---

## 14. Export

| Output | Notes |
|---|---|
| Clean `.docx` | Native footnotes, headings, tables, styles from profile. |
| Tracked-changes `.docx` | Between any two snapshots; comments included. |
| Response to reviewers `.docx` | Generated table with locations. |
| Blinded `.docx` | Strips author metadata and self-identifying text; flags self-citations to review. |
| Title page / cover letter | Templates from profile. |
| `.pdf` | For reading and archiving. |
| `.bib` / CSL JSON / RIS | Library export. |
| Project bundle | Single zip (manuscript, events, library, attachments) for backup or sharing. |

---

## 15. Security and ethics

- **Local-first**; no telemetry by default. Optional anonymous crash reports, opt-in.
- Clear **AI-use log**: which models touched which parts. Supports honest disclosure to journals.
- Warning screens before sending text to providers labelled "may be used to improve products".
- Redaction helper for names, affiliations and unpublished data.
- Do not store provider keys in plain text, URLs, logs or exports.
- Reviewer reports are confidential: stored locally, excluded from bundles unless the user opts in, and never sent to providers marked "may train".
- Defaults discourage over-reliance: the AI explains its change, and the author must accept each operation.

---

## 16. Milestones

| Phase | Deliverable | Done when |
|---|---|---|
| M0 Prototype | Editor with sections and footnotes; local storage | A 6,000-word article can be written and saved. |
| M1 Library | Source import, resolvers, dedupe, CSL rendering, citation audit | Footnotes and bibliography export correctly in two styles. |
| M2 History | Event log, diff, snapshots, rollback | Any edit can be traced and reverted. |
| M3 AI core | Provider layer with Gemini key + Kimi key + one more; section actions; JSON operations; queue and backoff | Section-level suggestions can be accepted or rejected into the log. |
| M4 Review desk | Comment intake, classification, proposals, response letter | A real review report becomes a revision and response letter. |
| M5 Legal checks | Rules from section 12; journal profiles; checklist | A complete pre-submission report is produced. |
| M6 Export | Tracked-changes `.docx`, blinded files, bundle | Output opens cleanly in Word with tracked changes. |
| M7 Polish | Manual bridge mode, local model support, i18n, accessibility | Usable fully without any paid key. |

---

## 17. Testing with a real manuscript

Use an existing article as the first test fixture. Useful tests drawn from typical issues in a footnoted legal manuscript:

- Footnote numbering and "Ibid." chains survive insertion and deletion.
- Duplicate bibliography records (same article listed twice) are detected and merged.
- Claims that cite an organisation by the wrong acronym are flagged.
- Inline mentions of "Section B ... Section G" are compared with the real headings.
- Figures and tables referenced in text exist and are captioned.
- Second-language abstract has the same facts and numbers as the English abstract.
- Statute chronology (Act, Ordinance, repeal dates) is consistent in text and in tables.

---

## 18. Open questions

1. ~~Platform first~~ Decided: Windows 10 desktop, offline-first. Still open: Tauri vs Electron (section 21).
2. Which citation style is the first priority: OSCOLA, Chicago notes, or both?
3. Should journal profiles be shareable through a public community repository?
4. How much source-text ingestion (PDF text for pinpoint checking) is acceptable given free-tier context limits?
5. Is optional cloud sync worth the added privacy and cost burden, or is bundle export enough?
6. Which providers are in scope for v1: Gemini, Kimi, plus OpenRouter and Ollama?

---

## 19. Evidence Workbench (NotebookLM-style, source-only)

A separate workspace, apart from the manuscript editor. You load PDFs, Word files and web pages; the Workbench **only returns what those files say**, shows exactly where, and shows how sources differ. It never writes into the manuscript. It feeds the library and your notes only, and you move anything across by hand.

### 19.1 Rules that make it trustworthy

| Rule | How it is enforced |
|---|---|
| Data only | Output is quotes, extracted fields, numbers and diffs. No free-form claims, no rewriting, no outside knowledge. |
| Every item has a trace | Each result carries `sourceId`, page, passage ID and character offsets. Click it to open the PDF at that page with the text highlighted. |
| Quotes are verified by the app, not the AI | The model must return passage IDs and verbatim quotes. The app checks each quote against the stored text (exact match, then whitespace/hyphenation-normalised match). A failed check shows a red **Not found in source** badge and the item is hidden by default. |
| Unsupported sentences are dropped | In Ask mode, any sentence of an answer without a verified passage is removed, and the count of removed sentences is shown. |
| Gaps are shown | If the sources do not answer a question, the cell says **No passage found**. It is never filled from model memory. |
| Nothing is trusted silently | Extracted items enter your library as `unverified` until you confirm them. |

### 19.2 Pipeline

```
Import (PDF / DOCX / HTML / TXT / scanned image)
  -> Text extraction (PDF text layer; OCR for scans)
  -> Page + passage index (stable IDs, offsets, headings, footnotes kept separate)
  -> Full-text search (SQLite FTS5) + optional local embeddings
  -> Retrieval of candidate passages for a question
  -> Mode: Extract | Compare | Differences | Ask
  -> Quote verification (string match against stored text)
  -> Result table with traces, saved as a "Finding" you can revisit
```

Passage IDs look like `src_017:p12:¶3`, so a statement stays pinned even if you rename the file. Legal numbering (article, section, sub-section, paragraph) is parsed from headings where possible and stored as a second pinpoint (`s.25(1)(b)`).

### 19.3 Modes

**Extract.** Choose fields once, run them over many sources, get a table.

| Source | Definition of "vagueness" | Year | Jurisdiction | Key figure | Trace |
|---|---|---|---|---|---|
| Hart (book) | verbatim quote | 1994 | UK | n/a | p. 123, ¶2 |
| Schauer (article) | verbatim quote | 1978 | US | n/a | p. 690, ¶1 |

Field sets are reusable templates: *definition*, *holding*, *test applied*, *provision text*, *penalty*, *dates (enacted/repealed)*, *numbers with units*, *method*, *limitations*.

**Compare.** A matrix: rows are questions or fields, columns are sources. Each cell is a verified quote plus trace. Cells are tinted by relation to the first column: `same`, `differs`, `not addressed`. You can pin a column as the baseline.

**Differences.** Three kinds, shown separately so they are not mixed up:

| Kind | Method | Needs AI? |
|---|---|---|
| Text diff | Word-level diff of two passages or two versions of a statute (for example the ICT Act s.57 against DSA s.25 against the CSA equivalent), with moved and changed words marked | No |
| Number diff | Numbers extracted with units, dates and context are aligned across sources (for example arrests or cases for the same period) and mismatches are flagged | Mostly no (pattern matching), AI optional for context |
| Position diff | Where two sources disagree in meaning (one says the term needs knowing falsity, another says mere inaccuracy). The model proposes a pair of passages and a one-line label; you see **both quotes side by side** and confirm or dismiss | Yes, with human confirmation |

Position diffs are always displayed as quote against quote. The model's one-line label is shown as a suggestion in grey, never as a finding.

**Ask.** Questions answered only from the loaded sources. The answer is built as a short list of items, each item = verified quote + trace. A plain-language summary line is optional and always marked as AI-generated, with its supporting passage IDs.

### 19.4 Screen layout

```
+-------------------+----------------------------------------+----------------------+
| Sources           | Results                                | Evidence             |
| [x] Hart.pdf      | Mode: Compare   Baseline: Hart         | PDF viewer           |
| [x] Schauer.pdf   |                                        | page 12, highlighted |
| [ ] GC34.pdf      |  Field          Hart    Schauer  GC34  |                      |
| [x] DSA_2018.pdf  |  Definition     "…" p3  "…" p9   --    | Passage text         |
| + Add files       |  Mental element differs same     n/a   | Verified: exact      |
|                   |                                        | [Save to library]    |
| Findings (saved)  | Diff tab | Numbers tab | Ask tab       | [Copy as footnote    |
+-------------------+----------------------------------------+  draft (unverified)] |
```

### 19.5 Working with the manuscript

- **Copy as footnote draft**: creates a footnote with the source, pinpoint and the verified quote as a *draft* citation. It is inserted only after you confirm the pinpoint.
- **Link to claim**: attach a Finding to a claim in the editor. If the claim later changes, the app marks the link as "re-check".
- **Reviewer comments**: when a reviewer says a claim is unsupported, the Review desk can open the Workbench pre-filled with that claim and show which loaded sources do or do not support it.

### 19.6 Data model additions

| Entity | Key fields |
|---|---|
| `Document` | id, sourceId, filePath, sha256, pages, ocrUsed, importedAt |
| `Page` | id, documentId, number, text |
| `Passage` | id, documentId, page, ordinal, text, startOffset, endOffset, legalPinpoint |
| `ExtractionTemplate` | id, name, fields[] |
| `Finding` | id, mode, question, createdAt, model, promptHash, params |
| `Evidence` | id, findingId, passageId, quote, verified (exact / normalised / failed), cellRef |
| `NumberFact` | id, passageId, value, unit, period, subject |
| `DiffPair` | id, kind (text / number / position), evidenceAId, evidenceBId, label, userStatus |

### 19.7 What works without internet

| Capability | Offline? | Needs |
|---|---|---|
| Import, text extraction, page index | Yes | Bundled libraries |
| OCR of scanned pages | Yes | Bundled Tesseract with the languages you need (check Bengali quality on your own scans) |
| Full-text search, passage retrieval | Yes | SQLite FTS5 |
| Text diff, number diff | Yes | No model needed |
| Semantic search | Yes, optional | Small local embedding model |
| Position diff, Ask summaries | Yes, if a local model is installed | Ollama or similar; quality depends on model size and your computer |
| Same, using Gemini or Kimi | No | Internet and an API key |

Design consequence: **the Workbench is useful with no AI at all** (search, extract by pattern, text and number diffs, side-by-side quotes). The model adds suggestions on top. Because the app verifies every quote itself, a small local model is acceptable: its worst failure is a hidden item, not a false claim.

### 19.8 Known limits to show the user

- Scanned or photographed PDFs depend on OCR quality; show an OCR confidence per page and a "check the page image" shortcut.
- Two-column layouts, footnotes and tables can scramble extraction; keep footnotes as a separate stream and let the user fix a bad page.
- Retrieval can miss a relevant passage; show how many passages were searched and let the user widen the search.
- Keep PDFs on the device. Do not upload copyrighted full texts to any provider; send only the retrieved passages, and only when the provider's privacy label allows it.

---

## 20. Discovery panel (finding new sources online)

Separate from the Workbench: it **finds** sources, the Workbench **reads** them.

1. Type a research question for a section.
2. The app queries the enabled indexes: OpenAlex and Crossref (no subscription), the Scopus Search API if you have a key through your institution, optionally Semantic Scholar.
3. **Google Scholar** has no official API, so the app opens the same query in your browser and you import what you choose by DOI or by pasting the reference. The app never scrapes it.
4. Gemini (or a local model) only sorts the returned titles and abstracts into buckets (theory, background, method, counter-argument, statutes and cases). It adds nothing that was not returned.
5. You tick items; they enter the library as `unverified` until you confirm them.
6. Send the files you obtain to the Workbench to read.

Needs internet. Everything already imported stays usable offline.

---

## 21. Windows 10 offline desktop app

| Topic | Decision / note |
|---|---|
| Target | Windows 10 (64-bit) and later. Microsoft ended regular Windows 10 support in October 2025, so test on the version you actually run and keep dependencies compatible. |
| Shell | **Tauri** (small installer, uses the system WebView2 runtime) or **Electron** (bigger, bundles its own browser, fewer surprises on older systems). Prototype with Electron if WebView2 is a problem on the target machine; otherwise prefer Tauri. Verify current Windows 10 support for each before committing. |
| Storage | One project folder per manuscript: SQLite database, attachments (PDFs), exports. Easy to back up to USB or cloud by copying the folder. |
| Secrets | Provider keys encrypted with Windows credential storage (DPAPI / Credential Manager) plus an optional passphrase. |
| Offline-first | Every feature in sections 5 to 8 and 19 works with no connection. Online features (Gemini, Kimi, discovery, DOI lookup, link check) fail soft with a clear "offline" state and queue the request. |
| Local AI | Optional Ollama install. The app detects it, lists models and shows an estimated RAM need. On modest laptops, recommend small models for classification and pattern help, and reserve drafting for an online model. |
| Install size and hardware | Warn when disk space or RAM is low. Keep indexes compact. Let the user turn off embeddings. |
| Updates | Manual "check for updates" and an offline installer; no forced auto-update. |
| Google Docs | Not an editor dependency. Interchange only: export `.docx` and upload to Docs, or import a `.docx` downloaded from Docs. Tracked changes survive as `.docx` revisions. |
| Signing | An unsigned installer triggers Windows SmartScreen warnings. Plan for code signing before sharing widely. |
| Testing | A real Windows 10 machine, a low-RAM profile, a scanned Bengali PDF, a 300-page PDF and a 15,000-word manuscript. |

### Updated milestones

| Phase | Deliverable | Done when |
|---|---|---|
| M0 | Desktop shell, project folder, editor with sections and footnotes | A 6,000-word article saves and reopens offline. |
| M1 | Library and citation audit | Footnotes and bibliography export in two styles. |
| M2 | History and snapshots | Any edit can be traced and reverted. |
| M2b | **Workbench core, no AI**: import, OCR, passage index, search, text diff, number diff, trace viewer | You can search three PDFs and see highlighted passages offline. |
| M3 | Provider layer (Gemini, Kimi, local) and section actions | Suggestions can be accepted or rejected into the log. |
| M3b | **Workbench AI modes**: Extract, Compare, Ask, Position diff with quote verification | Every displayed quote is verified; unverified items are hidden. |
| M4 | Review desk and response letter | A real review report becomes a revision and letter. |
| M5 to M7 | Legal checks, export, polish | As in section 16. |

---

## 22. Google Docs import / export path

Google Docs is a **meeting point with supervisors and co-authors**, not the place the manuscript lives. The app stays the source of truth. No Google login or API is needed for version 1, so it works with the offline desktop design.

### 22.1 Export to Docs

1. Choose a snapshot (or the current state) and press **Export for Docs**.
2. The app writes a `.docx` with native footnotes, real headings and the journal profile's styles. If you pick two snapshots, it writes Word tracked changes between them.
3. You upload the file to Google Drive and open it in Docs. Docs normally turns Word tracked changes into suggestions; test this with your own files, because behaviour can change.
4. The app records an **export marker** (time, snapshot, file hash) and shows a banner: *"Exported to Docs on 12 Nov. Import the edited copy before changing the same sections here."*

### 22.2 Import from Docs

1. In Docs, use *File > Download > Microsoft Word (.docx)* after your supervisor or co-author has edited or commented.
2. In the app, press **Import from Docs** and pick the file.
3. The app compares it with the exported snapshot (the common base) and with your current text (three-way merge).
4. Each difference becomes a `ChangeEvent` with actor `external: <name>` (name taken from the file's revision metadata where present). It appears in the Review desk as a proposal you accept or reject. Nothing overwrites your text automatically.
5. Docs comments become comment items. You can treat a supervisor's comments exactly like reviewer comments: classify, plan, propose, respond.

### 22.3 Keeping links alive

| Item | Plan |
|---|---|
| Footnote and citation IDs | Written as hidden bookmarks or content-control tags in the `.docx`. Docs may drop them, so the importer also matches by footnote text and block hash (fuzzy). |
| Unmatched footnotes | Shown in an "Unlinked" list so you can relink to a library source in one click; never silently deleted. |
| Tables, figures | Exported as native tables and images. On import, edits to table text are accepted; layout changes are ignored. |
| Styles and fonts | Journal style applied on export; import ignores formatting-only changes unless you ask to keep them. |
| Large conflict | If both sides changed the same sentence, show both versions side by side and let the user pick or edit. |

### 22.4 Guard rails

- Only one live copy at a time: the export banner reminds you which side is current.
- Confidential reviewer reports are **not** included in exports.
- Optional later step (not v1): direct push and pull with the Google Docs API. It needs sign-in, internet, and Google's approval for the app, and Docs suggestions cannot be written through the API, so `.docx` interchange stays the main path.

---

## 23. Features borrowed from SciSpace (adapted for law)

SciSpace combines paper search, chat with PDF, literature review, data extraction, writing help, citation generation and other tools in one workspace. This app takes the ideas that fit legal and human-rights scholarship and rebuilds them with source tracing, offline use and honest AI disclosure.

### 23.1 What to adopt

| SciSpace-style feature | How it appears here | Guard rail / legal adaptation | Offline? |
|---|---|---|---|
| **Chat with PDF** | **Ask** mode in the Workbench (section 19) | Answers are built from verified quotes with page traces; unsupported sentences are dropped. | Yes with a local model; search and quotes work with none |
| **Explain this selection** (highlight text in a paper, get a plain-language explanation) | Select text in the PDF viewer, choose *Explain*, *Define term*, *Translate*, or *Find related passages* | Explanation is labelled AI-generated and kept beside the untouched original passage. Legal terms of art are flagged as "check against a legal dictionary". | Local model only |
| **Literature review workflow** (plan, search, screen, extract, synthesise) | **Literature Map** in the Discovery panel: question, search, screening list, extraction table, thematic synthesis outline | Each stage is saved. Screening records *include / exclude / maybe* with a reason, and the log can be exported as a methods paragraph (what was searched, when, which filters). Synthesis is an outline linked to sources, not finished prose. | Search stage needs internet; the rest works offline |
| **Extract Data tables** with custom columns | Workbench **Extract** with user-defined columns and reusable templates | Every cell is a verified quote. Export the table to Word or CSV with page references. | Yes |
| **Citation generator with very many styles** | CSL style library (thousands of styles, including OSCOLA, Chicago notes, Bluebook, APA) plus journal-specific overrides | Generator works only from library records; unverified sources get a visible mark in the footnote preview. | Yes |
| **Paraphrase and clarity tools** | Clarity pass in the editor (section 5) | Citations stay attached. Each change shows whether legal meaning might have shifted (shall/may, knowing/reckless). Logged as an AI-assisted edit. | Local model or online |
| **Find topics / concept finder** | **Gap and theme map** built from your library and Workbench findings | Shows clusters of sources, thinly covered areas, and which of your claims have no supporting source. Suggestions only. | Yes (local embeddings) |
| **Find where a claim needs a citation** | **Support finder**: for a selected claim, ranks library sources and Workbench passages that could support it | Never suggests a source that is not already in the library; new leads go through the Discovery panel first. | Yes |
| **Multilingual support** | Cross-language search and translate-with-trace for English, Bengali, Indonesian and other languages | Translations are labelled; the original passage is always shown next to them; quotes in the manuscript use the author's own checked translation. | Local model quality varies |
| **Browser extension** | **Send to app**: a small browser helper that sends a page's DOI, title, URL or PDF link to the desktop app | Arrives as `unverified`. Works with Google Scholar results, publisher pages and news sites without scraping. Requires the desktop app to be running. | Capture works offline; lookup needs internet |
| **Agent gallery / templates** | **Recipes**: saved, shareable workflows (for example "Statute version comparison", "Doctrinal literature map", "Respond to Reviewer 2") | A recipe is a visible list of steps and prompts, importable as JSON. No hidden behaviour. | Depends on steps |
| **Presentation generation** | Export a **conference slide outline** from the article (headings, key claims, key figures, references) | Outline only, with the text taken from your manuscript; you design the slides. | Yes |

### 23.2 Deliberately not copied

| SciSpace-style feature | Why it is left out |
|---|---|
| **AI "humanizer"** that makes AI-written text harder to detect | It works against the app's purpose: honest disclosure of AI use to journals. The provenance report (section 8) is built for the opposite goal. |
| **AI-detector scores** | Such scores are unreliable and can wrongly flag people who write in English as an additional language. The app records who wrote what instead of guessing. |
| **Auto-generated full drafts or whole literature reviews** | The author writes the argument. The app helps with structure, evidence and checks. |
| **Biomedical or grant-writing agents** | Out of scope for law and human rights. |
| **Cloud-only operation** | The app is local-first for confidentiality and offline use. |

### 23.3 Adapting the Literature Map for legal research

Legal literature is not one stream. The Literature Map splits sources into lanes and keeps them apart in screening and synthesis:

| Lane | Typical items |
|---|---|
| Primary law | Constitutions, statutes, ordinances, treaties, cases |
| International soft law and UN material | General comments, concluding observations, special rapporteur reports |
| Scholarly commentary | Journal articles, books, chapters |
| Reports and grey literature | NGO reports, think tanks, official statistics |
| News and online material | Used for context; flagged for reliability and access date |

The synthesis outline shows each theme with the lanes that support it, so an argument resting only on secondary sources is visible.

### 23.4 Milestones for these features

| Phase | Deliverable | Done when |
|---|---|---|
| M8 | Explain selection, translate-with-trace, Support finder | You can select a passage in a PDF and get an explanation with the original beside it. |
| M9 | Literature Map with screening log and methods paragraph export | A search-to-outline run is saved and exportable. |
| M10 | Gap and theme map, Recipes, Send-to-app helper | Sources captured in the browser appear as unverified items in the library. |
| M11 | Docs import/export (section 22) round trip | A `.docx` edited in Docs imports as reviewable proposals. |

---

## 24. Language Studio (paraphrasing and academic language help)

Inspired by tools such as Trinka, which combine a grammar checker for academic writing, a paraphraser that offers alternative phrasings, consistency and inclusive-language checks, a citation checker, legal-writing checks and publication-readiness checks. This app rebuilds the useful parts around one rule: **language edits must never change legal meaning, quotations, numbers or citations without telling you.**

### 24.1 Paraphraser

| Feature | Behaviour |
|---|---|
| Modes | *Light polish* (keep structure), *Formal academic*, *Concise*, *Clearer for non-specialists*, *Expand with transition*, *Match my voice* (uses a few paragraphs you mark as your best writing) |
| Several options | Three candidate rewrites per sentence or paragraph, shown side by side with a word-level diff against the original |
| Phrase level | Click a word or phrase to see alternatives in context (for example "demonstrates", "shows", "indicates") with a note on tone |
| Accept granularity | Accept a whole option, a single sentence, or single phrases. Each acceptance becomes a `ChangeEvent` of type `language`, with the model and mode recorded |
| Targets | Selected text, a paragraph, a section, or the whole manuscript in review mode |
| Languages | English first; abstracts in Indonesian or Bengali can be checked for consistency with the English version, with a lower-confidence label if the local model is weak in that language |

### 24.2 Legal meaning guard (runs on every paraphrase)

Deterministic checks first, model second. A rewrite is shown only after it passes, or it is shown with a warning list.

| Guard | What it checks |
|---|---|
| Locked spans | Text inside quotation marks, statute wording, case names, treaty titles, article numbers and defined terms are **locked** and cannot be altered |
| Citations and footnotes | Every footnote marker in the original must remain attached to the same claim |
| Numbers and dates | Same values, units and periods before and after |
| Modal and mental-element words | Flags any change involving *shall / must / may / should*, *knowingly / intentionally / recklessly / negligently*, *not / no / unless / except*, *all / some / any*, *likely / possible / certain* |
| Names of bodies and acronyms | Keeps UN Human Rights Committee, OHCHR and UNHCR distinct |
| Argument strength | Flags rewrites that turn a hedged claim into a certain one (or the reverse), for example *suggests* to *proves* |

The warning shows the exact words that changed, for example: *"may" became "must" (legal effect changed)*.

### 24.3 Source-close paraphrase warning (avoiding patchwriting)

Rewording another author's sentence is not enough to avoid plagiarism in academic writing; it still needs attribution, and close rewording may need quotation marks.

- When selected text is linked to a Workbench passage, the app measures how close the rewrite is to the source (shared word sequences, same sentence skeleton).
- Result: *Close to source*, *Moderately close*, *Distinct*. For close rewrites it suggests either quoting with a pinpoint, or restating the idea in your own structure, and always requires a citation.
- The paraphraser **refuses** to produce a "plagiarism-proof" rewrite of copyrighted text; it offers a quotation or a cited summary instead.

### 24.4 Grammar and academic style

- Rule-based checker that runs **offline** (an open-source engine such as LanguageTool can be bundled and run locally) plus optional model suggestions.
- Academic tone: contractions, vague words, informal connectors, unclear pronouns, dangling modifiers.
- **Legal writing checks**: overlong sentences, heavy nominalisation, double negatives, undefined terms, inconsistent use of *shall*, Latin phrases that should be italicised, missing signposting at the start or end of a section.
- Each suggestion explains the rule in one line so you learn from it; you can silence a rule for this manuscript.

### 24.5 Consistency check

| Check | Example |
|---|---|
| Spelling variant | British vs American (*programme* / *program*) |
| Terminology | Same law named differently (*CSA*, *the Act*, *the Ordinance*) without a definition |
| Defined terms | Capitalisation and short forms stay the same after first definition |
| Abbreviations | Introduced once in full, used after, listed if the journal requires |
| Dates and numbers | Date format, thousands separators, percentages, *per cent* vs *%* |
| Section references | *Section 25*, *s. 25*, *sec. 25* unified to one form |
| Headings | Parallel wording and level numbering |
| Tense | Switches inside one paragraph |
| Cross-language abstracts | Facts and numbers match between English and the second-language abstract |

Fixes are proposals; **Fix all in this category** is available but each change is still logged.

### 24.6 Terminology and inclusive language

- **Terminology list** you control. For a human-rights or refugee-law article you can set preferred terms (for example how to refer to refugees, asylum seekers, migrants, stateless persons, or a named community) and the checker flags deviations or imprecise legal categories. It suggests; it never forces.
- **Inclusive and neutral language** check for gendered, biased or stigmatising wording, with an explanation. Quotations and names are exempt.
- **Sensitive allegations** (accusations about named people or institutions) are flagged for fact-checking and careful wording; see section 12.

### 24.7 Academic phrase bank for legal argument

A local, editable bank of sentence frames grouped by function. Add your own from papers you admire.

| Function | Example frame |
|---|---|
| Signposting | "This section examines whether …" |
| Hedging | "The text can plausibly be read as …" |
| Contrast with authority | "Although the Committee has held that …, the statute …" |
| Applying a test | "Applying the legality prong, the provision …" |
| Concession | "It could be objected that …; however …" |
| Limits | "This analysis is limited to … and does not address …" |

Frames are inserted with placeholders, so you write the content.

### 24.8 Other Trinka-like utilities

| Utility | Plan |
|---|---|
| Proofread a whole file | Import `.docx`, get a review-mode result with all language suggestions as tracked changes, no auto-apply |
| Personal dictionary | Names, statute titles, Bengali and Indonesian transliterations, Latin terms |
| Citation checker and formatter | Already in section 6; the language checker shares the same findings view |
| Publication-readiness checklist | Extended from section 11 with 20 or more items: abstract length, keyword count, headings, figure and table references, declarations, reference style, blinded file |
| Journal fit helper | Compares your abstract and keywords with the journal aims text you paste; reports overlap and risks. It does not predict acceptance and it relies on your entered Scopus / Web of Science status |
| Similarity check | A built-in check compares your text against your **own library and Workbench passages** only. For submission, run the journal's or institution's similarity service separately and record the result in the checklist |

Not built: an AI-content detector or a "humanizer" (see section 23.2). The provenance report records AI assistance instead.

### 24.9 Privacy and offline behaviour

| Feature | Offline? |
|---|---|
| Grammar, consistency, terminology, phrase bank, personal dictionary, meaning guard | Yes |
| Paraphrase and tone rewrite | With a local model; or online with Gemini / Kimi / other, after the privacy label is shown |
| Translation and cross-language checks | Local model quality varies; online recommended |

Every language-assisted change is recorded with provider and model, so the AI-use disclosure for the journal can be generated honestly.

---

## 25. Where your data lives: storage, backup and sync

### 25.1 Recommendation

**Primary copy on the laptop; encrypted backup copies elsewhere. Do not run the live project inside a Google Drive folder.**

| Option | Verdict | Why |
|---|---|---|
| Laptop only | Works, but risky | Fast, private, offline, but one laptop failure loses everything |
| **Laptop + automatic local backups + encrypted backup copy to Google Drive** | **Recommended** | Keeps offline speed and privacy, and gives you a safe off-device copy |
| Live project folder inside Google Drive for desktop | Not recommended | The database can be corrupted when a sync client copies a file while it is being written, or when two devices sync conflicting versions; large PDFs also fill the quota quickly |
| Cloud database (app account) | Not in v1 | Needs a server, costs money, adds privacy risk for unpublished work and confidential reviewer reports |

A Gmail address is just a Google account, so **no login inside the app is needed**. The app writes an encrypted backup file into any folder you choose, including a Drive for desktop folder, and Drive uploads it. Direct Drive API upload (with Google sign-in) can come later as an option; it needs internet and Google's approval for the app.

### 25.2 What is stored where

```
Documents\HumanManuscript\
  projects\
    <manuscript-name>\
      project.db            # SQLite: manuscript, library, events, reviews
      attachments\          # PDFs, images, imported .docx files
      exports\              # .docx / .pdf outputs
      backups\              # automatic rolling copies
  settings\                 # app preferences (no secrets)
```

| Data | Location | Included in backup? |
|---|---|---|
| Manuscript, library, change log, snapshots, review items | `project.db` | Yes |
| PDFs and attachments | `attachments\` | Yes (option to exclude copyrighted full texts and keep only metadata) |
| Provider API keys | Windows credential store | **No**, unless you explicitly export them with a passphrase |
| Confidential reviewer reports | `project.db` | Yes, encrypted only; excluded from any share or export bundle |
| Local AI models | Ollama folder | No (re-downloadable) |

### 25.3 Safety against crashes and mistakes

- **Autosave** every few seconds into a write-ahead log; recovery after a crash or sudden power loss restores unsaved work on next start.
- **Safe writes**: write to a temporary file, verify a checksum, then replace.
- **Rolling local backups** inside the project: hourly while you work, daily for 7 days, weekly for 4 weeks. Named snapshots (submitted, revised, accepted) are kept forever.
- **Backup verification**: after each backup, the app opens the copy and runs an integrity check; a failed check shows a warning.
- **Disk space guard** before backing up or importing large PDFs.

### 25.4 Off-device backup

1. Choose a backup destination: a USB or external drive, a Google Drive for desktop folder, or both.
2. The app writes a single **encrypted bundle** (`.hmbak`): project database, attachments (optional), settings. Encrypted with AES-256-GCM using a key derived from your passphrase.
3. Schedule: after every snapshot, after each review round, and weekly; plus a **Back up now** button.
4. Keep the last several bundles; older ones are pruned automatically.
5. **Restore** works on any Windows 10 computer: install the app, choose *Restore from backup*, enter the passphrase.

Passphrase warning: **if the passphrase is lost, the backup cannot be opened by anyone**, including the developer. The app shows a recovery sheet to print or store safely, and asks you to test a restore once.

Practical notes: free Google account storage is limited and shared across Gmail, Drive and Photos, so check the current limit; the bundle can leave out PDFs to stay small. Because the bundle is encrypted before it leaves the computer, Google sees only an unreadable file.

### 25.5 Moving between computers

- Export a bundle on one computer; import on another. One computer is "current" at a time.
- A banner shows the last export time and warns if you open an older copy.
- Real-time multi-device sync is not planned for v1.

### 25.6 Milestones

| Phase | Deliverable | Done when |
|---|---|---|
| M1b | Autosave, rolling local backups, integrity check | Killing the app mid-edit loses no more than a few seconds |
| M2c | Encrypted bundle export and restore | A project restores on a second Windows 10 machine |
| M12 | Language Studio: grammar, consistency, meaning guard, paraphraser | A paragraph is paraphrased with locked quotes and a modal-verb warning |
| M13 | Source-close warning, terminology list, phrase bank, readiness checklist | Close paraphrases of a loaded PDF are flagged with the source passage |

---

## 26. Originality Guard (live red flags while you write)

Inspired by what Turnitin, iThenticate and Draft Coach do: a similarity report that highlights text matching other sources, plus feedback on similarity and citations *before* submission. This app runs the equivalent **locally and live**, against the sources you actually hold, and adds an **authorship record** to protect an honest writer.

### 26.1 What it can and cannot do (be honest in the UI)

| It can | It cannot |
|---|---|
| Flag text that matches your library, Workbench PDFs, your own earlier work and pasted material, as you type, offline | Reproduce the official Turnitin or iThenticate score. Those services compare against publisher databases (for example content from many publishers through Crossref Similarity Check) that this app cannot see |
| Warn about missing quotation marks, missing citations and close paraphrases | Prove that a text is original |
| Keep a record of how the text was produced | Guarantee that a journal's detector will return any particular result |

So the final step stays external: **run the journal's or institution's similarity check** and record the result and your resolutions in the app (section 26.8).

### 26.2 Live flags

Checks run in the background on the paragraph being edited (about half a second after you stop typing). The margin shows a coloured mark and the underline appears in the text.

| Flag | Meaning | Default trigger |
|---|---|---|
| **Red: Verbatim match** | A run of words identical to a source, with no quotation marks and no citation | 8 or more consecutive words (adjustable) |
| **Orange: Close paraphrase** | Same sentence skeleton or very high word overlap with a source passage | High overlap score or high semantic similarity |
| **Yellow: Idea needs a citation** | The claim closely resembles a claim in a loaded source, but no citation is attached | Semantic match without a linked citation |
| **Blue: Self-overlap** | Text matches your own earlier work (thesis, published papers, earlier drafts) | Same as red, against "My works" |
| **Purple: Unreviewed AI text** | Text inserted from an AI suggestion that you have not yet reviewed (section 26.5) | Any AI-inserted span |
| **Grey: Properly quoted** | Matching text inside quotation marks or a block quote, with a citation | Shown as information only |

Hover on any flag to see the matching passage, its source and page, and the fix options.

### 26.3 One-click fixes

| Fix | Result |
|---|---|
| Quote it | Adds quotation marks (or a block quote for long text) and opens the citation box with the pinpoint filled from the Workbench |
| Cite it | Attaches a footnote to the source and page |
| Rewrite in my own words | Opens source and text side by side; offers prompts and Language Studio options that pass the legal meaning guard (section 24.2). A rewrite of a close match still needs a citation |
| It is a standard legal formula | Adds the phrase to the "common phrases" list with a reason, for example a statutory formula such as legality, necessity and proportionality, or standard treaty wording |
| It is mine (self-overlap) | Mark as reused from my own work and add the required self-citation or disclosure note |
| Ignore once | Dismisses the flag for this occurrence; the dismissal is logged |

### 26.4 How the matching works (local)

1. **Normalise** text: case, punctuation, hyphenation, footnote markers and numbering are removed.
2. **Fingerprint** with word shingles (for example 6 to 10 words) and a winnowing step; store hashes with passage IDs in SQLite. This is the same family of technique used by document-fingerprinting systems, and it is fast enough to run while typing.
3. **Index** everything the app holds: library full texts, Workbench passages, "My works" (your thesis, published articles, earlier manuscripts, imported once), and the manuscript's own earlier versions.
4. **Semantic layer (optional)**: a small local embedding model finds paraphrases and, with a multilingual model, cross-language matches such as a Bengali or Indonesian source reused in English. Show these as orange or yellow only, never as red.
5. **Exclusions** (user-controlled, like the exclusion options in commercial reports): quotations, bibliography, footnote citations, headings, common phrases, and defined terms.
6. **Thresholds** are visible and adjustable per manuscript; defaults are conservative so flags stay useful.

### 26.5 Authorship record and AI-use marks (instead of an "AI remover")

The app **does not include a tool to disguise AI-generated text or to make it pass an AI detector**, and it will not strip AI-use records. Reasons: many journals require authors to disclose AI assistance, hiding it can count as misconduct, and AI-detection scores are probabilistic. Turnitin's own documentation warns that its AI writing indicator is less reliable at low percentages, and others report both missed AI text and false flags, and that detection covers few languages. Instead the app gives you honest tools:

| Feature | What it does |
|---|---|
| **Provenance marks** | Every span is stored with its origin: *typed by you*, *pasted* (from clipboard, with the Workbench source if copied from there), *imported from .docx*, *external edit from Docs*, or *AI-suggested (model, mode, time)*. |
| **Unreviewed AI text flag** | AI-inserted text stays purple until you mark it *reviewed and adopted* or rewrite it. The mark is a prompt to take responsibility for the wording; it does not remove the record. |
| **Own-words mode** | Optional setting: AI helps with questions, outlines, critique and checks, but does not insert more than a sentence at a time. |
| **AI-use disclosure draft** | Generated from the log (which tools, for what tasks, which sections) for the journal's declaration. Check each journal's policy; wording and requirements differ. |
| **Authorship evidence pack** | Exportable timeline (drafts, revision history, notes, sources consulted, snapshots). If a detector wrongly flags your work, this is your evidence of how it was written. |
| **Writing replay** | Scroll through the history of a section to see it grow over time, similar in purpose to Turnitin's replay of a document's writing history. |

### 26.6 Pasted-text guard

- A paste of more than a set number of words (default 25) triggers a prompt: *Where is this from?* with choices: *My own text*, *A source (add citation)*, *A quotation*, *AI output*, *Other*.
- Pasted text stays marked until you answer. Unanswered pastes show as red in the margin.
- Copying from the Workbench keeps the source link automatically, so the fix is one click.

### 26.7 Legal-writing specifics

| Case | Handling |
|---|---|
| Statutory and treaty wording | Expected to match. Prompt to use quotation marks or a block quote with the section or article pinpoint; do not treat as plagiarism if quoted correctly |
| Standard legal formulas and Latin phrases | Common-phrase list, shared per journal profile |
| Case headnotes and reporter summaries | Flagged for permission or quotation (they are the reporter's text, not the court's) |
| Translated sources | Cross-language check; require a note saying who translated (yours or published) |
| Reuse from your thesis | Blue flag; prompt for the self-citation or journal's text-recycling policy |
| Reusing your own earlier sections between articles | Same, with a record of what was reused and where |

### 26.8 Originality report and pre-submission gate

- **Local report**: matches by source, percentage with and without exclusions, and a list of matches that matter, ordered by length and risk. Exportable for a supervisor.
- **Pre-submission gate**: exporting shows any unresolved red, blue or purple flags and unanswered pastes. It warns but does not block.
- **External check log**: record the date, service (for example the journal's Crossref Similarity Check or your university's Turnitin), the score, and how each significant match was resolved. These services are normally licensed to institutions or publishers, so ask your library, supervisor or the journal; the app does not use them directly.
- **Optional online check**: query selected open-access repositories for matching phrases. Coverage is partial and rate-limited, results are labelled *partial coverage*, and the privacy label shows before any text is sent.

### 26.9 Data model additions

| Entity | Key fields |
|---|---|
| `Fingerprint` | id, hash, passageId, position, corpus (library / workbench / mine / earlier-draft) |
| `OriginalityFlag` | id, blockId, range, kind, matchPassageId, score, status (open / fixed / dismissed), resolution |
| `ProvenanceSpan` | id, blockId, range, origin (typed / pasted / imported / external / ai), model, mode, ts, reviewed |
| `OwnWork` | id, title, kind (thesis / article / draft), filePath, citedAs |
| `CommonPhrase` | id, text, reason, scope (manuscript / journal profile) |
| `ExternalCheck` | id, service, date, score, reportFile, notes |

### 26.10 Milestones

| Phase | Deliverable | Done when |
|---|---|---|
| M14 | Fingerprint index, live red / blue flags, one-click quote and cite, exclusions | A sentence copied from a loaded PDF turns red within a second and fixes in one click |
| M15 | Provenance marks, paste guard, AI-use disclosure draft, authorship evidence pack, writing replay | Every sentence in a finished article has a recorded origin |
| M16 | Semantic (orange / yellow) flags, cross-language matches, originality report, external check log | A close paraphrase and a Bengali-source reuse are both flagged |
| M17 | Optional online check against open repositories | Partial-coverage results appear with a clear label |

---

## 27. Interface design (Word-inspired)

The window follows the layout conventions people already know from word processors such as Microsoft Word, so there is almost nothing to learn for the basics. It uses its own name, icons and colours; it copies familiar *conventions*, not Microsoft's branding.

### 27.1 Main window

```
+-----------------------------------------------------------------------------------+
| [Save][Undo][Redo][Backup]   HumanManuscript - Legal Ambiguity.hmproj  [_][o][x] |
+-----------------------------------------------------------------------------------+
| File | Home | Insert | References | Research | Review | Language | Originality | View |
|-----------------------------------------------------------------------------------|
|  Ribbon: groups of buttons for the selected tab                    [ Ctrl+K search ] |
+-------------+---------------------------------------------+-----------------------+
| NAVIGATION  |                                             | TASK PANE             |
|             |   Page / draft canvas                       | (changes by context)  |
| 1 Abstract  |                                             |                       |
| 2 Intro  v  |   Text with footnote markers,              | Citations             |
|   2.1 Gap   |   track-changes colours, comment            | Evidence (Workbench)  |
| 3 Theory    |   balloons in the margin, flag marks        | Reviewer comments     |
| 4 Background|                                             | AI suggestions        |
| ...         |   [ footnotes shown at page bottom or       | Originality flags     |
|             |     in a side pane ]                        |                       |
| Section     |                                             |                       |
| contract    |                                             |                       |
+-------------+---------------------------------------------+-----------------------+
| Words 1,240 / 1,500 | English (UK) | Originality: 1 red, 2 orange | Online: Gemini |
| Backup: today 18:20 | Track changes: ON | Zoom 100% [-----o--]                      |
+-----------------------------------------------------------------------------------+
```

### 27.2 What matches Word (so it feels familiar)

| Element | Behaviour |
|---|---|
| Ribbon with tabs and groups | Same idea: tabs, grouped buttons, dialog launchers; collapsible with Ctrl+F1 |
| Quick-access toolbar | Save, Undo, Redo, Back up now (customisable) |
| Navigation pane | Headings tree on the left; click to jump, drag to reorder sections |
| Styles gallery | Title, Heading 1 to 3, Normal, Block quote, Footnote text; mapped to the journal profile |
| Track Changes | Insertions and deletions in colour per author (you, supervisor, AI model), Accept / Reject buttons, simple/all-markup views |
| Comments | Margin balloons, replies, resolve; reviewer and supervisor comments appear here too |
| Footnotes | Insert with Ctrl+Alt+F; shown at the page bottom in Pages view |
| Find and replace | Ctrl+F, Ctrl+H, with options for footnotes and comments |
| Status bar | Word count against the section budget, language, zoom, mode indicators |
| Shortcuts | Ctrl+B / I / U, Ctrl+Z / Y, Ctrl+S, Ctrl+Shift+E (track changes), F7 (check language), Ctrl+K opens the command search |
| Views | Draft (fast, default), Pages (approximate print layout), Focus (hides panes), Outline |
| Opening Word files | Open `.docx` creates a project; Save as `.docx` exports |

### 27.3 What is different (the app's own tabs)

| Tab | Main groups |
|---|---|
| **Home** | Clipboard, Font, Paragraph, Styles, Find, Section status |
| **Insert** | Footnote, Citation, Table, Figure, Block quote, Special characters, Cross-reference |
| **References** | Library, Add source (DOI / URL / treaty / case / statute), Style picker, Bibliography, Citation audit |
| **Research** | Discovery panel, Literature Map, Evidence Workbench (opens as its own workspace), Support finder |
| **Review** | Track Changes, Comments, **Review desk** (reviewer comments to proposals), Compare snapshots, Response letter, Docs import / export |
| **Language** | Grammar, Consistency, Paraphraser, Terminology, Phrase bank, Translate |
| **Originality** | Live flags on / off, Thresholds, Exclusions, My works, Common phrases, Report, External check log, AI-use and authorship pack |
| **View** | Views, Zoom, Panes, Dark mode, Fonts, Section contract, Provider status |

Tabs that are not needed can be hidden, and a **Simple mode** shows only Home, Insert, References and Review for new users.

### 27.4 Task pane (right side)

The pane follows what you are doing instead of being a chat box:

| Context | Pane content |
|---|---|
| Cursor in a footnote | Source card, pinpoint field, verification state, "open PDF at page" |
| Claim selected | Support finder: library sources and Workbench passages that could support it |
| Flag clicked | Matching passage, side-by-side view, fix buttons |
| Reviewer comment selected | Plan, proposals, accept or reject, linked edits |
| Section selected | Section contract, missing moves, word budget, AI actions for this section |
| Nothing selected | Document health summary: citation audit, originality flags, consistency items |

AI output always appears **in the pane as a proposal**. Nothing enters the page until you press Insert or Accept, and inserted text carries a provenance mark (section 26.5).

### 27.5 Workbench workspace

Opening the Evidence Workbench switches the main area to the three-panel layout from section 19 (Sources, Results, Evidence). A tab strip at the top keeps the manuscript one click away, and a split-screen option shows the manuscript beside the PDF viewer.

### 27.6 Language, fonts and input

- Full Unicode: English, Bengali, Indonesian and mixed-script text in one document. Default fonts that ship with Windows 10 where possible (for Bengali, a font such as Nirmala UI), with an option to choose others.
- Windows input methods work normally; the editor must handle Bengali conjuncts and combining marks without breaking cursor movement, spell check or search.
- Interface language: English first; labels kept in a translation file so a Bengali or Indonesian interface can be added later.
- Per-paragraph language tag, so spell check and consistency rules use the correct language.

### 27.7 Accessibility and comfort

- Full keyboard use, visible focus, screen-reader labels, high-contrast and dark themes, adjustable interface size.
- Colour is never the only signal: flags and tracked changes also use underline styles and icons.
- Gentle performance on modest laptops: Draft view by default, background checks paused while typing quickly, a "Light mode" that turns off semantic checks and animations.

### 27.8 Honest limits of a Word-like editor

- Exact print pagination is difficult in a custom editor. **Pages view is an approximation**; the final layout comes from the exported `.docx` opened in Word.
- Rare Word features (complex tables, text boxes, macros, fields) are not supported; the importer lists anything it could not keep.
- Copying from Word keeps text and footnotes but drops Word's hidden fields; pasted material goes through the paste guard (section 26.6).

### 27.9 Milestones

| Phase | Deliverable | Done when |
|---|---|---|
| M0b | Window shell: ribbon, navigation pane, canvas, task pane, status bar, Draft view | A new user can create sections, type, format and add a footnote without instructions |
| M2d | Track Changes and comments UI over the change log | Accept and reject works from the margin and from the pane |
| M7b | Pages view (approximate), Focus mode, themes, Simple mode, command search | Usable full-screen on a 13-inch laptop with 8 GB RAM |

---

## 28. Core writing, editing and copy-paste (UK English by default)

### 28.1 UK English is the default everywhere

| Setting | Default |
|---|---|
| Language of new text | English (United Kingdom), `en-GB`, for every new manuscript, section, footnote, abstract and AI prompt |
| Spell check | Offline `en-GB` dictionary plus a **legal dictionary** (Latin terms, treaty and statute names, court names) and your personal dictionary |
| Spelling variant | British *-ise* spelling (*organisation*) by default; an option for Oxford *-ize* spelling if a journal requires it |
| Legal usage | *judgment* (a court decision), *defence*, *licence* (noun) / *license* (verb), *programme*, *per cent*, *towards* |
| Quotation marks | Single quotation marks for quotations, double inside them (the usual UK and OSCOLA habit), curly quotes inserted automatically |
| Dates and numbers | *12 November 2026*; thousands separators with commas; numbers one to ten spelt out in running text (adjustable) |
| Legal abbreviations | *s 25*, *ss 25 to 31*, *art 19* without full stops, joined to the number with a non-breaking space (adjustable per journal profile) |
| Dashes and ranges | En dash in ranges (*1978–1989*), spaced or unspaced dash according to journal profile |
| Serial comma | Off by default |
| Prompts to AI | Every AI request includes "Write in British English (en-GB). Keep quotations and titles exactly as in the source." |

Guards: American spelling **inside quotations, titles, case names and bibliographic entries is never "corrected"**. Paragraphs tagged as Bengali or Indonesian are not checked against `en-GB`. A journal profile can override any of the above for that manuscript, but a new manuscript always starts from UK English unless you change the global default.

### 28.2 Writing features

| Feature | Details |
|---|---|
| Structure first | Create a section from the skeleton, write notes in a section, then expand; collapse and expand sections; drag to reorder |
| Autosave and recovery | Section 25.3 |
| Smart typing | Curly quotes, dashes, non-breaking spaces, automatic *s 25* formatting, undo of any auto-correction with one keystroke |
| Auto-correct and snippets | User list (for example `icc` to *International Covenant on Civil and Political Rights (ICCPR)*); snippets with placeholders for recurring phrases |
| Defined terms | Define a term once; later uses are checked and can be inserted from a list |
| Footnotes and cross-references | Insert footnote, citation, *see section X*, *see Table 1*; references update when sections move |
| Word budgets | Live count per section against the journal limit; footnotes and references counted or excluded as the journal profile says |
| Focus tools | Focus mode, typewriter scrolling, sprint timer; optional daily writing log |
| Dictation | Windows dictation works in the editor |

### 28.3 Editing features

| Feature | Details |
|---|---|
| Review mode | Edit with Track Changes on; every change logged (section 8) |
| Block operations | Split, merge, move, duplicate and promote or demote paragraphs and headings |
| Find and replace | Whole word, case, regular expressions, within footnotes, within a section, with preview before *Replace all* |
| Format painter and styles | Apply a style to many paragraphs; changing a style updates all of them |
| Compare | Compare current text with any snapshot, or with a pasted version |
| Read aloud | Local text-to-speech to catch awkward sentences, if the system voice supports it |
| Undo history | Unlimited within a session; per-section history across sessions through the change log |
| Multiple selections | Select all occurrences of a term to rename or check them together |

### 28.4 Copy and paste

**Paste modes** (shown after pasting; default can be set):

| Mode | Result |
|---|---|
| Keep text only | Plain text, no formatting |
| Match my styles (default) | Text takes the manuscript's styles; stray fonts and sizes removed |
| Keep source formatting | Italics and bold only; no colours, sizes or fonts |
| Paste as quotation | Adds quotation marks (or a block quote for long text) and opens the citation box; keeps the source link if it came from the Workbench |
| Paste as reference list | Parses a pasted list of references into library records (marked unverified) |
| Paste as table | Detects tab or comma separated data and builds a table |

**Cleaning pasted text (especially from PDFs and web pages):**

| Problem | Fix |
|---|---|
| Line breaks in the middle of sentences | Joined into paragraphs |
| Words split by hyphens at line ends | Rejoined where safe, flagged where unsure |
| Ligatures and odd characters (ﬁ, ﬂ) | Converted to normal letters |
| Page numbers, running headers, footers | Detected and removed, with a list to review |
| Footnote numbers stuck to words | Detected and turned into footnote markers or shown for review |
| Curly versus straight quotes, double spaces | Normalised to the document's settings |
| Smart-quote and spelling variants inside quotations | Left as in the original |
| Bengali and other scripts | Preserved exactly; no automatic spelling or punctuation changes |

**Safety:** the paste guard (section 26.6) asks where larger pastes come from; pasted text is fingerprinted for the originality check; pasted AI output is marked as AI.

**Copy out:**

| Action | Result |
|---|---|
| Copy as plain text | Text only |
| Copy with footnotes | Footnotes inlined in square brackets or appended as a list |
| Copy as quotation with citation | Text in quotation marks plus the formatted footnote text |
| Copy section for email | Clean text without track-change marks |
| Clipboard history (local, optional) | Last 20 items, cleared on exit by default; never synced and excluded from backups |

**Between documents:** drag a section from another project into this one; the app copies the text, remaps footnotes and offers to merge matching library sources, marking the result as reused material for the originality check.

---

## 29. Skills and day-by-day improvement

### 29.1 What "improving by itself" really means

The AI models do not learn from your work between sessions. What improves is **the app's local knowledge about you and your field**: your preferred wording, the corrections you keep making, the mistakes reviewers keep finding, the sources you trust. That knowledge lives in **skills**: small, readable packages of instructions, rules, examples and checks stored on your computer. The app **proposes** changes to skills; **you approve them**. Nothing is trained, uploaded or silently rewritten.

### 29.2 What a skill is

A skill is a folder with plain files you can read, edit, copy and back up.

```
skills\
  builtin\            # shipped with the app (read-only)
  personal\           # yours
    uk-legal-english\
      SKILL.md        # what it does, when it runs, the instructions
      config.json     # settings, thresholds, on/off
      examples\       # good and bad examples, before and after
      tests\          # cases that must still pass after an upgrade
      CHANGELOG.md
  journal\            # one folder per journal profile
  imported\           # skills shared by others (reviewed before enabling)
```

Example `SKILL.md`:

```markdown
---
name: uk-legal-english
version: 1.3.0
description: Keeps writing in British legal English and applies my house style.
applies_to: [editor, paraphraser, ai-prompts]
requires_app: ">=0.4"
protected_checks: [citations, quotations, legal-meaning-guard, originality]
---

## Rules
- Spell in British English (-ise). Court decisions are "judgments".
- Use single quotation marks; never alter text inside quotations.
- Write "s 25", "art 19" with a non-breaking space.
- Prefer short sentences; avoid "utilise", "in order to".

## When asked to rewrite
- Keep the legal meaning (shall/may, knowing/reckless, negations).
- Offer three options; explain what changed in one line each.

## Examples
See examples/ for approved before and after pairs.
```

### 29.3 Kinds of skill

| Kind | Examples | What it can contain |
|---|---|---|
| **Style** | UK legal English, OSCOLA footnotes, my voice, abstract style | Rules, preferred phrases, banned phrases, good examples |
| **Checks** | Citation audit, consistency check, number consistency, ICCPR three-part test coverage | Deterministic checks and thresholds (no AI needed) |
| **Workflows** | Respond to Reviewer, Statute Version Comparison, Doctrinal Literature Map, Pre-submission Pack | Step lists that call the editor, Workbench and AI |
| **Domain knowledge** | Refugee-law terminology, ICCPR Article 19 guide, Bangladesh cyber-law timeline | Term lists, definitions, canonical source records you have verified |
| **Journal** | One per target journal | Limits, sections, citation style, declarations, policy notes you entered |
| **Utilities** | Paste cleaner, reference parser, slide outline | Scripts or rules with tests |

Each skill is switched on **globally**, **per manuscript** or **per journal**. Skills show their name in the pane when they influence a suggestion, so you can see why a suggestion appeared.

### 29.4 The learning loop

```
You work  ->  App records signals (local)  ->  Pattern found  ->  Suggestion card
                                                                    |
                                      You approve / edit / reject <-+
                                                |
                           Skill updated (new version, changelog, rollback)
                                                |
                      Better suggestions next time (rules and prompt context)
```

**Signals the app records (all local):**

| Signal | Example |
|---|---|
| Accepted or rejected suggestions | You rejected "utilise to use" four times, accepted it never |
| Your edits after an AI suggestion | You always restore "the Committee" instead of "UNHRC" |
| Dismissed flags | You mark the same legal formula as common |
| Dictionary additions | Names and Latin terms you add repeatedly |
| Reviewer feedback | Three reviewers asked for clearer definitions |
| Citations you confirm or correct | You always add pinpoints for statutes |
| Time and effort | Sections that take the most editing |

**Suggestion cards** (examples):

- *"You changed 'whilst' to 'while' 6 times. Add a rule to your UK Legal English skill?"* [Add] [Not now] [Never]
- *"Reviewer comments in two rounds asked for 'a clearer research question'. Add a check to the Introduction contract?"*
- *"This statute name appears 9 times in different forms. Add it to the Terminology skill?"*

**Weekly digest** (optional): what was learned, what you approved, what is waiting, and which skills had the highest and lowest acceptance rate.

**Controls:**

- Learning is **ask-first** by default; a stricter *off* and a looser *auto-add low-risk dictionary words* are available.
- Every learned rule shows where it came from (the examples that triggered it) and can be edited, scoped (this manuscript or all), turned off or deleted.
- *Pause learning* for a manuscript, for example when writing for a journal with an unusual style.

### 29.5 Protected checks: some things cannot be "learned away"

Rules proposed by the learning loop may never switch off or weaken these core protections, even if you dismiss them often:

| Protected | Reason |
|---|---|
| Citation verification states (unverified / confirmed) | Prevents invented or unchecked sources |
| Quotation locking and the legal meaning guard | Prevents silent changes to authority or legal effect |
| Originality flags and the paste guard | Protects academic integrity |
| AI provenance marks and the AI-use log | Needed for honest disclosure to journals |

The app may let you adjust *thresholds* (for example the length of a match that counts as red) within sensible limits, but not remove the check. If a suggestion card tries to reduce a protected check, it is not shown.

### 29.6 Skill health and testing

| Feature | Behaviour |
|---|---|
| **Skill report** | Per skill: times used, acceptance rate, flags dismissed, likely false alarms, suggested tuning |
| **Tests** | Each skill ships example inputs and expected outputs. They run when you edit a skill and after every app upgrade, and the result is shown as pass or fail |
| **Version history** | Every change creates a version with a changelog; one-click rollback |
| **Dry run** | Test a changed skill on a sample paragraph or on the whole manuscript before turning it on |
| **Conflicts** | If two skills disagree (for example two spelling rules), the app shows the conflict and the order of priority |
| **Provider-independent** | A skill never names a vendor; it states needs such as "needs structured JSON output" so it works with Gemini, Kimi, a local model or none |

### 29.7 Skill builder (for your own upgrades)

1. Press **New skill** and describe what you want in plain words, for example *"When I add a statute, check that I give the year and the section number."*
2. The app drafts `SKILL.md`, `config.json`, and two or three test examples.
3. You edit, run the tests, try a dry run, then enable.
4. Share it as a `.hmskill` file (a zip of the folder) or keep it private.

An **Ideas inbox** in the app lets you jot a feature idea at any moment (*"compare Section 57 and Section 25 automatically"*). Each idea is logged with the date and the screen you were on, then appears in the **Upgrade backlog**, where you can mark it *turn into a skill*, *needs code change*, or *later*. This keeps future upgrades organised: most improvements should be skills; only genuinely new capabilities change the core app.

### 29.8 Upgrading the app without losing your work

| Item | Rule |
|---|---|
| Skill versions | Each skill states the app version it needs; incompatible skills are disabled with a message, not deleted |
| Migrations | Schema changes ship with automatic migration and an automatic backup before upgrading |
| Tests first | After an upgrade, all skill tests run; failures list what to review |
| Built-in versus personal | Built-in skills update with the app; your personal copies are never overwritten, and a diff shows what changed in the built-in original |
| Export everything | *Export my skills* writes your personal and journal skills, dictionary, terminology list and learned-rule history to one file for another computer |

### 29.9 Starter skills shipped with v1

1. **UK Legal English** (section 28.1)
2. **OSCOLA footnotes and short forms**
3. **Citation audit** and **Consistency check**
4. **Legal meaning guard**
5. **Respond to reviewers**
6. **Statute version comparison**
7. **Doctrinal literature map**
8. **Refugee and human-rights terminology** (empty list you fill)
9. **Pre-submission pack** (checklist, AI-use disclosure draft, external similarity log)
10. **Abstract and keywords helper**

### 29.10 Data model additions

| Entity | Key fields |
|---|---|
| `Skill` | id, name, kind, scope, version, enabled, path, requiresApp |
| `SkillVersion` | id, skillId, version, changelog, createdAt, createdBy (you / suggestion) |
| `SkillRun` | id, skillId, context, input hash, outcome, accepted, ts |
| `LearningSignal` | id, kind, context, detail, ts |
| `LearningSuggestion` | id, skillId, proposedChange, evidenceSignalIds, status (new / approved / rejected / never) |
| `Idea` | id, text, createdAt, screen, status (inbox / skill / code / later) |

### 29.11 Milestones

| Phase | Deliverable | Done when |
|---|---|---|
| M2e | UK English defaults, legal dictionary, smart typing, paste modes and cleaner | A PDF paragraph pastes cleanly in UK style with quotes untouched |
| M3c | Skill folder format, loader, enable and disable, built-in UK Legal English and OSCOLA skills | A rule edited in `SKILL.md` changes the checker's behaviour |
| M5b | Learning signals and suggestion cards (ask-first), skill report | After a week of use the app proposes its first rules |
| M6b | Skill tests, version history, rollback, export and import of skills | An app upgrade runs all skill tests and reports results |
| M10b | Skill builder and Ideas inbox with upgrade backlog | A plain-language idea becomes a working personal skill |

---

## Appendix A: Minimal data schema (SQLite)

```sql
CREATE TABLE manuscript (id TEXT PRIMARY KEY, title TEXT, journal_profile_id TEXT, article_type TEXT, status TEXT, created_at INTEGER);
CREATE TABLE section    (id TEXT PRIMARY KEY, manuscript_id TEXT, ord INTEGER, role TEXT, title TEXT, contract_json TEXT, word_target INTEGER, status TEXT);
CREATE TABLE block      (id TEXT PRIMARY KEY, section_id TEXT, ord INTEGER, type TEXT, content_json TEXT, hash TEXT);
CREATE TABLE source     (id TEXT PRIMARY KEY, kind TEXT, csl_json TEXT, verification TEXT, note TEXT, file_path TEXT);
CREATE TABLE footnote   (id TEXT PRIMARY KEY, block_id TEXT, ord INTEGER, content_json TEXT);
CREATE TABLE citation   (id TEXT PRIMARY KEY, footnote_id TEXT, source_id TEXT, pinpoint TEXT, prefix TEXT, suffix TEXT, claim_id TEXT);
CREATE TABLE claim      (id TEXT PRIMARY KEY, block_id TEXT, text TEXT, needs_support INTEGER);
CREATE TABLE review_round (id TEXT PRIMARY KEY, manuscript_id TEXT, decision TEXT, received_at INTEGER, snapshot_id TEXT);
CREATE TABLE reviewer_comment (id TEXT PRIMARY KEY, round_id TEXT, reviewer TEXT, raw TEXT, kind TEXT, severity TEXT, targets_json TEXT, status TEXT);
CREATE TABLE proposal   (id TEXT PRIMARY KEY, comment_id TEXT, ops_json TEXT, rationale TEXT, provider TEXT, model TEXT, prompt_hash TEXT, status TEXT);
CREATE TABLE change_event (id TEXT PRIMARY KEY, ts INTEGER, actor_json TEXT, op TEXT, block_id TEXT, before_json TEXT, after_json TEXT, reason TEXT, comment_id TEXT, proposal_id TEXT, status TEXT);
CREATE TABLE snapshot   (id TEXT PRIMARY KEY, manuscript_id TEXT, label TEXT, event_cursor TEXT, created_at INTEGER);
```

## Appendix B: Provider configuration example

```json
{
  "providers": [
    { "id": "gemini",   "label": "Gemini (free key)", "baseUrl": "https://generativelanguage.googleapis.com", "privacy": "may_train", "limits": { "rpm": 10 } },
    { "id": "moonshot", "label": "Kimi (API key)",    "baseUrl": "https://api.moonshot.ai/v1", "privacy": "provider_processes", "openaiCompatible": true },
    { "id": "anthropic","label": "Claude (API key)",  "baseUrl": "https://api.anthropic.com", "privacy": "provider_processes", "auth": "api_key_only" },
    { "id": "ollama",   "label": "Local model",       "baseUrl": "http://localhost:11434", "privacy": "local" }
  ],
  "routing": {
    "classify_comments": ["gemini", "ollama"],
    "draft_edits":       ["anthropic", "moonshot", "gemini"],
    "citation_audit":    ["local_rules"]
  }
}
```

(Model names and limits are deliberately omitted: they change often. Read them from `listModels()` at runtime.)
