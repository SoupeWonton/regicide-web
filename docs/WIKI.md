# Regicide LLM Wiki

An Obsidian knowledge base maintained collaboratively by AI agents and the human.
It follows the LLM Wiki pattern while preserving Regicide's existing documentation
hierarchy and authority rules.

## Purpose

The wiki is a derived, interlinked knowledge layer for understanding and navigating
Regicide Web. AI agents maintain concept pages, maps, and summaries. The human curates
sources, guides analysis, and explicitly approves changes to the wiki.

The wiki never replaces canon, delivery documentation, decision records, code, or
tests. When a wiki page conflicts with a source, the source with the highest authority
wins and the wiki must be corrected.

## Vault and folder structure

Open `docs/` as the Obsidian vault. Existing documentation remains in place and is
directly visible in Obsidian.

```text
canon/          authoritative intended V3 behavior
decisions/      accepted design rationale and history
delivery/       shipped state, roadmap, and code/canon gaps
proposals/      unaccepted ideas under consideration
research/       evidence, simulations, and playtests
archive/        historical V0/V2 and removed material
wiki/           local derived pages maintained by AI agents
wiki/index.md   table of contents for the derived wiki
wiki/log.md     append-only record of wiki operations
```

The derived encyclopedia uses this Obsidian-facing hierarchy:

```text
wiki/
  index.md
  v3/
    mechanics/
    landmarks/
    spells/
    relics/
    classes/
    stages/
      continents/
        continent-1/
          provinces/
    design/
      foundations/
      product/
      status/
      maps/
      evidence/
  archives/
    v2/
      simulations/
      playtests/
      landmarks/
    v0/
  log.md
```

Every directory has a Wikipedia-style `index.md` entry. V3 pages are organized by
player-facing subject rather than by source-document authority. Authority is expressed
inside each page and through citations. Historical simulations and playtests derived
from the developed V2-shaped campaign live under `wiki/archives/v2/`, even when their
original source documents remain in `research/`.

`wiki/` and `.obsidian/` are local and gitignored. Source documents remain editable,
but wiki ingestion does not authorize changes to them.

## Authority model

Always begin with [`README.md`](README.md) and preserve its hierarchy:

1. Code and tests are final authority for shipped behavior.
2. `canon/` defines intended behavior.
3. `decisions/` explains accepted changes and rationale.
4. `delivery/` describes implementation state and known code/canon gaps.
5. `proposals/` and `research/` inform design but do not override canon.
6. `archive/` is historical and never current authority.

Every derived page must state its authority as `derived`. Archived material must be
clearly labeled historical and excluded from current-answer synthesis unless the user
specifically requests historical context.

## Write authorization

Freeform discussion, brainstorming, question answering, and source review do not
authorize wiki changes. Before creating, editing, moving, or deleting anything under
`wiki/`, present the proposed change and obtain explicit human confirmation.

Approval to update the wiki does not authorize edits to source documents. Obtain
separate explicit approval before modifying anything outside `wiki/`.

## Initial ingestion scope

Ingest current material first while preserving the existing hierarchy:

- `canon/`
- `decisions/`
- `delivery/`
- active material in `proposals/`
- current evidence in `research/`

Treat `archive/` as a later historical pass. It may be indexed and made searchable,
but historical claims must never be presented as current behavior.

## Ingestion workflow

When the user asks for an ingestion:

1. Read `README.md`, then the relevant hierarchy index and full source documents.
2. Determine each source's authority and whether it is current, proposed, evidentiary,
   or historical.
3. Present an ingestion plan listing proposed concept pages, maps, summaries, source
   coverage, and likely relationships.
4. Discuss key takeaways, contradictions, and uncertain classifications with the user.
5. Wait for explicit approval before writing to `wiki/`.
6. Create or update concept-first pages. Create source-summary pages only when they add
   navigational or analytical value.
7. Add Obsidian wiki-links (`[[page-name]]`) among derived pages and citations linking
   back to source documents.
8. Update `wiki/index.md` with every created or materially changed page and a one-line
   description.
