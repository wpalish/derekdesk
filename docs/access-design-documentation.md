# Operator access: design extension record

Recorded 2026-10-24. This is an ordinary extension of DerekDesk's **Public Reference Register**, in Operate mode. The canonical `DESIGN.md` and `.impeccable/design.json` remain unchanged. No palette, type, spacing, shape, elevation or motion token is added.

## System checked

Sources inspected: `public/app.js`, `public/styles.css`, `PRODUCT.md`, `.impeccable/surface.md`, `DESIGN.md`, `.impeccable/design.json` and `.impeccable/review/access-finish-review.md`.

| System part | Extension finding |
| --- | --- |
| Palette | All 15 normative color values occur in the stylesheet and match the sidecar's canonical metadata. Access management reuses navy, cool ground, ordinary ink, quiet rules and white actions/notices. Access state is written in words. |
| Type | The inherited system stack, responsive task heading, section-heading operator names, body copy and semibold actions remain. The names use the existing section scale rather than adding a type role. |
| Space and shape | The existing main width/gutters, wrapping action group, ruled entry padding, control radius and 700px breakpoint remain. There are no nested account cards. |
| Depth and motion | The extension adds no shadow, gradient or motion. Sidecar shadow and motion collections remain empty. |
| Named rules | Written Status and Flat Register remain applicable; access state is readable without color. Evidence Reading remains intact because the answer/source/reply renderer is unchanged. |

## Components and states

- The administrator's existing operations include **Доступ операторов**. The access task has a heading, explicit consequences, return/create actions and ruled operator entries in the same reading order at all supplied widths.
- Each entry shows its complete username, written state and inverse outlined action: **Вход разрешён / Отключить вход** or **Доступ отключён / Разрешить вход**. The action's accessible name includes the operator username.
- The new `.access-name` rule only adds `overflow-wrap: anywhere`; the 80-character synthetic name wraps within the phone reading width. This is local content resilience, not a new typography token.
- Completion uses the shared notice and explicitly describes session termination or the need to sign in again. Empty-list copy supplies a next action. Hover, focus and busy/disabled styling are inherited from shared controls; these states are source-reviewed, not separately interaction-tested in this pass.
- On an authenticated API response of 401, `api()` clears `user` and renders the existing login form before the request error reaches the shared notice. The supplied revoked-session capture shows the login task without the private queue.

## Evidence inspected

All seven supplied captures were opened in this documentation pass:

| State | Supplied captures in `.impeccable/review/` | Visible result |
| --- | --- | --- |
| Active | `access-active-desktop.jpg`, `access-active-user-1280.jpg`, `access-active-mobile.jpg` | Both operators and their enabled states/actions remain complete at 1440, 1280 and 390px widths; the long phone name wraps. |
| Disabled | `access-disabled-desktop.jpg`, `access-disabled-user-1280.jpg`, `access-disabled-mobile.jpg` | The completion notice and target's disabled state/re-enable action are visible; the other account remains enabled. |
| Revoked | `operator-revoked.jpg` | Existing login fields and error notice replace the private workspace. |

The finish review records a ship disposition for this bounded extension. Its reported 24 passing tests, API revocation/re-enable results and unchanged five-case payload hash are supplied parent execution evidence; this documenter did not run a browser, API flow or test suite. No independent security certification, company pilot or whole-product acceptance is implied. All pictured accounts are synthetic.

## Caveats and preserved drift

The extension matches the incumbent canonical system at the reviewed scope. No visual-system refresh is needed. The unavailable QUALITY BAR card and inherited seed reproducibility record are not reconstructed by this pass; the existing direction remains in force.

One pre-existing documentation overstatement remains: `DESIGN.md` describes all controls as having a 44px minimum height, while the stylesheet explicitly gives that minimum to buttons and summaries; inputs/selects rely on their font and padding. This pass neither changes that source rule nor canonizes the broader claim. The overridden pale-red generic error background is already correctly qualified in `DESIGN.md`; populated notices remain white. Product test-count synchronization is owned by the parent and is outside this file's write boundary.
