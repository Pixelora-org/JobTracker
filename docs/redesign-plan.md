# Pipeline UI / IA redesign plan

Status: proposed, awaiting approval. No code written yet.

## Why

The app grew feature by feature and the navigation now has eight top-level items.
Two pairs of them are the same data queried twice, so the bar advertises more
places than actually exist:

| Pair | Evidence |
| --- | --- |
| Board and Table | both call `listApplications()` and render the same records |
| Contacts and Follow-ups | both read `touchpoints`; `listDueFollowUps()` is that query plus `follow_up_done = false` and a due date |

Collapsing those two pairs takes the bar from eight items to five without
removing a feature. Moving the two low-frequency areas (Resumes, Friends) into
the account menu takes it to four.

The application detail page has the same problem in miniature: three heavy
regions compete on one screen (details sidebar, outreach panel, touchpoints
timeline) and nothing states what to do next.

## Goals

- Four top-level destinations, each with an obvious purpose.
- Every existing feature stays reachable. This is a re-organisation, not a cut.
- One thing in focus at a time on the application page.
- Modern, app-like feel on mobile without changing the restrained visual language.

## Non-goals

- No new palette or type scale. The mono labels, muted greys and single accent
  blue stay.
- No landing page restructure. It is already minimal; it gets spacing and type
  polish only.
- No data model or schema changes. No server action signature changes except
  where a page moves.

## Target information architecture

| Nav item | Route | Contains | Replaces |
| --- | --- | --- | --- |
| Board | `/board` | kanban and table as a view toggle, Today strip, funnel | Board + Table |
| Find | `/jobs` | job search, filters, save to Wishlist | Jobs |
| Outreach | `/contacts` | all touchpoints, plus a Due tab carrying the badge | Contacts + Follow-ups |
| Plan | `/strategy` | strategy builder, targets, streak | Strategy |
| account menu | `/resumes`, `/friends` | resume library, friends and shared threads | Resumes + Friends |

### Route handling

Nothing 404s. Old paths keep working:

- `/applications` → redirect to `/board?view=table`
- `/follow-ups` → redirect to `/contacts?tab=due`
- `/applications/[id]` is unchanged. It is the detail page, not the table.

The back link on the detail page changes from "← Applications" to "← Board".

## Phase 1 — Navigation and IA

Files: `src/components/top-bar.tsx`, `src/app/(app)/layout.tsx`,
new `src/components/mobile-nav.tsx`, new redirect pages at
`src/app/(app)/applications/page.tsx` and `src/app/(app)/follow-ups/page.tsx`.

- Reduce `NAV` to the four items above.
- Desktop: keep the top bar, four pill links, active state as today.
- Mobile: fixed bottom tab bar with the same four items. Four is the number that
  fits a phone without crowding, which is why the count matters.
- Move Resumes and Friends into the Clerk `UserButton` menu.
- The follow-up badge moves from the Follow-ups item to the Outreach item. It
  already comes from `countDueFollowUps()` in the layout, so only its position
  changes.

Risk: custom links inside `UserButton` use Clerk's `UserButton.MenuItems` and
`UserButton.Link`. I will confirm that API exists in the installed Clerk version
before relying on it. Fallback is a plain dropdown next to the avatar.

## Phase 2 — Board and Table as one page

Files: `src/app/(app)/board/page.tsx`, `src/components/kanban-board.tsx`,
`src/components/applications-table.tsx`, `src/components/top-bar.tsx`,
`src/components/app-shell-provider.tsx`.

- Add a segmented control on `/board`: Kanban ⇄ Table, driven by `?view=`.
- Both views already read the same `listApplications()` result, so the page
  fetches once and passes it to whichever view is active.
- Move the search input out of the global header and into the board toolbar.
  It only ever filtered these two views, so a global position overstated it.
  `searchQuery` stays in `AppShellProvider`, only the input relocates.

## Phase 3 — Outreach

Files: `src/app/(app)/contacts/page.tsx`, `src/components/contacts-table.tsx`,
`src/components/follow-up-list.tsx`.

- Two tabs on `/contacts`, driven by `?tab=`: "All" and "Due" with the count.
- "All" is today's contacts table and the log form.
- "Due" is today's `FollowUpList` with its Done and Snooze actions, unchanged.
- The page fetches `listTouchpoints()` and `listDueFollowUps()` together.

## Phase 4 — Application detail

File: `src/components/application-detail.tsx` (currently 275 lines, three
competing regions).

New shape:

- Header: company, role, status pill, staleness, and the actions (Share, Edit,
  Delete) as they are now.
- One **next action** line directly under the header, derived from existing
  fields: next action date, staleness, or whether any outreach is logged. This
  is the piece that is missing today.
- Three tabs, local state with `?tab=` for deep links:
  - **Overview** — details grid, job link, notes.
  - **Outreach** — the existing `OutreachPanel`, untouched internally.
  - **Activity** — touchpoints timeline and the manual log form.

The sticky sidebar goes away. Its contents become the Overview tab, which is
what makes the page feel like one thing at a time.

## Phase 5 — Visual polish

Files: `src/components/ui.tsx` and the pages it feeds.

- Consistent corner radii across cards and controls.
- Larger touch targets on mobile (controls go from `h-9` to `h-10` under `sm`).
- Tighten the spacing scale so page headers, cards and toolbars align.
- Nav active state and focus rings made consistent.
- Turn the existing ⌘K into a small command palette: Quick add stays the first
  and pre-selected entry, so ⌘K then Enter behaves exactly as it does today,
  with jump-to-page entries below it.

## Phase 6 — Landing page

File: `src/components/landing-page.tsx`.

Spacing, type scale and mock board polish only. Structure, copy and sections
stay as they are.

## Verification

After each phase: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a
manual pass over `/board`, `/board?view=table`, `/jobs`, `/contacts`,
`/contacts?tab=due`, `/strategy`, `/resumes`, `/friends`, one application
detail page, plus the two redirects.

## Sequencing

Phases 1 and 2 deliver most of the perceived improvement and are worth judging
before the rest. Phase 4 is the largest single-file change. Phases 5 and 6 are
cosmetic and safe to defer.
