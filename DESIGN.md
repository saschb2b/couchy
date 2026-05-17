# Couchy — design language

This is the positive companion to `CLAUDE.md`. CLAUDE.md tells you what *not*
to ship. This file describes the visual and interaction language that *is*
the site, so a new component, page or rail can be measured against an actual
rulebook instead of vibes.

Read it once when you're about to add or rework anything visual. Every rule
here is enforced somewhere in the codebase already; if you find yourself
breaking a rule, the bar is "I can name the file that justifies the
exception", not "I felt like it".

---

## The pitch, in one paragraph

A warm-dark page in the colour of a low-lit living room. Typography does the
heavy lifting: one serif (Fraunces) used large and italic for personality,
one sans (Inter) used small and quiet for everything else. Surfaces are
hairlines on transparent, not panels with shadow. Game cards are Steam's
**landscape** header capsules (`header.jpg`, 460 × 215) with a tight meta
block underneath; persistent status pills (sale, saved) sit in the artwork
corners so the card communicates state at a glance. Motion is rare and
short. The only true accent is amber; everything else either supports it
or is functional (green = sale, brick = danger or versus). The page should
look like a magazine spread for a games column, not a SaaS dashboard.

---

## Colour

### Brand palette

| Token              | Hex                       | Role                                            | Where it lives                                                                |
| ------------------ | ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `BG_BASE`          | `#1e150d`                 | Page background — warm cocoa stage              | `theme.palette.background.default`                                            |
| `BG_PAPER`         | `#0c0907`                 | Panel surface — near-black anchor               | `theme.palette.background.paper`                                              |
| `TEXT_PRIMARY`     | `#f5ede0`                 | Warm parchment, never pure white                | body copy                                                                     |
| `TEXT_SECONDARY`   | `#9c907e`                 | Quiet warm grey                                 | captions, subtitles, meta                                                     |
| `HAIRLINE`         | `rgba(245, 237, 224, .08)`| Every divider, every card border                | `theme.palette.divider`                                                       |
| `COUCH_AMBER`      | `#ffd166`                 | **The** accent. Links, hover, selection, CTA bg | `palette.primary.main`                                                        |
| `COUCH_AMBER_DEEP` | `#f5a623`                 | Amber hover state only                          | contained-primary `:hover`                                                    |
| `SALE_GREEN`       | `#a5db5f`                 | Sale prices, "story" mood                       | `GameCard` price line, `−N%` chip                                             |
| `SALE_RED` / brick | `#e0533c`                 | Danger, "versus" mood, page wash                | `palette.secondary.main`, body radial bottom-left                             |

### Rules

- **There is one accent. It is amber.** Green and brick are *functional*: a
  green price means money saved, a brick mood tile means versus. Don't reach
  for them to add visual interest.
- **The mood tiles are the only place a fourth colour appears** (`#7ad6ff`,
  the "brain" mood). That sky-blue lives inside one component file and is
  scoped to one of four sibling tiles. Don't promote it elsewhere.
- **Text on amber is `BG_BASE`.** Not white. The contrast pairing is a brand
  signature; reversing it (black bg, amber text) is fine and common, but
  white-on-amber is forbidden.
- **The body wash is a four-source warm ambient**, set once in
  `MuiCssBaseline`. Top-down stack:
  1. SVG film grain (overlay; keeps the page from reading as a clean
     gradient).
  2. Edge vignette (`ellipse 95% 130% at 50% 50%`, transparent inside,
     `rgba(0,0,0,0.35)` at the corners). Pulls the eye toward content.
  3. Amber lamp glow top-right (`1400px × 700px at 80% 0%`, opacity 0.14).
  4. Brick hearth glow bottom-left (`1100px × 600px at 5% 100%`,
     opacity 0.11).
  5. Soft warm-tan bounce mid-left (`700px × 500px at 15% 42%`,
     opacity 0.05).
  The page reads as a *space* with multiple warm light sources, not a
  flat tint. This is the single biggest reason the page doesn't read as
  a Figma export, and it's the reason cards (on `BG_PAPER`) feel like
  objects sitting *in* a room rather than rectangles on a solid fill.
  Don't replace it with a flat colour "for performance"; the layers cost
  effectively nothing and are load-bearing for the brand. Don't strip
  the vignette either — without it the corners drift into the wash
  glows.

