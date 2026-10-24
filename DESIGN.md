---
name: DerekDesk
description: A public reference register connecting approved RU/KK answers, source evidence and employee replies.
colors:
  navy: "#183e60"
  link: "#174e7e"
  approved: "#126653"
  pending: "#795200"
  ground: "#edf3f8"
  navigation: "#dce9f3"
  surface: "#ffffff"
  ink: "#172e45"
  muted: "#46627a"
  line: "#b9cbd9"
  field-line: "#7894aa"
  error: "#942721"
  focus: "#bd671a"
  selection-ground: "#b7ded2"
  selection-ink: "#132f29"
typography:
  display:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(1.7rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  section:
    fontSize: "1.3rem"
    fontWeight: 700
  entry-title:
    fontSize: "1rem"
    fontWeight: 700
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontWeight: 600
  muted:
    fontSize: "0.9rem"
  status:
    fontWeight: 650
  brand:
    fontSize: "1.4rem"
    fontWeight: 740
rounded:
  control: "7px"
  panel: "12px"
spacing:
  compact: "0.5rem"
  actions: "0.6rem"
  field: "0.7rem"
  base: "1rem"
  mobile-work: "1.2rem"
  page-gutter: "1.25rem"
  panel: "1.4rem"
  section: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
  navigation:
    backgroundColor: "{colors.navigation}"
    textColor: "{colors.navy}"
  navigation-current:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "{spacing.field}"
    width: "100%"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  notice-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.control}"
    padding: "{spacing.base}"
---

# Design System: DerekDesk

## Overview

**Creative North Star: "The Public Reference Register"**

DerekDesk is a working register: deep ink-blue navigation above cool pale-blue ground, with white areas for writing and reading. System typography, explicit labels and quiet rules keep the attention on the question, approved text and its source. The authority comes from visible provenance and actual status.

The signature is a connected source block containing a link, authored excerpt, version and review deadline. An employee reply follows as a separately headed, timestamped response; it does not replace that original evidence. RU and KK visitor chrome share the same visual hierarchy, while source material retains its authored language. The register has no ornamental imagery, gradients, card shadows or ambient animation in the current implementation.

This is a scan of the built `public/index.html`, `public/styles.css` and `public/app.js`, grounded by `.impeccable/surface.md` (candidate 5; `seed:3c78d412b26a4ca6`). No approved comp or QUALITY BAR card was supplied. The final `.impeccable/review/verdict-pass.md` clears the four listed fixes at the supplied capture scope; it is not a new whole-surface review. The opened evidence is `desktop.png` (1440-wide), `user-1280.png` (1280-wide), `mobile.png` (390-wide), `kazakh-chrome.png` and `multi-case-queue.png`. Focus, error and long-content treatments below are code-derived, not newly browser-verified. All captured business records are synthetic.

**Key Characteristics:**

- Cool reading ground and a stable navy shell.
- Flat, ruled white panels with gently curved corners.
- Explicit form labels and ordinary, legible web controls.
- Approved evidence and human response remain visibly distinct.
- Compact desktop work areas reflow into a complete phone reading order.

## Colors

The palette combines a cool administrative shell with restrained semantic color. Frontmatter contains the normative source values; names below describe their use.

The sidecar's generated tonal ramps are preview metadata, not additional approved application colors.

### Primary

- **Register Navy** (`navy`): header, primary actions, secondary-action text and inactive navigation text.
- **Source Blue** (`link`): underlined source links and field caret; evidence remains recognizable as an actionable reference.

### Secondary

- **Approved Teal** (`approved`): material status text in the employee workspace. Approval is also written in words.
- **Review Amber** (`pending`): pending explanatory text and expired material status. Status is also written in words.

### Neutral

- **Cool Ground** (`ground`): the page canvas and scrollbar track.
- **Navigation Wash** (`navigation`): the continuous navigation band.
- **Reading White** (`surface`): panels, fields, selected navigation and secondary actions; white text on navy.
- **Register Ink** (`ink`): default text.
- **Supporting Ink** (`muted`): dates, supporting explanation and the footer.
- **Quiet Rule** (`line`): panel edges, navigation divider, evidence separator and entry rules.
- **Field Rule** (`field-line`): stronger form-control boundaries and scrollbar thumb.
- **Error Ink** (`error`): error copy in the shared white notice.
- **Focus Copper** (`focus`): keyboard focus outline.
- **Selection Mint / Selection Ink** (`selection-ground`, `selection-ink`): selected text.

**The Written Status Rule.** Semantic color accompanies a written state; color does not carry the status alone. The current material list uses teal for both approved and draft text unless the material is expired, so teal must not be interpreted as proof of approval by itself.

## Typography

**Display and body font:** the system stack in the frontmatter. There is no webfont, separate display face, mono identity or icon font.

The type is direct and workmanlike. A strong task heading establishes orientation; ordinary paragraphs carry the answers and source excerpts. The body size and normal/heading weights use browser defaults where the stylesheet does not explicitly override them; the extracted baseline is 16px at the supplied captures, not a custom locked root size.

- **Display:** responsive task heading with tight tracking and compact line height; one `h1` introduces the current task.
- **Section:** compact `h2` for case state, queue or materials; margins give it a clear reading pause.
- **Entry title:** body-sized bold heading in repeated queue/material entries. The answer's `h3` follows the browser's heading default and is visibly larger than these entry headings.
- **Body:** paragraphs use the frontmatter body line height and a maximum measure of 72ch. Approved answer and employee reply retain intentional line breaks.
- **Label:** semibold, sentence case, placed above its own field. Buttons use the same weight.
- **Muted / Status:** supporting copy is smaller; status receives a slightly stronger weight and its semantic color.
- **Brand:** the wordmark is plain system text with the specific weight in the frontmatter.

