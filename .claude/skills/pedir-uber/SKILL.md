---
name: pedir-uber
description: Chama um Uber pro barbeiro. Use when the user says "chama um Uber pro meu barbeiro", "pede um Uber pro meu barbeiro", "manda um Uber pro barbeiro", or the English equivalents ("get my barber an Uber", "order my barber's ride"). Drives m.uber.com via browser automation (Claude in Chrome) since the Riders API isn't practically reachable for a personal project. Sends the barber WhatsApp status updates in Brazilian Portuguese, fully autonomously after fare confirmation.
---

# Pedir Uber (Barber Ride)

## Current status

Through milestone 3 (fare estimate). Milestones 4-6 (request, tracking,
notification) are combined into one autonomous flow below — see
MILESTONES.md at the project root.

## Approach

No API calls. This skill drives Uber's lightweight web client at
`m.uber.com` with Claude in Chrome, using whatever Uber session is already
logged into the browser.

Route: **The One Office Tower** (pickup) → **Condomínio Brisas da Mata**
(dropoff), Jundiaí/SP, ride type **UberX**.

**Mode — real vs. test:** default to **real mode**, sending to the
barber's actual number: **+55 11 95913-3091** → digits-only for the send
URL: `REDACTED_PHONE_NUMBER`. Switch to **test mode** (send to the user's own
number instead: +55 11 98932-7233 → `5511989327233`) only when the user
explicitly says so in their request for this run (e.g. "test mode",
"modo teste", "em modo de teste") — never infer test mode from context,
and don't ask which mode each time; the absence of that phrase means
real mode. Test-mode messages are worded identically to real ones — no
`[TESTE]` prefix or other marker, so the run is a faithful rehearsal of
the real flow. This choice only affects which WhatsApp number all sends
in this run target — every other step (fare confirmation, the actual
Uber booking, the autonomy boundary) is identical in both modes: a test
run still books and pays for a real ride, since there's no way to
rehearse the WhatsApp piece meaningfully without a real trip to report on.

**Language: everything is in Brazilian Portuguese** — both what's shown to
the user in this chat (the fare confirmation card, status updates) and
every WhatsApp message sent to the barber.

**Autonomy boundary:** the user has explicitly and durably authorized this
skill to send WhatsApp messages to the barber automatically, with no
per-message confirmation, for every step *after* the fare is confirmed —
driver assigned, approaching, arriving, cancelled/rebooking. The **only**
step that still requires the user's explicit "yes" in the current
conversation is the fare confirmation before the ride is booked (step 5),
because that step spends real money. Once confirmed, do not check back in
with the user before sending any WhatsApp message — just send it.

## Workflow

**Silence rule: this whole workflow sends exactly two chat messages to
the user — the step 5 confirmation card, and the step 11 final report**
(the `AskUserQuestion` confirmation that follows step 5's card is a
clickable prompt, not a separate narrated message). One narrow exception:
if the PIN genuinely can't be found per step 9, that's worth its own
short message — a human needs to know before the driver arrives.
Otherwise, no narration before, between, or after tool calls — not
"vou abrir as abas", not "agora tenho duas abas", not "logado, vou tirar
outra screenshot", nothing describing tabs, navigation, clicks, or
intermediate page states. The user cares about the fare and the outcome,
not the mechanics of getting there. Just call the tools silently and let
the two designated messages carry all the user-facing content.

1. Load the browser tools (`ToolSearch` for `mcp__claude-in-chrome__*` if
   not already loaded). If multiple Chrome browsers are connected, **just
   pick one yourself — never ask the user which one.** It doesn't matter
   which; use `select_browser`/`switch_browser` with the first one from
   `list_connected_browsers` if prompted, or otherwise just proceed. Use
   screenshots for everything — reading state and clicking. Take one
   screenshot per step, act on it immediately, don't loop back for extra
   confirmation screenshots.
2. Open two tabs immediately, before doing anything else: one for the
   Uber flow (step 3), one for WhatsApp. Keep both tab IDs around for the
   rest of this run. Note: WhatsApp Web reloads its full splash screen
   (~3s) on *every* navigation to a `send?phone=...` URL, even within the
   same tab in the same run — there's no "warm session" shortcut here.
   Don't bother pre-loading a bare `web.whatsapp.com` for this reason;
   just open an empty tab and navigate it fresh each time you actually
   need to send (step 8/9).