9. Append an entry to `wiki/log.md` with the date, approved scope, sources read, pages
   changed, and unresolved questions.
10. Report the completed changes to the user.

One source may inform many concept pages, and one concept page may synthesize many
sources. Prefer useful concepts over mirroring the source folder tree.

## Page names and organization

- Use lowercase, hyphenated filenames such as `deck-lifecycle.md`.
- Organize related pages into shallow folders only when the grouping is stable.
- Place current V3 entries under exactly one primary section: `mechanics`, `landmarks`,
  `spells`, `relics`, `classes`, `stages`, or `design`.
- Place continent entries beneath `v3/stages/continents/` and province entries beneath
  their owning continent. Structural entries must say when geography is not yet canon.
- Place historical V2 simulations, playtests, retired mechanics, and retired locations
  beneath `wiki/archives/v2/`; never leave them in active V3 navigation merely because
  they remain useful evidence.
- Avoid duplicate pages for synonyms; use aliases in YAML instead.
- Preserve source-document names and locations.
- Prefer specific concepts that can be meaningfully linked over broad catch-all pages.

## Page format

Every derived page should begin with YAML properties and use this structure:

```markdown
---
type: concept
status: current
authority: derived
topics:
  - campaign
sources:
  - canon/v3/campaign/structure.md
aliases: []
last_updated: YYYY-MM-DD
---

# Page Title

**Summary:** One or two sentences describing the concept and its role.

---

Main content goes here. Use clear headings and short paragraphs. End each meaningful
factual paragraph with one or more source links.

Connect related derived concepts using [[wiki-links]] throughout the text.

## Open questions

- Include unresolved questions only when they are present in or clearly implied by the
  sources. Mark inference as inference.

## Related pages

- [[related-concept-1]]
- [[related-concept-2]]
```

The YAML schema may evolve. Apply schema changes consistently and record them in
`wiki/log.md`.

## Depth and explanatory weave

A wiki page is not a short abstract of its sources. It must preserve the mechanics,
examples, rationale, alternatives, risks, consequences, dependencies, and unresolved
questions a reader needs to understand the topic without repeatedly reconstructing it
from the source tree.

Page length follows source complexity rather than a fixed template. A small accepted
rule may need only several substantial paragraphs; a class, lifecycle model, migration,
or design queue may need a long treatment with tables and examples. Do not compress a
large decision packet into a uniform three-paragraph summary.

Integrate significance and relationships into the explanation itself. Do not create
isolated “Why this matters” or “How this links” sections. Instead, each major passage
should naturally do as many of these jobs as apply:

1. Explain the rule, proposal, evidence, or state precisely.
2. Explain what experience or design problem it creates or protects.
3. Link inline to the concepts it changes, depends on, or constrains.
4. State whether it is canon, delivery state, proposal, evidence, history, or inference.
5. Cite the original source or sources for the paragraph.

The `Related pages` footer is supplementary navigation; it never substitutes for
explaining relationships with inline links in the body.

## Encyclopedia-style pages

The wiki is an internal encyclopedia written from an external reader's point of view.
Assume the reader has never played Regicide or Kingfall, does not know the repository
structure, and arrived through a search such as “Quartermaster extra draw Kingfall.” A
page must answer the query directly before discussing design history.

Concept, mechanic, character, location, and campaign pages should use this information
architecture when applicable:

1. **Lead:** a plain-language definition identifying the subject and its role.
2. **Quick facts:** category, gameplay role, loop station, authority status,
   implementation status, and subject-specific facts.
3. **What it is:** enough beginner context to understand the page without prerequisites.
4. **Confirmed design:** every relevant canonical rule, separated from proposals and
   implementation.
5. **How it works:** the player-facing process, terminology, examples, and interactions.
   If exact behavior is unsettled, say so instead of inventing it.
6. **Current design work:** proposed models, competing alternatives, and the problems
   they try to solve.
7. **Not yet decided:** precise unresolved questions and dependencies.
8. **Implementation status:** current build behavior, drift, and unbuilt work when known.
9. **History and evidence:** older behavior, simulation, playtests, or superseded ideas
   when they materially explain the subject.
