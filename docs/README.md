# Regicide documentation

This directory separates intended design, design history, implementation state, and
evidence. Folder location is authoritative; archived and proposed documents do not
override current canon.

| Question | Read |
|---|---|
| What should the game be? | [`canon/`](canon/) |
| Why did the design change? | [`decisions/`](decisions/) |
| What is built, and what comes next? | [`delivery/`](delivery/) |
| What is still being considered? | [`proposals/`](proposals/) |
| What evidence supports the design? | [`research/`](research/) |
| What did older editions say? | [`archive/`](archive/) |

The active design edition is **V3**. Its complete authority map lives in
[`canon/README.md`](canon/README.md). Code remains the source of truth for shipped
behavior; canon describes intended behavior, including accepted work not yet built.

## Authority rule

There is one current answer per topic. Canon pages do not silently override one
another. A change updates the affected canon page and records its rationale in a
decision record. `delivery/current-state.md` records any temporary code/canon gap.
