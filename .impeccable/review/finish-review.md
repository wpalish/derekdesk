disposition: fix

Missing inputs: no QUALITY BAR card or chosen decision comp was supplied. Admin, operator, open/resolved case, focus, error and overlong-content states are unpictured; findings on those states below come from code, not visual verification.

## persistence

Pass. PRODUCT.md and the code-led direction contract exist. `seed:3c78d412b26a4ca6` is in FORM and `concept-seed --check-seed` confirmed it was rolled on this machine. An approved comp and comp build-state gates do not apply. DESIGN.md is correctly deferred to the documenter. PRODUCT.md predates this implementation and still describes HTTP/UI as future work; that existing context drift should be reported to the documenter.

The required evidence is valid: desktop.png is 1440×900, mobile.png is 390×1305 and user-1280.png is 1280×866. All show the document top through the footer, the selected KK visitor state and its source strip without blank regions or clipped controls. The supplied detector result is `[]`; no second detector was run.

## fidelity

| Element / promise | Finding | Evidence |
| --- | --- | --- |
| TYPE | match | System UI type is explicitly committed in OWN-WORLD. Visible hierarchy, line lengths and form labels are legible at all three supplied widths. |
| MATERIAL | match | The committed public-reference register uses flat ink, rules and reading surfaces; the implementation introduces no faked physical material or ornamental substitute. |
| GROUND | match | The cool pale-blue field, deep ink-blue header and white reading surfaces follow OWN-WORLD; CSS uses `#edf3f8`, `#183e60` and white. |
| THESIS: approved answer, source, date and status | contradicted in the resolved state | The captured approved state connects the answer to its source, due date and v1. `public/app.js:10` uses `if(item.resolution) … else if(item.answer)`, so a human resolution removes the original approved answer and its source/version/date strip even though `publicCase` retains both. This state is unpictured. |
| OWN-WORLD: reference register | match | Restrained form geometry, rules and aligned reading areas carry the working register without costume elements. Teal/amber status treatments exist in code but their workspace states are unpictured. |
| STORY: visitor can return to an own private case | contradicted after a second question | `public/app.js:9` stores only one case and proof. Every successful submit at line 11 overwrites it. Asking another question while an earlier case awaits a reply permanently removes the earlier case's only retrieval path from the UI and sessionStorage. The documented single-case happy path does not cover this state. |
| FIRST VIEWPORT: form then source/status | match; mobile adaptation | The 1440 and 1280 captures show the task and source side by side. At 390 the result follows the form in document order; this adaptation follows the phone use scene in FORM and retains complete content and actions. |
| FORM: source/version/review-date signature | match in captured approved state; contradicted after resolution | The signature is visibly present in all supplied captures; the conditional rendering noted above removes it when the employee replies. |
| RU/KK visitor navigation | contradicted | With Қазақша selected, the visible page header, both navigation actions and footer remain Russian. `public/index.html` hardcodes this visitor chrome outside the locale dictionary. Source titles/excerpts may correctly stay in their original language. |
| Queue reply accessibility | contradicted for more than one case | `field()` at `public/app.js:4` always creates `f-${name}`. The queue loop at line 14 calls it with `reply` for every case, producing duplicate `f-reply` IDs and labels that target the first textarea. This state is unpictured. |
| Demonstration truth | match | The visible policy and excerpt identify themselves as trial/fictitious data. No invented metrics, customer claims, deployment or external integration claims appear. |

## ceiling

The QUALITY BAR ceiling cannot be scored without its card. At the supplied visitor-state scope, the register's restrained typography, dense source evidence and clear reading order are carried through desktop and phone. No additional ornament, depth treatment or ambient motion is required by this Operate contract. No craft-floor ban appears in the captures; the explicitly pinned system UI typography is appropriate to this contract.

## material_fixes

1. STORY / private retrieval — preserve a selectable collection of case IDs and access proofs in this tab when a new question is submitted, so an earlier pending case can still be refreshed after later questions and a reload; `public/app.js:9,11,19`.
2. THESIS / signature strip — render the original approved answer with its source/version/review-date alongside a separately identified employee resolution, rather than hiding the provenance when `resolution` exists; show the supplied resolution timestamp as part of the human response; `public/app.js:10`.
3. Accessibility floor — give every queue reply textarea a unique ID tied to its case and keep each label associated with its own control; verify with at least two open cases; `public/app.js:4,14`.
4. RU/KK visitor coverage — localize the shared visitor header, navigation and footer when the visitor changes language; preserve source text in its authored language; `public/index.html` and `public/app.js:8,11`.

## keep

Keep the connected exact-answer/source/version/due-date treatment, the restrained cool reading surfaces, the working phone reflow and the private case proof boundary while fixing the listed cases.