---

## Typography

### Two stacks, no exceptions

```ts
DISPLAY_STACK = '"Fraunces", "Times New Roman", Georgia, serif'
BODY_STACK    = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, …'
```

Display (Fraunces) is for the few moments it earns the spotlight. Body
(Inter) is for everything else.

### When to use display type

- Page H1, page H2 (rail title, footer wordmark, mood section heading).
- The italic *display-secondary* line: a short, hand-written-feeling sentence
  set in Fraunces italic at 16–22px, used directly under an H1/H2 as a
  caption. Examples: the hero subtitle, the mood-grid right-rail caption,
  the rail subtitles. This is a brand signature; use it sparingly and only
  where the H2 above it can carry it.
- Display *italic at small sizes* is also used for "labels with voice", like
  the hero's "On the couch tonight:" label. It's how a label becomes a
  sentence fragment instead of a UI element.

### When to use body type

- Everything else, including buttons (`textTransform: 'none'`,
  `letterSpacing: '-0.005em'`).
- The all-caps overline (`variant="overline"`, 11px, `letterSpacing:
  '0.18em'`, weight 600). Used for the small eyebrow labels above section
  titles ("Tonight on Steam", "By mood", "Credits"). Almost always coloured
  `primary.main` when it's a section eyebrow, `text.secondary` when it's a
  meta label.

### The size ladder (from real usage)

| Where                                       | Size           | Family    | Style       |
| ------------------------------------------- | -------------- | --------- | ----------- |
| Hero H1 ("What should we play tonight?")    | 56 / 84 / 124  | Fraunces  | -0.04em     |
| Footer wordmark ("Couchy.")                 | 56 / 96        | Fraunces  | italic      |
| Mood section H2 ("What kind of night is it?") | 40 / 64      | Fraunces  | -0.035em    |
| Rail title H3 ("Tonight's hot couch hits")  | 30 / 42        | Fraunces  | -0.03em     |
| Mood tile H4 ("Loud & silly")               | 26 / 30        | Fraunces  | -0.02em     |
| Display-italic caption                      | 16 / 18 / 22   | Fraunces  | italic, 400 |
| Body / card title                           | 15             | Inter     | 600         |
| Body / paragraph                            | 14             | Inter     | 400         |
| Caption / meta                              | 11             | Inter     | 600, 0.02em |
| Overline (eyebrow)                          | 10–11          | Inter     | 600, 0.18em |

Negative letter-spacing on display sizes scales with size: bigger type →
tighter tracking. The hero is the tightest at `-0.04em`. Don't bake
arbitrary tracking values into components; the theme already does this.

### Italic is a tool, not a decoration

There is exactly one place a single italic word appears inside an otherwise
upright headline: the hero ("What should *we* play tonight?"). It is the
signature move of the page. Cloning it on `/browse`, `/game/$appid`, or
`/about` cheapens it. The footer wordmark and the display-secondary
captions are fully italic, which is a different gesture entirely.

---

## Layout

### Page width and rhythm

- **Width cap.** `Container maxWidth="xl"` is the only container. Don't
  introduce a `lg` or a custom max-width.
- **Section vertical rhythm.** Sections breathe. Spacing seen in the codebase
  and considered canonical:
  - Between rails: `mb: { xs: 6, md: 9 }` (48 / 72 px).
  - Between major sections (hero → mood grid → rails): `mb: { xs: 8, md: 12 }`
    (64 / 96 px).
  - Footer top break: `mt: { xs: 8, md: 16 }` (64 / 128 px). The footer gets
    twice the usual gap because the H2 wordmark needs the runway.
- **Density varies on purpose.** The hero is whitespace-rich. The browse
  grid is dense. The rails are in between. Don't even out the rhythm; the
  variation *is* the design.

### Three primitives, nothing else

