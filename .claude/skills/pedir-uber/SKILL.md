---
name: pedir-uber
description: Chama um Uber para uma pessoa (pelo nome ou apelido). Use when the user says "chama um Uber pro <nome>", "pede um Uber pra <nome/apelido>", "manda um Uber pro <pessoa>", or English equivalents ("get an Uber for <name>", "order a ride for <name>"). Looks up the person in contatos.json by fuzzy-matching name/apelidos; if not found, registers them (asks for phone and pickup/dropoff) before proceeding. Drives m.uber.com via browser automation (Claude in Chrome) since the Riders API isn't practically reachable for a personal project. Sends the person WhatsApp status updates in Brazilian Portuguese, fully autonomously after fare confirmation.
---

# Pedir Uber

## Current status

Fully autonomous request → track → notify flow, generalized from a
single hardcoded contact (the barber) to a contact book in
`contatos.json`, matched by name or alias, with a registration flow for
new people. See MILESTONES.md at the project root for what's been
validated against a real ride.

## Approach

No API calls. This skill drives Uber's lightweight web client at
`m.uber.com` with Claude in Chrome, using whatever Uber session is
already logged into the browser.

**Contacts** live in `contatos.json` (same directory as this file), one
entry per person, keyed by a short id:

```json
{
  "elian": {
    "nome": "Elian",
    "apelidos": ["barbeiro", "meu barbeiro", "o barbeiro"],
    "telefone": "REDACTED_PHONE_NUMBER",
    "endereco_partida": "The One Office Tower",
    "endereco_destino": "Condomínio Brisas da Mata",
    "deep_link_query": "drop%5B0%5D=...&pickup=...&vehicle=10381"
  }
}
```

`deep_link_query` is the resolved query string (place IDs/lat-long, not
raw address text) captured the first time that person's pickup/dropoff
was resolved — reusing it skips the manual address-autocomplete flow on
every later request. Ride type is fixed at **UberX** for all contacts
(V1 scope — not yet per-contact configurable).