**The Evidence Reading Rule.** Keep source excerpt, version and review deadline readable in the same flow as the approved answer. Do not reduce the evidence to an icon or hover-only disclosure.

## Layout

The shell aligns header and navigation content to a 1160px reading width, with a minimum 1.25rem side inset. Main content has a 1200px maximum outer width and 1.25rem side padding, yielding the same 1160px inner width at large sizes. Main vertical padding is 2rem and its minimum height is 75vh. The footer stays in normal document flow.

Paired tasks use a grid of `minmax(0, 1fr)` and `minmax(260px, .8fr)`, separated by 2rem. The visitor form precedes the case result; the workspace queue precedes materials. This ratio describes the implemented paired workspace, not a requirement for every future screen. Login is a single panel capped at 460px. Form rows, where used, have equal columns and a 1rem gap.

At 700px and below, paired work areas and form rows become one column. The task/form remains before its result, the work gap becomes 1.2rem, panel padding becomes 1rem, and main padding becomes 1.4rem vertically and 1rem horizontally. Navigation wraps with equal flexible buttons. The header aligns to the top; its descriptor becomes smaller and may wrap within 140px.

Actions wrap with a 0.6rem gap and a 1rem top margin. Buttons and summaries have an explicit minimum 44px height; inputs and selects use the shared font and padding without an explicit minimum height. Textareas start at 100px and resize vertically. Long answers preserve newlines; the separate `pre` treatment wraps long tokens. Do not assume arbitrary unbroken URLs have been visually stress-tested.

## Elevation & Depth

There are no shadows in the implemented vocabulary. Depth comes from the navy shell, navigation wash, white reading areas and thin rules. Primary actions use solid fill; secondary actions remain white with a navy outline. Buttons brighten on hover using a filter, without movement. No transition duration or motion easing is defined; do not invent a motion token. Keyboard focus uses a three-pixel copper outline offset by three pixels.

**The Flat Register Rule.** Use surface tone, spacing and rules to separate work. Preserve the flat treatment when extending the current world.

## Shapes

Panels use the larger, gently curved corner token; fields, buttons and notices use the smaller control token. Borders are one pixel. Panels have a quiet rule, fields a stronger boundary, and secondary buttons a navy boundary. The register has no pill chips, avatar geometry, decorative badges or floating card stacks.

The source block is an unboxed reading continuation separated by a top rule. Repeated queue and material entries are divided by rules rather than nested cards. Native select and file-input affordances remain visible.

## Components

### Buttons

Solid and outlined actions feel familiar and deliberate. Both variants use the control radius, semibold text, a one-pixel navy border and the frontmatter padding. Minimum height is 44px. Hover brightness is 1.13; disabled controls show a wait cursor and opacity of .55. Keyboard focus uses the shared focus outline. There is no custom pressed-state transform or animation.

Language choices reuse these same two variants: solid for the selected language and outlined for the other. Do not introduce a separate chip vocabulary for this control.

### Inputs / Fields

Text, password, URL, date, textarea and select controls share a white fill, stronger field rule, full width and the control radius. Padding comes from the field token. Labels sit above controls and must remain explicitly associated with a unique ID, including repeated reply fields. Native select affordances communicate the case-history collection. Date input numerals use tabular spacing. Errors appear in the shared notice; the implementation does not define a separate per-field invalid-state style.

### Navigation

A full-width wash holds two plain buttons. Inactive buttons are transparent with navy text; the current page is white with a quiet border. The current state is represented by `aria-current="page"`. Phone navigation may wrap; its actions remain complete. Header, navigation accessibility label, skip link and footer use the current visitor language. The employee workspace remains Russian.

### Panels and Repeated Entries

White reading panels use a quiet border, the panel radius and frontmatter panel padding, reduced at the mobile breakpoint. They have no shadow. Queue/material entries use bottom rules and 1rem vertical padding, with no trailing rule on the last entry. Preserve this flatter hierarchy when adding more records.

### Source Evidence and Human Reply

The signature source block has a top rule, a 1rem top margin and inset, and a .4rem internal grid gap. It contains the source label, linked title, excerpt and smaller review-date/version line. The original answer and source stay present after resolution. A separately headed employee reply and timestamp follow; chronology is visible without turning the reply into another source.

The case-history selector stays above the selected case. Each option identifies a retained question, and choosing an option changes the displayed case. Access proof remains private application state; it is not a visual badge or a public URL decoration.

### Notices and Keyboard Access

The populated notice uses white, a quiet border, the control radius and 1rem padding. Error copy uses error ink. Although the generic error rule declares a pale red background, the more specific populated-notice selector overrides that background to white in the actual application; the overridden wash is not a normative token here. The notice is a polite live status region and receives focus on request failure. The skip link is hidden above the page until focused, then appears on a white field near the upper-left corner. Focus and error appearance are code-derived in this documentation.

## Do's and Don'ts

### Do:

- **Do** keep approved text, linked source, excerpt, version and review deadline in one continuous reading flow.
- **Do** keep an employee reply separately headed and timestamped beneath retained source evidence.
- **Do** use a written status together with teal or amber.
- **Do** retain explicit, uniquely associated labels and the shared visible focus outline.
- **Do** preserve question/form before result when paired work areas stack on a phone.
- **Do** localize visitor chrome while retaining source material in its authored language.

### Don't:

- **Don't** add shadows, gradients or ambient motion to the current flat register vocabulary.
- **Don't** turn every repeated entry into another rounded card.
- **Don't** hide provenance behind an icon, tooltip or collapsed decorative badge.
- **Don't** interpret teal text alone as an approval guarantee.
- **Don't** present the supplied fix verdict as a full new surface review or a company pilot.