- `Container` for the page-width cap.
- `Box` for layout (anything you'd use a `div` for).
- `Stack` for flex flows.

`Grid` is fine for the few real grids (mood tiles, browse results), but use
CSS Grid via `Box` with `display: 'grid'` rather than `<Grid>` — the latter
fights with `noUncheckedIndexedAccess` and adds ceremony.

### The cinematic bleed

Horizontal scrollers (`GameRail`) bleed past the container on mobile so the
last card hints offscreen instead of sitting flush to the edge. The pattern
is `mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 }`. Use it whenever a row of
items extends beyond the viewport.

---

## Surfaces

- **Game cards and mood tiles sit on `BG_PAPER`.** Both render with a
  hairline border around the whole frame and a `BG_PAPER` (`#0c0907`)
  fill. The card is *one object*: artwork on top, meta plinth at the
  bottom, single enclosing border. The fill is *darker and more neutral*
  than the warm-cocoa page (`BG_BASE` = `#1e150d`); the card pops because
  the page has colour and the card doesn't. This is the same
  relationship the Steam-storefront mock uses: a colourful stage with
  near-neutral cards anchored on it. Everywhere else stays
  hairline-on-transparent.
- **The MUI `Card` component itself stays transparent.** The
  `MuiCard` override is `backgroundColor: 'transparent', backgroundImage:
  'none'`; `BG_PAPER` is applied directly to component frames that want
  it (`GameCard`, `MoodGrid` tiles, the detail-page sidebar). If you ever
  see a `Paper` rendering with the default grey, something is wrong.
- **Hairline borders, not floating panels.** Every card-shaped thing is a
  1 px `divider` border on the outer frame. Border *colour* changes on
  hover (to `primary.main` or the mood's accent); border *weight* never
  does. Internal dividers (e.g. between a card's artwork and its meta
  plinth) are also 1 px `divider`.
- **Zero shadow.** The `MuiButton` override has `disableElevation: true`.
  Nothing in the codebase uses an MUI shadow level. The card-as-frame
  reads as an object through fill + border, not elevation. Don't
  introduce shadows.

### `borderRadius` is 2

The theme sets `shape.borderRadius: 4`, but actual components override to
**2** everywhere it matters: buttons (`borderRadius: 2`), chips
(`borderRadius: 2`), icon buttons in rails (`borderRadius: 1`). Pills
(`borderRadius: 999`) are forbidden by CLAUDE.md. The site's geometry is
square; any rounded thing should look like it's *barely* rounded, not soft.

### Glass is a legibility tool, not a style

`backdrop-filter: blur(...)` appears in exactly four places, all for the
same reason: something has to read on top of unpredictable artwork or
photography. Don't add a fifth without justifying the legibility need.

| Where                                       | Recipe                                                 |
| ------------------------------------------- | ------------------------------------------------------ |
| Sticky `AppBar`                             | `rgba(14, 12, 10, 0.78)` + `blur(14px) saturate(1.2)`  |
| `SAVED` pill on card artwork                | `rgba(8, 6, 5, 0.72)` + `blur(8px)`                    |
| Shortlist / remove icon-buttons on the card | `rgba(8, 6, 5, 0.65)` + `blur(6px)`                    |
| Screenshot zoom-icon overlay                | `rgba(8, 6, 5, 0.65)` + `blur(6px)`                    |

Don't apply backdrop blur to flat cards (they sit on the body wash, not
imagery), to modals (we don't have any), or as decoration.

---

## Motion

### The cadence

- **Hover transitions: 160–220 ms `ease`.** Border colour, text colour,
  small `translateY` lifts.
- **Hover lift: `translateY(-2px)` or `-3px`. Never bigger.** A card that
  jumps 8 px on hover reads as a Figma prototype, not a page.
- **Entry animations: 360–700 ms `cubic-bezier(0.2, 0.7, 0.2, 1)` or `ease`.**
  Used for `GameCard` mount fade-up and the hero crossfade.
- **Nothing animates on idle.** No shimmer, no pulse, no breathing CTAs.
  The only idle motion on the page is the trailer video in the hero, which
  is content, not chrome.

### Hover effects worth replicating

- **Hairline → accent.** Border colour transitions from `divider` to
  `primary.main` (or the mood accent) in ~200 ms. Almost every interactive
  surface does this.
- **The bottom accent rule.** Cards have a 2 px `::after` line at the bottom
  that's invisible by default and fades to `primary.main` at opacity 1 on
  hover. Combined with the lift, it reads as "the card woke up."
- **The expanding rule.** The mood tiles have a 40 px hairline that grows to
  100 % width and shifts to the mood accent on hover, in 280 ms. Don't
  reuse this on cards; it's specific to the mood-tile gesture.

### Focus

`outline: '2px solid primary.main', outlineOffset: 2`. Always. Don't
remove focus rings for "cleanliness"; the keyboard path is part of the
feature.

---

## Less is more — encode each state once

The site has finite visual bandwidth. Every additional encoding of the
same state (a tint, a border, an animation, an icon, a caption) competes
with the encoding that's already carrying the nuance. The rule: **for
any given piece of state, pick the most precise channel and let it do
the work alone.** When you find yourself reaching to "reinforce" an
existing signal with a second one, the right move is almost always to
strengthen the first signal, not stack a new one beside it.

This is the design canon, restated:

- **Tufte, *The Visual Display of Quantitative Information* (1983).**
  The data-ink ratio: maximise the share of pixels that communicate.
  Every redundant pixel lowers the signal density of the page.
- **Dieter Rams, *Ten Principles of Good Design*.** "Weniger, aber
  besser" — less, but better. A design that solves the problem with
  fewer elements beats one that adds elements for reassurance.
- **Steve Krug, *Don't Make Me Think* (2000).** "Get rid of half the
  words on each page. Then get rid of half of what's left." Applies to
  visual encodings, not just copy.
- **John Maeda, *The Laws of Simplicity* (2006).** Law 1: "The simplest
  way to achieve simplicity is through thoughtful reduction." Reduce by
  eliminating redundancies first; reach for novelty last.

### Applied to Couchy

**Encode each state in one channel, not three.**

- A sale game shouts via the italic green `−N%` chip on the artwork and
  the green strikethrough + final-price treatment in the meta row.
  **Don't also tint the card border green.** The chip is the from-
  across-the-room signal; the price is the confirmation. A third
  encoding adds noise without adding information. (We had this; it's
  now gone.)
- A saved game wears the persistent `SAVED` pill top-right. **Don't
  also tint the fill, border, or background.** The pill is enough; if
  it isn't, make the pill better, not the surrounding surface louder.
- Hover state is *already* three layered signals: a 3 px lift, a border
  colour change, and the 2 px `::after` rule at the bottom. **Don't add
  a fourth** (brightening the image, fading in a play icon, scaling
  the title). The three existing signals are the ceiling.

**Don't paraphrase what the form already says.**

- A button labelled `BROWSE ALL` doesn't need a "See more games in this
  mood" subtitle.
- A card with hover-to-play trailer doesn't need a `▶ hover to preview`
  caption. The behaviour is the explanation.
- A section eyebrow + H2 already tells the reader what the section is.
  The italic display-caption underneath earns its place only when it
  adds *new* information or *new* voice. "Popular and hard to mess up.
  Start here when nobody can agree on anything." is voice. "Discover
  party games" underneath an H2 "Party games" is paraphrase.

**When you find yourself adding a signal, ask: what does this say that
isn't already said?** If the honest answer is "it makes the existing
signal more confident," strengthen the existing signal instead.

---

## Signature details

These are the small ornaments that make the page feel hand-set. They're
each used exactly once or in one named pattern. If you find yourself
reaching for one of these "for variety," ask whether you're cheapening it.

- **The amber dot.** A 6 px circle next to the wordmark in the AppBar.
  The only true circle on the page. Don't reuse it as a generic separator
  or status indicator.
- **The 36 × 1 px rule + overline pair.** A short amber horizontal line
  followed by an overline label. Used as the hero's "Tonight on Steam"
  eyebrow. If you want this on another section, push back: it's a hero
  gesture.
- **The italic small label.** The hero's "On the couch tonight:" sits in
  Fraunces italic at 14–16 px next to the player-count buttons. This is
  the pattern for any label that needs voice rather than chrome.
- **The SAVED pill.** A persistent 11 px allcaps amber label on glass,
  anchored `top: 8 right: 8` of the card artwork, paired with a small
  filled-bookmark icon. Only renders when the user has shortlisted the
  game; before that, the corner is empty until hover, when an icon-only
  bookmark-outline button appears. The pill is a *state-of-the-card*
  signal, not a hidden control — the user should know which cards are
  saved without hovering.
- **The hero progress line + dot row.** A 2 px full-width amber progress
  bar at the bottom of the hero, paired with a row of 28 × 14 px clickable
  dot indicators (themselves a 2 px line, not a circle). It's specific to
  the hero rotation and shouldn't be cloned for carousels elsewhere.
- **The italic discount badge.** The `−N%` chip on game cards is Fraunces
  italic on a deep-green block. It's louder than the rest of the card meta
  on purpose; sale is the one piece of card meta that earns voice.

---

## Component archetypes

When adding a new piece of UI, ask first: which of these is it a variation
of? Almost everything on the page is one of the following.

### Section eyebrow + H2 + display-italic caption

The default opener for any major section. The eyebrow is an overline in
amber. The H2 is Fraunces, large, with tightened tracking. The caption is
Fraunces italic at 16–18 px, max-width ~340–520 px, sitting either
underneath the H2 or to its right.

See: `MoodGrid.tsx` (heading row), `GameRail.tsx` (heading row).

### Header (`AppShell`)

A 64 px sticky `AppBar` with the project's glass recipe (the same
`rgba(14, 12, 10, 0.78)` + `blur(14px) saturate(1.2)` documented under
Glass). Layout, left to right:

- **Wordmark** as the home link. "Couchy" in Fraunces italic at 26 px,
  weight 800, paired with the 6 px amber dot. The wordmark is both the
  brand mark *and* the home affordance, per NN/g's logo-top-left
  convention. No paraphrase caption underneath: the wordmark plus page
  context implies what the site is.
- **Primary tabs** flushed right of centre: `DISCOVER`, `BROWSE`,
  `SAVED`. Allcaps Inter at 13 px, weight 700,
  `letter-spacing: 0.14em`. Each tab is a TanStack `<Link>` inside a
  positioned `<Box>` that carries the active-state pseudo-element.
  `SAVED` shows an 18 px amber count badge when the shortlist is
  non-empty.
- **Secondary `ABOUT` link** at the far right, past a vertical hairline
  divider. Lower hierarchy via smaller font (11 px) and `text.secondary`
  colour. About is utility, not a peer destination; the visual weight
  reflects that.

**Active state: one signal only.** The active tab gets a 2 px amber rule
positioned `top: 0; left: 14px; right: 14px` via a `::before`
pseudo-element. Tab labels stay `text.primary` regardless of active
state. The rule alone communicates state. This matches the Steam-
storefront redesign concept's top-rule pattern and satisfies the
accessibility guidance to pair colour with a non-colour shape (the rule
*is* the non-colour shape, and we deliberately don't stack a colour
change on top because that would be double-encoding per "Less is more").

**Hover state: one signal, distinct from active.** Hovering a tab tints
the label `primary.main`. Because hover and active are different states,
using a different channel for each is single-encoding per state, not
double — the user sees colour shift for "interactive" and the top rule
for "current page".

**Mobile.** Tabs hide below `sm`. The wordmark stays. We don't ship a
hamburger menu because the three destinations are reachable via in-page
affordances (the discovery hero's "Browse the catalog" CTA, the mood
tiles linking into `/browse`, the in-grid shortlist toggle).

Active detection uses `useRouterState({ select: (s) => s.location.pathname })`
with `pathname === '/'`, `startsWith('/browse')`, etc. Cleaner than
`useMatchRoute` for this case and survives `/browse` search-param
variants without per-param matching.

**Sourcing:** [NN/g — Navigation: You Are Here](https://www.nngroup.com/articles/navigation-you-are-here/),
[NN/g — Killing Off the Global Navigation](https://www.nngroup.com/articles/killing-global-navigation-one-trend-avoid/),
[UXPin — Button States 2026](https://www.uxpin.com/studio/blog/button-states/),
[Baymard 2025 on active-state benchmark](https://baymard.com/) (95% of
e-commerce sites fail to highlight the user's current section in main
nav; Couchy is in the 5% by design).

See: `AppShell.tsx`.

### Game card (the core archetype)

The card is **one bounded object**, not an image with caption text
trailing underneath. Structure:

```
┌──────────────────────────┐
│   header.jpg capsule     │  <- artwork, aspect 460 / 215
│   (with corner pills)    │
├──────────────────────────┤  <- 1 px hairline between art and plinth
│  Game Title       2-4P   │  <- row 1: title + player chip
│  POSITIVE       $19.79   │  <- row 2: review label + price
└──────────────────────────┘
   ↑ outer hairline, BG_PAPER fill, single enclosing frame
```

**Shared rules across all variants:**

- Outer frame: 1 px `divider` border, `background.paper` fill, no shadow.
- Internal art/meta separator: 1 px `divider`.
- Hover state: the whole frame lifts 3 px and the border goes
  `primary.main`, paired with a 2 px amber `::after` rule at the bottom
  of the card. The card is one hover target, not two.
- Trailer auto-plays on hover after 450 ms, inside the art region.

**Two persistent corner pills on the artwork itself:**

- **Sale** (top-left): italic green `−N%` block when discounted. Stays
  on the artwork rather than inline with the price, so the across-the-room
  scan picks it up.
- **Saved** (top-right): amber `SAVED` pill on glass when shortlisted,
  hover-revealed bookmark-outline icon when not. State-of-the-card, not
  a hidden control.

**Meta plinth, two fixed-height rows:**

1. Title (Inter weight 700, 15 px standard or 16 px featured, 1-line
   ellipsis) on the left. Player-count chip (Fraunces italic amber,
   13 px) flushed right.
2. Review label (caption, allcaps, `letter-spacing: 0.04em`) on the
   left. Price line (with sale strikethrough + green final) flushed right.

Release date moves into the title `title=""` tooltip. The two-row plinth
is denser than the prior three-row block on purpose: less to scan, more
artwork-per-screen.

**Variants:**

| `layout`     | Width   | Title px | Used at                          |
| ------------ | ------- | -------- | -------------------------------- |
| `rail`       | 288 px  | 15       | Standard horizontal scrollers    |
| `featured`   | 384 px  | 16       | The first rail on `/` only       |
| `grid`       | 100 %   | 15       | `/browse`, `/shortlist` grids    |

See: `GameCard.tsx`.

### Horizontal rail

Section eyebrow + H2 + display-italic caption, with two controls right-
aligned: a `[← →]` icon-button pair (desktop only) and a small bordered
`BROWSE ALL` pill (allcaps, 11 px, `letter-spacing: 0.12em`, tiny
external-link icon). Below that, a scroll-snap row of cards with the
cinematic bleed on xs. Scrollbar is a 6 px thin thumb at
`rgba(245, 237, 224, 0.18)`, going amber on hover.

The **first rail on `/`** is rendered with `featured={true}`, which sizes
its cards at 384 px instead of 288. Subsequent rails are standard. The
rail title and chrome don't change — the size hierarchy alone tells the
user the first rail is the discovery hero. See: `GameRail.tsx`.

### Mood tile

A panel-surface card (`BG_PAPER`) with a 1 px hairline, a 32 px icon at
the top in the mood's accent colour, an H4 title, a 14 px body blurb, the
40 px expanding rule, and an overline hint at the bottom. The whole tile
is a single link. Hover lifts the tile 2 px and turns the border the mood
accent.

See: `MoodGrid.tsx`. Mood tiles and game cards both use `BG_PAPER` as the
panel surface; nothing else does. A new component that wants a panel fill
should justify itself against those two.

### Discovery hero

Full-bleed background image with a crossfade to a trailer video after
600 ms, a top-down dark gradient + amber radial wash on top, the eyebrow
pair, an H1 with one italic accent word, the display-italic caption, the
player-count selector, and the primary/outlined CTA pair. There is *one*
discovery hero. Other pages don't get this treatment; they get a page H1
in a `<Container>` or the detail-page poster pattern below.

See: `Hero.tsx`.

### Detail-page hero (poster + still)

The game detail page combines two pieces of cover art at once:

- A full-bleed `library_hero.jpg` as the background, with the same
  top-down darken gradient as the discovery hero.
- A **portrait poster** (`library_600x900`) on the left, 240 px wide on
  md and 280 px on lg, in a hairline-bordered frame anchored to the
  bottom of the hero.
- The title H1, eyebrow pair (with the couch-category list), and
  developer line sit to the right of the poster, bottom-aligned with it.

The poster is **desktop-only** (`display: { xs: 'none', md: 'block' }`).
Mobile retains the original single-column layout because stacking poster
above title makes the hero too tall for a phone viewport. The poster
falls back to `header_image` if Steam doesn't ship a `library_600x900`
for that appid (one-shot ref-latched `onError`).

This is the only place two pieces of Steam art layer over each other.
The effect is "movie theatre frame": still behind, poster in front.

See: `src/routes/game.$appid.tsx`.

---

## Things we look like, things we don't

**We look like:** a Steam-aware print magazine. A games column with an
opinion. A friend's recommendation page that happens to be a website.

**We don't look like:** a SaaS dashboard, a Figma community template, a
Tailwind landing page, a modern fintech app, a Behance portfolio. If a
change makes the page edge toward any of those, it's wrong.

### A short checklist of AI-design tells we don't ship

If your change introduces any of the following, stop and rework:

- A second sans-serif. We have Inter and that's it.
- A drop shadow on any card.
- A `backdrop-filter` anywhere except the AppBar, the SAVED pill on a card,
  and the icon-button overlays (shortlist / remove / lightbox-zoom). All
  uses are about *legibility over imagery*, not decoration.
- A `border-radius` greater than 4. Pills and full circles are forbidden
  (the AppBar dot is the one exception, scoped to a 6 px ornament).
- A gradient on text.
- A gradient button. Buttons are flat amber or hairline-outlined.
- An emoji as a UI element (mood icons are MUI icons, not emoji).
- A "Loading…" spinner with text. Use the skeleton state on the actual
  surface; never write the word out.
- A new accent colour. Amber, green (sale), brick (versus / danger), and
  the per-mood accents already cover every case we have.
- A floating action button.
- A glassy modal. We don't have modals; we navigate.

---

## Adding a new page: the 60-second checklist

Before you commit a new page or major surface, sweep through:

- [ ] `<Container maxWidth="xl">` wrapping the page body.
- [ ] No new accent colours introduced; everything in
      `theme.palette` or one of the documented scoped accents.
- [ ] No new font; Fraunces and Inter only, via the theme tokens.
- [ ] Section openers follow eyebrow + H2 + display-italic caption.
- [ ] Cards are transparent with a hairline border; no shadows, no panels
      (except mood tiles).
- [ ] Hover states use a 160–220 ms transition and a ≤3 px lift.
- [ ] Focus rings are visible (`outline: 2px solid primary.main`).
- [ ] No `borderRadius: 999`. No `borderRadius > 4`.
- [ ] No italic accent word in any new H1 (hero exclusivity).
- [ ] Game-art usage: landscape `header.jpg` capsules on card-shaped
      surfaces, `library_hero` for full-bleed banners, and `library_600x900`
      only for the single detail-page poster. Any new portrait-art surface
      needs a one-shot `onError` fallback because the portrait isn't
      shipped for every appid.
- [ ] Copy passes the CLAUDE.md sniff test: no em dashes in user-facing
      strings, no AI tells, terse voice.
- [ ] `pnpm typecheck` and `pnpm lint --max-warnings=0` both clean.

If you can't tick all of these, fix before commit.
