# Asset credits & licenses

Every third-party asset in this project allows commercial use. This file is
the canonical attribution list — keep it updated when assets are added, and
keep the in-app credit line (Home screen footer) in sync with it.

## Playing card faces — public domain

The royal portraits in `client/public/cards/` (J/Q/K of each suit, PNG) were
rasterized from the vector playing cards released into the **public domain**
by [Byron Knoll](http://www.byronknoll.com/), obtained via
[notpeter/Vector-Playing-Cards](https://github.com/notpeter/Vector-Playing-Cards).
No attribution required (given anyway, because it's nice).

## Icons — game-icons.net, CC BY 3.0

The inline SVG icons in `client/src/gameIcons.ts` (rendered by
`GameIcon.vue`) come from [game-icons.net](https://game-icons.net), licensed
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Per the license,
icons made by:

- **Lorc** (http://lorcblog.blogspot.com) — checked-shield, knapsack,
  battle-axe, lantern-flame, fire-silhouette, crystal-ball, wooden-sign,
  campfire, castle, crossed-swords, crowned-skull, anvil, stone-tower,
  spider-web, drama-masks
- **Delapouite** (https://delapouite.com) — plague-doctor-profile,
  knight-banner, rolling-dices, church, shop, temple-gate, medieval-gate,
  castle, throne-king
- **Cathelineau** — swordman
- **Sbed** (http://opengameart.org/content/95-game-icons) — help

Processing applied: background squares stripped, fills converted to
`currentColor` (allowed under CC BY; this note documents the changes).

## Background patterns — Hero Patterns, CC BY 4.0

The tiling textures in `client/public/textures/` (`topography-ink.svg` on the
expedition map, `skulls-gold.svg` on the fight table) are from
[Hero Patterns](https://heropatterns.com) by Steve Schoger, licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Processing
applied: recolored and given a fixed fill-opacity to match the game palette.

## Fonts — SIL Open Font License 1.1

Self-hosted in `client/public/fonts/` (license texts alongside the files):

- **Cinzel** — Natanael Gama (`Cinzel-var.ttf`, variable 400–900)
- **Kreon** — Julia Petretta (`Kreon-var.ttf`, variable 300–700)
- **IM Fell English SC** — Igino Marini (`IMFellEnglishSC.ttf`)

All obtained from the [google/fonts](https://github.com/google/fonts)
repository. The OFL permits commercial use, embedding, and redistribution;
the fonts may not be sold on their own.
