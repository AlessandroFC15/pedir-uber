---
name: barber-ride
description: Get my barber an Uber. Use when the user says "get my barber an Uber", "order my barber's ride", or similar. Drives m.uber.com via browser automation (Claude in Chrome) since the Riders API isn't practically reachable for a personal project.
---

# Barber Ride

## Current status

Through milestone 3 (fare estimate). Requesting the ride (M4), tracking
(M5), and notifying the barber (M6) are not wired up yet — see
MILESTONES.md at the project root.

## Approach

No API calls. This skill drives Uber's lightweight web client at
`m.uber.com` with Claude in Chrome, using whatever Uber session is already
logged into the browser.

Route: **The One Office Tower** (pickup) → **Condomínio Brisas da Mata**
(dropoff), Jundiaí/SP, ride type **UberX**.

## Workflow

1. Load the browser tools (`ToolSearch` for `mcp__claude-in-chrome__*` if
   not already loaded) and open a tab. Use screenshots for everything —
   reading state and clicking. Take one screenshot per step, act on it
   immediately, don't loop back for extra confirmation screenshots.
2. Navigate straight to this pre-filled deep link — it encodes pickup,
   dropoff, and vehicle choice, and lands directly on the fare screen
   (skips manual address entry/autocomplete):

   ```
   https://m.uber.com/go/product-selection?drop%5B0%5D=%7B%22addressLine1%22%3A%22Condom%C3%ADnio%20Brisas%20da%20Mata%22%2C%22addressLine2%22%3A%22Est.%20Do%20Bairro%20do%20Gramadao%2C%20Jundia%C3%AD%20-%20SP%2C%2013211-730%22%2C%22id%22%3A%22be4ab233-c3f9-45e1-80f2-04dfe98a2c4a%22%2C%22source%22%3A%22SEARCH%22%2C%22latitude%22%3A-23.193878%2C%22longitude%22%3A-46.9243127%2C%22provider%22%3A%22uber_places%22%7D&pickup=%7B%22addressLine1%22%3A%22The%20One%20Office%20Tower%20-%20GMR%22%2C%22addressLine2%22%3A%22Av.%20Jundia%C3%AD%20Esq.%20com%20a%20R.%20Hilda%20del%20Nero%20Bisquolo%2C%20102%20-%20Anhangaba%C3%BA%2C%20Jundiai%20-%20SP%2C%2013208-051%22%2C%22id%22%3A%22faa5c884-187a-f22b-55fd-d27424ec613c%22%2C%22source%22%3A%22SEARCH%22%2C%22latitude%22%3A-23.1919724%2C%22longitude%22%3A-46.9034406%2C%22provider%22%3A%22uber_places%22%7D&vehicle=10381
   ```

   If it errors or looks stale (Uber can expire place IDs), fall back to
   the manual flow: open `https://m.uber.com`, click the pickup field,
   type "The One Office Tower", select the suggestion, repeat for
   "Condomínio Brisas da Mata" as dropoff, click **Search**, then select
   **UberX** from the list.
3. Take a screenshot immediately — don't insert a `wait` action first.
   Confirm we're logged in (account avatar/name top-right, not a "Log in"
   prompt) and read the fare, ETA, and payment method for the selected
   ride type off it. If not logged in, stop and tell the user — don't
   attempt to log in on their behalf. Only use `wait` if the screenshot
   actually shows a loading skeleton/spinner — never as a precaution.
4. Build the ASCII digit block **directly in your response text, using the
   glyph table below** — do not run `render_fare.py` or any other tool
   call for this. A tool call renders as a visible block in the transcript
   and breaks the reveal; this is plain string assembly you can do
   yourself. The confirmation message is the entire response to the user
   for this turn: no preceding "landed on the fare screen, let me..."
   commentary, no separate message before or after it. One message, this
   exact format, ending by **asking for explicit confirmation before
   requesting** — this is a real purchase, never request without a yes:

   ```
   BARBER RIDE 🪒

   The One Office Tower
      → Condomínio Brisas da Mata

   R$
   <ASCII digit block>

   UberX · <ETA> · <payment method>

   Confirm & Request?
   ```

   To build `<ASCII digit block>` for a fare like "17.97": take each
   character's 5-row glyph from the table, replace every space with `░`,
   join the glyphs for each row with a single `░` separator, then wrap the
   whole thing in a 1-character `░` border (a full `░` row above and
   below, one `░` column on each side of every row). `render_fare.py` in
   `scripts/` implements this exact algorithm — read it if you want to
   verify your output, or as a fallback if hand-assembly proves unreliable
   in practice, but don't invoke it as a live tool call.

   Digit glyphs (each row is exactly 5 characters — copy verbatim):
   ```
   0: ' ███ ' '█   █' '█   █' '█   █' ' ███ '
   1: '  █  ' ' ██  ' '  █  ' '  █  ' ' ███ '
   2: ' ███ ' '█   █' '   █ ' '  █  ' '█████'
   3: ' ███ ' '█   █' '  ██ ' '█   █' ' ███ '
   4: '█   █' '█   █' '█████' '    █' '    █'
   5: '█████' '█    ' '████ ' '    █' '████ '
   6: ' ███ ' '█    ' '████ ' '█   █' ' ███ '
   7: '█████' '    █' '   █ ' '  █  ' '  █  '
   8: ' ███ ' '█   █' ' ███ ' '█   █' ' ███ '
   9: ' ███ ' '█   █' ' ████' '    █' ' ███ '
   .: '     ' '     ' '     ' '     ' '  █  '
   ```
   Each digit's 5 quoted strings are its rows top to bottom.
5. Only after the user confirms: click **Request \<ride_type\>** using the
   coordinates from the screenshot already taken in step 3 — don't take a
   fresh screenshot just to click a button whose position you already
   know, unless the page has visibly changed since.
6. Take a screenshot of the post-request screen and read driver
   assignment (name, vehicle, plate, ETA) off it.
7. Once a driver is assigned, send the barber the trip details (channel
   TBD — milestone 6).
8. Report completion status back to the user.

## Notes

- V1 scope: one rider, one pickup, one destination, UberX only, fare
  confirmation required, automatic rider notification (once M6 lands).
- Never click Request without the user's explicit go-ahead in the current
  conversation — a prior confirmation doesn't carry over to a new run.