10. **Connections:** prose explaining important relationships, followed by the
    supplementary `Related pages` list.

Status headings such as `Confirmed design`, `Current proposals`, and `Not yet decided`
are encouraged because they prevent ideas from being mistaken for canon. Do not create
empty sections. Essential context may be repeated from a linked page when a new reader
needs it; links provide depth rather than prerequisites.

Searchability is part of correctness. YAML should contain useful `aliases`, `topics`,
and, when appropriate, `search_terms` with names, former names, common phrasing, and
player-language queries. Important terms must also occur naturally in the prose because
not every search tool indexes YAML equally.

## Completeness and verification

Before creating or materially revising a page:

1. Read every declared source in full.
2. Inventory its headings, tables, examples, accepted boundaries, open questions, and
   explicit contradictions.
3. Check every material source section against the derived page. Omission is acceptable
   only when the material is irrelevant to the page, duplicated more clearly elsewhere,
   or deliberately routed through an inline linked concept.
4. Include every consulted or cited source in the page's YAML `sources` property.
5. Mark synthesis that is not directly stated by a source as `**Inference**`.
6. Preserve competing proposals rather than blending them into a false consensus.
7. Verify links, citations, YAML, authority labels, and inbound navigation after edits.

For dense sources, prefer structured comparison tables and worked examples over vague
summary. Source transclusion may supplement a page, but it does not replace synthesis.

## Citation rules

- Cite every meaningful factual paragraph, not merely the page as a whole.
- Link to the actual source note using an Obsidian link, for example:
  `(source: [[canon/v3/campaign/structure|Campaign structure]])`.
- Cite multiple sources when a paragraph synthesizes them.
- Preserve authority distinctions in the prose; do not describe a proposal as canon.
- If sources disagree, state the contradiction and identify the authority and date of
  each source.
- Mark unsupported claims with `**Needs verification**`.
- Mark deductions that are not directly stated in a source with `**Inference**`.
- Do not cite a derived wiki page as the original evidence for a factual claim.

## Maps and indexes

`wiki/index.md` is the entry point for the derived wiki. Organize it by stable concepts
and include one-line descriptions rather than a bare file list.

Maps may be Markdown map-of-content pages or Obsidian Canvas files. Each map must make
the current authority boundaries visible, especially the separation among canon,
delivery, proposals, research, and archive.

## Question answering

When answering from the wiki:

1. Read `wiki/index.md` first to locate relevant concepts.
2. Read the relevant derived pages and their cited source documents.
3. Synthesize the answer using the documentation authority model.
4. Cite the source documents and identify any code/canon gap.
5. If the answer is absent or uncertain, say so clearly.
6. If the answer would make a durable wiki addition, propose the change and wait for
   explicit approval before saving it.

## Lint and audit

When asked to lint or audit the wiki:

1. Check for contradictions among derived pages and against higher-authority sources.
2. Find orphan pages with no inbound links from another derived page or the index.
3. Identify important concepts that are mentioned but lack their own page.
4. Flag pages that may be outdated based on newer decisions, canon, delivery notes, or
   source modification dates.
5. Check paragraph-level citations and broken source links.
6. Check that historical and proposed material is labeled correctly.
7. Check that pages follow the current YAML and page format.
8. Report findings as a numbered list with suggested fixes; do not apply fixes without
   explicit approval.

## Obsidian plugins

Begin with Obsidian's core links, backlinks, Graph view, Canvas, and Properties.
Community plugins may be evaluated later. Do not make the wiki dependent on a community
plugin until the human explicitly approves that dependency and its configuration is
documented here.

## Rules

- Never treat the derived wiki as a new source of truth.
- Never modify source documents as part of ingestion without separate approval.
- Never write brainstorming into the wiki without explicit confirmation.
- Always update `wiki/index.md` and `wiki/log.md` after approved changes.
- Keep derived page names lowercase and hyphenated.
- Write in clear, plain language.
- Preserve contradictions and uncertainty rather than smoothing them over.
- Ask the user when classification or authority is unclear.