3. In the Uber tab, navigate straight to this pre-filled deep link — it
   encodes pickup, dropoff, and vehicle choice, and lands directly on the
   fare screen (skips manual address entry/autocomplete):

   ```
   https://m.uber.com/go/product-selection?drop%5B0%5D=%7B%22addressLine1%22%3A%22Condom%C3%ADnio%20Brisas%20da%20Mata%22%2C%22addressLine2%22%3A%22Est.%20Do%20Bairro%20do%20Gramadao%2C%20Jundia%C3%AD%20-%20SP%2C%2013211-730%22%2C%22id%22%3A%22be4ab233-c3f9-45e1-80f2-04dfe98a2c4a%22%2C%22source%22%3A%22SEARCH%22%2C%22latitude%22%3A-23.193878%2C%22longitude%22%3A-46.9243127%2C%22provider%22%3A%22uber_places%22%7D&pickup=%7B%22addressLine1%22%3A%22The%20One%20Office%20Tower%20-%20GMR%22%2C%22addressLine2%22%3A%22Av.%20Jundia%C3%AD%20Esq.%20com%20a%20R.%20Hilda%20del%20Nero%20Bisquolo%2C%20102%20-%20Anhangaba%C3%BA%2C%20Jundiai%20-%20SP%2C%2013208-051%22%2C%22id%22%3A%22faa5c884-187a-f22b-55fd-d27424ec613c%22%2C%22source%22%3A%22SEARCH%22%2C%22latitude%22%3A-23.1919724%2C%22longitude%22%3A-46.9034406%2C%22provider%22%3A%22uber_places%22%7D&vehicle=10381
   ```

   If it errors or looks stale (Uber can expire place IDs), fall back to
   the manual flow: open `https://m.uber.com`, click the pickup field,
   type "The One Office Tower", select the suggestion, repeat for
   "Condomínio Brisas da Mata" as dropoff, click **Search**, then select
   **UberX** from the list.
4. Take a screenshot immediately — don't insert a `wait` action first.
   Confirm we're logged in (account avatar/name top-right, not a "Log in"
   prompt). If not logged in, stop and tell the user — don't attempt to
   log in on their behalf. Only use `wait` if the screenshot actually
   shows a loading skeleton/spinner — never as a precaution.
5. From that same screenshot, visually identify the bounding box of the
   selected ride type's card (the one with a border/highlight — UberX per
   the deep link's `vehicle` param) and `zoom` into just that region with
   `save_to_disk: true`. This crops out the map, sidebar, and every other
   ride option, leaving just the card with fare, ETA, and any discount —
   no ASCII art needed, the real Uber UI is the confirmation visual. **The
   zoom tool result is already the attachment — that's it, nothing else.**
   Don't run `ls`/`find`/`cat`/any command to locate, open, or inspect the
   saved file afterward; the saved path is just metadata for your own
   reference, not something to act on. Go straight from the `zoom` call to
   composing the message below.

   The confirmation message is the entire response to the user for this
   turn: no preceding "landed on the fare screen, let me..." commentary,
   no separate message before or after it. One message, in Brazilian
   Portuguese, this exact format, with the cropped image attached:

   ```
   CORRIDA DO BARBEIRO 🪒

   The One Office Tower
      → Condomínio Brisas da Mata

   <cropped fare-card screenshot attached here>
   ```

   If the client can't render an attached image (e.g. a plain terminal),
   fall back to stating the fare/ETA/payment as plain text in this message
   instead of the image.

   Then ask for **explicit confirmation before requesting** — this is a
   real purchase, never request without a yes — using `AskUserQuestion`
   with a single question (e.g. "Confirmar e solicitar o UberX?") and two
   options, **"Confirmar"** and **"Cancelar"**, so the user can click
   instead of having to type a reply. Don't fold this into the message
   above as plain text ending in a question mark; use the actual tool so
   it renders as clickable choices where the client supports it.
6. Only after the user confirms: click **Request \<ride_type\>** using the
   coordinates from the screenshot already taken in step 4 — don't take a
   fresh screenshot just to click a button whose position you already
   know, unless the page has visibly changed since. From this point on,
   run the rest of this workflow autonomously — no further check-ins with
   the user (see Autonomy boundary above).
7. **Confirm the URL actually changed before doing anything else.** A
   successful request navigates the tab through two distinct routes:
   - `m.uber.com/go/dispatching?...&trip_uuid=<uuid>&...` first — still
     searching for a driver, none assigned yet. Same query params as the
     product-selection deep link, plus `trip_uuid`.
   - `m.uber.com/go/on-trip?trip_uuid=<uuid>` once a driver accepts — the
     tracking screen with driver details.
   Check `tabId`'s URL (it's in every tool result's Tab Context), don't
   just assume. If the URL is still `/go/product-selection` and a "You
   have reached the maximum number of ongoing trips" dialog appears, that
   almost certainly means the request *did* succeed (a trip now exists)
   but the tab didn't navigate along with it — don't treat this as
   failure. Dismiss the dialog and check `Activity` (or retry navigating
   to `/go/home` and back) to find the live trip and its `trip_uuid`.