**Mode — real vs. test:** default to **real mode**, sending to the
matched contact's own `telefone` from `contatos.json`. Switch to **test
mode** (send to the user's own number instead — **+55 11 98932-7233** →
`5511989327233`, a global constant, not stored per-contact) only when
the user explicitly says so in their request for this run (e.g. "test
mode", "modo teste", "em modo de teste") — never infer test mode from
context, and don't ask which mode each time; the absence of that phrase
means real mode. Test-mode messages are worded identically to real ones
— no `[TESTE]` prefix or other marker, so the run is a faithful
rehearsal of the real flow. This choice only affects which WhatsApp
number all sends in this run target — every other step (fare
confirmation, the actual Uber booking, the autonomy boundary) is
identical in both modes: a test run still books and pays for a real
ride, since there's no way to rehearse the WhatsApp piece meaningfully
without a real trip to report on.

**Language: everything is in Brazilian Portuguese, no exceptions.** Every
message shown to the user in this chat — the contact-matching questions,
the registration flow, the fare confirmation card, the `AskUserQuestion`
confirmations, the final report, a decline/cancellation message, a
missing-PIN flag, an error, anything at all — and every WhatsApp message
sent to the contact. If you catch yourself about to write an English
sentence anywhere in this skill's output, stop and translate it before
sending.

**Autonomy boundary:** the user has explicitly and durably authorized
this skill to send WhatsApp messages to the matched contact
automatically, with no per-message confirmation, for every step *after*
the fare is confirmed — driver assigned, approaching, arriving,
cancelled/rebooking. The **only** step that still requires the user's
explicit "yes" in the current conversation is the fare confirmation
before the ride is booked, because that step spends real money. Once
confirmed, do not check back in with the user before sending any
WhatsApp message — just send it.

## Workflow

**Silence rule: this whole workflow sends exactly two chat messages to
the user** — the fare confirmation card (step 6), and the final report
(step 12) — **plus, for a brand-new contact, the registration questions
and confirmation covered in "Registering a new contact" below** (those
are inherent to that one-time setup, not narration). Otherwise, no
narration before, between, or after tool calls — not "vou abrir as
abas", not "agora tenho duas abas", not "logado, vou tirar outra
screenshot", nothing describing tabs, navigation, clicks, or
intermediate page states. The user cares about who the ride is for, the
fare, and the outcome — not the mechanics of getting there. Just call
the tools silently and let the designated messages carry all the
user-facing content.

1. **Identify the target person.** Extract the name/alias the user used
   (e.g. "chama um Uber pro Elian" → `"Elian"`; "pede um Uber pro meu
   barbeiro" → `"meu barbeiro"`). Fuzzy-match it against every contact's
   `nome` and each entry in `apelidos` in `contatos.json`:
   - **Confident single match** → use that contact's data, skip to step 2.
   - **Multiple plausible matches** → ask which one via `AskUserQuestion`
     (in Portuguese, e.g. question `"Encontrei mais de uma pessoa parecida.
     Qual delas?"`, one option per candidate using their `nome`) before
     continuing.
   - **No match at all** → this is a new contact. Follow "Registering a
     new contact" below, then continue to step 2 with the newly saved data.
2. Load the browser tools (`ToolSearch` for `mcp__claude-in-chrome__*` if
   not already loaded). If multiple Chrome browsers are connected, **just
   pick one yourself — never ask the user which one.** It doesn't matter
   which; use `select_browser`/`switch_browser` with the first one from
   `list_connected_browsers` if prompted, or otherwise just proceed. Use
   screenshots for everything — reading state and clicking. Take one
   screenshot per step, act on it immediately, don't loop back for extra
   confirmation screenshots.
3. Open two tabs immediately, before doing anything else: one for the
   Uber flow (step 4), one for WhatsApp. Keep both tab IDs around for the
   rest of this run. Note: WhatsApp Web reloads its full splash screen
   (~3s) on *every* navigation to a `send?phone=...` URL, even within the
   same tab in the same run — there's no "warm session" shortcut here.
   Don't bother pre-loading a bare `web.whatsapp.com` for this reason;
   just open an empty tab and navigate it fresh each time you actually
   need to send (step 9/11).
4. In the Uber tab, navigate straight to this pre-filled deep link — it
   encodes pickup, dropoff, and vehicle choice, and lands directly on the
   fare screen (skips manual address entry/autocomplete):

   ```
   https://m.uber.com/go/product-selection?<deep_link_query from the matched contact>
   ```

   If it errors or looks stale (Uber can expire place IDs), fall back to
   the manual flow: open `https://m.uber.com`, click the pickup field,
   type the contact's `endereco_partida`, select the suggestion, repeat
   for `endereco_destino` as dropoff, click **Search**, then select
   **UberX** from the list — and update `deep_link_query` in
   `contatos.json` with the freshly resolved query string while you're at
   it, same as in "Registering a new contact".
5. Take a screenshot immediately — don't insert a `wait` action first.
   Confirm we're logged in (account avatar/name top-right, not a "Log in"
   prompt). If not logged in, stop and tell the user — don't attempt to
   log in on their behalf. Only use `wait` if the screenshot actually
   shows a loading skeleton/spinner — never as a precaution.
6. From that same screenshot, visually identify the bounding box of the
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
   CORRIDA PARA <nome do contato> 🚗

   <endereco_partida>
      → <endereco_destino>

   <cropped fare-card screenshot attached here>
   ```

   If the client can't render an attached image (e.g. a plain terminal),
   fall back to stating the fare/ETA/payment as plain text in this message
   instead of the image.

   Then ask for **explicit confirmation before requesting** — this is a
   real purchase, never request without a yes — using `AskUserQuestion`
   with a single question and two options, so the user can click instead
   of having to type a reply. **Every string passed to `AskUserQuestion`
   — the question text, both option labels, and both option descriptions
   — must be in Brazilian Portuguese, same as everywhere else in this
   skill; the tool's own field names/schema are English, but nothing you
   write into it should be.** Example:
   - question: `"Confirmar e solicitar o UberX?"`
   - header: `"Confirmação"`
   - option 1: label `"Confirmar"`, description `"Solicita a corrida agora."`
   - option 2: label `"Cancelar"`, description `"Não solicita a corrida."`
   Don't fold this into the message above as plain text ending in a
   question mark; use the actual tool so it renders as clickable choices
   where the client supports it.

   **If the user picks "Cancelar" (or otherwise declines/dismisses this
   prompt):** send one short closing message, in Brazilian Portuguese,
   confirming the ride was *not* requested — e.g. `"Sem problemas, não
   solicitei a corrida."` — and stop there; don't click Request, don't
   continue to step 7. This closing message counts as this run's second
   (final) message, same as step 12 would for a completed run.
7. Only after the user confirms: click **Request \<ride_type\>** using the
   coordinates from the screenshot already taken in step 5 — don't take a
   fresh screenshot just to click a button whose position you already
   know, unless the page has visibly changed since. From this point on,
   run the rest of this workflow autonomously — no further check-ins with
   the user (see Autonomy boundary above).
8. **Confirm the URL actually changed before doing anything else.** A
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
9. Take a screenshot. If the URL is `/go/dispatching`, still searching for
   a driver — `wait` a few seconds and screenshot again (don't send any
   WhatsApp message yet, nothing to report). Once the URL becomes
   `/go/on-trip`, a driver is assigned and the page shows:
   - Header: `"Pickup in <N> mins"`
   - Driver card: photo, star rating, name, plate, vehicle model
   - `Send a message...` / call buttons (not used by this skill)
   - Pickup/dropoff addresses with `Change` links
   - Fare and payment method
   - A **security/start PIN** — the code the contact gives the driver to
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
10. As soon as a driver is assigned, send the contact a WhatsApp message
    with the trip details **including the PIN** — this is the single most
    important piece of information in this message, since the driver
    can't start the trip without it — using the WhatsApp tab already
    opened in step 3 (see "Sending a WhatsApp message" below):

    ```
    Oi! Chamei um Uber pra você 🚗

    Motorista: <name>
    Veículo: <vehicle> (placa <plate>)
    Chegada: <ETA>
    PIN de início: <pin>
    ```

    If the PIN genuinely isn't visible anywhere on the page after the
    extra scroll/screenshot in step 9, still send this message without a
    PIN line, but flag it to the user in this chat (not to the contact)
    so a human can check the Uber app for it — don't silently omit it.
11. Keep polling the tracking screen (screenshot every ~30s via `wait` +
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
      instante! 🔄"`, then go back to step 9 (wait for the new
      assignment) and use this message instead of the step 10 one once
      assigned:
      ```
      Encontrei um novo motorista! 🚗

      Motorista: <name>
      Veículo: <vehicle> (placa <plate>)
      Chegada: <ETA>
      PIN de início: <pin>
      ```
      The new driver almost certainly has a different PIN — re-read it
      from the page per step 9, don't reuse the old one.
      **This is distinct from the user cancelling the ride themselves**
      (clicking `Cancel ride`, which this skill never does) — that
      returns the tab to `/go/product-selection`, a dead end with no
      auto-rebooking (cancelling manually just dumps you back at the full
      ride list, exactly like a fresh session). If you land back on
      `/go/product-selection` after having been on `/go/on-trip`, treat
      it as the trip having ended/been cancelled — report that to the
      user, don't try to auto-rebook.
    - Trip completes (driver arrived / ride ends): stop polling.
12. Report final completion status back to the user, in Portuguese, once
    the loop above ends.

## Registering a new contact

Runs once per new person, triggered from workflow step 1 when no match
is found in `contatos.json`.

1. Ask the user (one message, in Portuguese) for the four things needed:
   nome completo, telefone (com código do país), endereço de partida,
   endereço de destino. Wait for the reply — this is free-text
   information, not a multiple-choice pick, so plain chat is right here
   (not `AskUserQuestion`).
2. Load the browser tools if not already loaded, open a Uber tab, and
   navigate to `https://m.uber.com`. Use the manual flow: click the
   pickup field, type the given `endereço de partida`, select the
   matching autocomplete suggestion; click the dropoff field, type the
   given `endereço de destino`, select its suggestion; click **Search**;
   select **UberX** from the resulting list.
3. Read the tab's resulting URL (it'll be
   `/go/product-selection?drop[0]=...&pickup=...&vehicle=...`) and take
   everything after the `?` as the new `deep_link_query`.
4. Show the resolved pickup/dropoff addresses back to the user (as Uber
   interpreted them — read off the page, not just echoing what they
   typed) and ask for confirmation via `AskUserQuestion` (in Portuguese,
   options `"Confirmar"` / `"Corrigir"`) that these are the right
   locations, before saving anything or touching the fare screen.
5. On confirmation: add a new entry to `contatos.json` — pick a short
   lowercase id (e.g. first name), and store `nome`, `apelidos` (start
   with just `[]` unless the user's phrasing implied an alias worth
   saving, e.g. they said "meu barbeiro" while giving the name — then
   include that), `telefone` (digits only, country code included, no
   spaces/dashes/plus), `endereco_partida`, `endereco_destino` (as given
   by the user, for the manual-flow fallback), and `deep_link_query` from
   step 3. Read the existing file first and merge in — don't overwrite
   other contacts.
   If the user picks "Corrigir" instead: ask what's wrong, fix it, and
   re-run from step 2 — don't save a contact the user hasn't confirmed.

## Sending a WhatsApp message

Use `web.whatsapp.com`'s `send` URL directly — not `wa.me`, which detours
through an intermediate landing page first. Use the WhatsApp tab already
opened in workflow step 3.

1. In the WhatsApp tab, navigate to:
   `https://web.whatsapp.com/send?phone=<number per Mode above>&text=<url-encoded message>`
   — the matched contact's `telefone` in real mode (default), or
   `5511989327233` (the global test number) in test mode.
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

- V1 scope: one rider per run, one ride type (UberX) for every contact.
- Fare confirmation (workflow step 6) is the only step that waits for the
  user — everything from step 7 onward runs autonomously, including all
  WhatsApp sends. A prior fare confirmation doesn't carry over to a new
  run: always ask again before booking.
- Everything in this skill — chat output and WhatsApp messages — is in
  Brazilian Portuguese.
- `contatos.json` is the single source of truth for who's been
  registered; back it up/version it like any other data this skill
  depends on (it's git-tracked alongside this file).