8. Take a screenshot. If the URL is `/go/dispatching`, still searching for
   a driver — `wait` a few seconds and screenshot again (don't send any
   WhatsApp message yet, nothing to report). Once the URL becomes
   `/go/on-trip`, a driver is assigned and the page shows:
   - Header: `"Pickup in <N> mins"`
   - Driver card: photo, star rating, name, plate, vehicle model
   - `Send a message...` / call buttons (not used by this skill)
   - Pickup/dropoff addresses with `Change` links
   - Fare and payment method
   - A **security/start PIN** — the code the barber gives the driver to
     start the trip. This is critical: without it the driver can't start
     the ride. Its exact position on the page hasn't been mapped yet, so
     actively scan the whole screenshot for it (a short numeric code,
     often labeled "PIN" or similar, sometimes near the driver card,
     sometimes only shown once you scroll/expand trip details) — don't
     assume it's absent just because it's not in the fold. If a screenshot
     genuinely doesn't show one, take one more screenshot after scrolling
     the panel before concluding there isn't one this trip.
   - A `Cancel ride` button — **never click this**; it's for the human
     user only, not something this skill triggers itself.
9. As soon as a driver is assigned, send the barber a WhatsApp message
   with the trip details **including the PIN** — this is the single most
   important piece of information in this message, since the driver can't
   start the trip without it — using the WhatsApp tab already opened in
   step 2 (see "Sending a WhatsApp message" below):

   ```
   Oi! Chamei um Uber pra você 🚗

   Motorista: <name>
   Veículo: <vehicle> (placa <plate>)
   Chegada: <ETA>
   PIN de início: <pin>
   ```

   If the PIN genuinely isn't visible anywhere on the page after the
   extra scroll/screenshot in step 8, still send this message without a
   PIN line, but flag it to the user in this chat (not to the barber) so
   a human can check the Uber app for it — don't silently omit it.
10. Keep polling the tracking screen (screenshot every ~30s via `wait` +
    screenshot) and send exactly one WhatsApp message per state
    transition — don't repeat a message for a state already notified:
    - ETA drops to a few minutes (≈3 min or less): `"O motorista está a
      poucos minutos de distância! 🕐"`
    - Driver is arriving/very close (≈1 min or "arriving now" shown):
      `"O motorista está chegando, já tá bem pertinho! 📍"`
    - **The driver cancels mid-trip** (a cancellation notice appears on
      the `/go/on-trip` page itself, and Uber auto-searches for a
      replacement without leaving that page/trip — inferred from normal
      Uber behavior, not directly observed): send `"Opa, o motorista
      cancelou a corrida. Já estou chamando outro pra você, só um
      instante! 🔄"`, then go back to step 8 (wait for the new
      assignment) and use this message instead of the step 9 one once
      assigned:
      ```
      Encontrei um novo motorista! 🚗

      Motorista: <name>
      Veículo: <vehicle> (placa <plate>)
      Chegada: <ETA>
      PIN de início: <pin>
      ```
      The new driver almost certainly has a different PIN — re-read it
      from the page per step 8, don't reuse the old one.
      **This is distinct from the user cancelling the ride themselves**
      (clicking `Cancel ride`, which this skill never does) — that
      returns the tab to `/go/product-selection`, a dead end with no
      auto-rebooking (cancelling manually just dumps you back at the full
      ride list, exactly like a fresh session). If you land back on
      `/go/product-selection` after having been on
      `/go/on-trip`, treat it as the trip having ended/been cancelled —
      report that to the user, don't try to auto-rebook.
    - Trip completes (driver arrived / ride ends): stop polling.
11. Report final completion status back to the user, in Portuguese, once
    the loop above ends.

## Sending a WhatsApp message

Use `web.whatsapp.com`'s `send` URL directly — not `wa.me`, which detours
through an intermediate landing page first. Use the WhatsApp tab already
opened in workflow step 2.

1. In the WhatsApp tab, navigate to:
   `https://web.whatsapp.com/send?phone=<selected number per Mode above>&text=<url-encoded message>`
   — `REDACTED_PHONE_NUMBER` in real mode (default), `5511989327233` in test mode.
2. This always shows a ~3s loading splash screen, even on repeat sends in
   the same tab/run — there's no warm-session shortcut. `wait` ~3s, then
   screenshot. The chat should load with the message pre-filled in the
   input box.
3. Find and click the send button (green paper-plane icon, bottom-right of
   the input box) using the screenshot coordinates — this actually sends
   the message. Per the Autonomy boundary above, do this without asking
   the user first.
4. If it shows a QR code instead of a chat, WhatsApp Web isn't logged in —
   stop and tell the user, don't attempt to log in on their behalf.

## Notes

- V1 scope: one rider, one pickup, one destination, UberX only.
- Fare confirmation (step 5) is the only step that waits for the user —
  everything from step 6 onward runs autonomously, including all WhatsApp
  sends. A prior fare confirmation doesn't carry over to a new run: always
  ask again before booking.
- Everything in this skill — chat output and WhatsApp messages — is in
  Brazilian Portuguese.
