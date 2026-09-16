---
name: pedir-uber
description: Chama um Uber para uma pessoa (pelo nome ou apelido). Use when the user says "chama um Uber pro <nome>", "pede um Uber pra <nome/apelido>", "manda um Uber pro <pessoa>", or English equivalents ("get an Uber for <name>"). Add a --test flag (e.g. "/pedir-uber Elian --test") to send WhatsApp updates to the user's own number instead of the contact's. Looks up the person in contatos.json by fuzzy-matching name/apelidos; registers them if not found. Drives m.uber.com via browser automation (Claude in Chrome) since the Riders API isn't practically reachable for a personal project. Sends WhatsApp status updates in Brazilian Portuguese, fully autonomously after fare confirmation.
---

# Pedir Uber

## Rules (apply throughout)

- **Portuguese, no exceptions.** Every message to the user and every
  WhatsApp message to the contact is in Brazilian Portuguese — including
  `AskUserQuestion` text, errors, and decline messages.
- **Exactly two chat messages per run**: the fare confirmation card
  (step 6) and the final report (step 12). No narration around tool
  calls, tabs, or navigation. New-contact registration is the exception —
  its one-at-a-time questions and address confirmation are inherent to
  that one-time setup, not narration.
- **Autonomy**: after the fare is confirmed (step 6), run fully
  autonomously — no further check-ins, including every WhatsApp send.
  Fare confirmation is the *only* gate, since it's the only step that
  spends money.
- **After any `zoom`/`screenshot` call with `save_to_disk: true`: the
  tool result IS the attachment. Full stop.** Never run `ls`, `find`,
  `cat`, `open`, `file`, or any other command against the saved path
  afterward — not to verify it exists, not to inspect it, not for any
  reason. The saved path in the tool result is inert metadata for your
  own reference only. Go directly from the tool call to writing the
  message that uses it.
- Never click **Cancel ride** or ask which Chrome browser to use — pick
  silently if prompted.

## Approach

No API calls — drives `m.uber.com` with Claude in Chrome, using whatever
Uber session is already logged into the browser.

**Contacts** live in `contatos.json` (same directory), keyed by id:

```json
{
  "elian": {
    "nome": "Elian",
    "apelidos": ["barbeiro", "meu barbeiro"],
    "telefone": "REDACTED_PHONE_NUMBER",
    "endereco_partida": "The One Office Tower",
    "endereco_destino": "Condomínio Brisas da Mata",
    "deep_link_query": "drop%5B0%5D=...&pickup=...&vehicle=10381"
  }
}
```

`deep_link_query` is the resolved query string (place IDs, not raw
address text) from the first time that route was resolved — reusing it
skips manual address autocomplete on repeat requests. Ride type is fixed
at **UberX** for everyone (V1 scope).

**Mode**: real (default) sends to the contact's own `telefone`. Test mode
sends to the global test number `5511989327233` instead — triggered by a
`--test` flag as the first argument, immediately after the person's
name/alias (e.g. `/pedir-uber Elian --test`, `/pedir-uber --test
barbeiro`, or the natural-language equivalent "modo teste" spoken
explicitly). Never infer test mode from anything else in the request.
Nothing else differs: a test run still books and pays for a real ride.

## Workflow

1. **Identify the person and mode.** Strip a leading/trailing `--test`
   flag from the request first (see Mode above) — whatever's left is the
   name/alias to match. Fuzzy-match it against every contact's
   `nome`/`apelidos` in `contatos.json`. Confident match → step 2.
   Multiple plausible matches → ask which one via `AskUserQuestion`. No
   match → run "Registering a new contact" below, then continue to step 2.
2. Load browser tools (`ToolSearch` for `mcp__claude-in-chrome__*`).
   Screenshots for everything — reading state and clicking.
3. Open two tabs up front: Uber (step 4) and WhatsApp. WhatsApp Web
   reloads its full ~3s splash screen on *every* `send?phone=...`
   navigation, even repeats in the same run — no warm-session shortcut,
   so don't bother pre-loading it.
4. In the Uber tab, navigate straight to the contact's deep link — lands
   directly on the fare screen:
   `https://m.uber.com/go/product-selection?<deep_link_query>`
   If it errors or looks stale, fall back to the manual flow (open
   `m.uber.com`, type pickup/dropoff into the fields, pick suggestions,
   Search, select UberX) and refresh `deep_link_query` in `contatos.json`.
5. Screenshot immediately (no precautionary `wait`). Confirm logged in
   (avatar top-right, not "Log in") — if not, stop and tell the user.
6. From that screenshot, `zoom` into the selected ride card's bounding
   box with `save_to_disk: true` — crops out the map/sidebar, leaving
   just fare/ETA/discount (see the file-inspection Rule above — go
   straight from this call to the message). Compose one message (no
   preceding commentary) in this format, image attached:

   ```
   CORRIDA PARA <nome> 🚗

   <endereco_partida>
      → <endereco_destino>

   <cropped fare-card screenshot attached here>
   ```

   (No image support, e.g. plain terminal → state fare/ETA/payment as
   text instead.) Then confirm via `AskUserQuestion` — question and both
   options/descriptions in Portuguese, e.g. "Confirmar e solicitar o
   UberX?" / **Confirmar** / **Cancelar**. Never fold this into the
   message as typed-reply text.

   If declined: send one short Portuguese closing message (e.g. "Sem
   problemas, não solicitei a corrida.") and stop — this is the run's
   final message.
7. Only if confirmed: click **Request \<ride_type\>** using step 5's
   screenshot coordinates. Everything from here runs autonomously.
8. **Check the URL before anything else.** A successful request goes
   `/go/dispatching?...&trip_uuid=<uuid>` (searching) then
   `/go/on-trip?trip_uuid=<uuid>` (driver assigned) — never assume, read
   the tab's actual URL. If still on `/go/product-selection` and a "max
   ongoing trips" dialog appears, the request likely *did* succeed
   elsewhere — dismiss it and check Activity for the live trip instead of
   treating it as failure.
9. Screenshot. `/go/dispatching` → still searching, `wait` and retry, no
   message yet. `/go/on-trip` → driver assigned; the page shows pickup
   ETA, driver card (name/plate/vehicle/rating), fare, and a **start
   PIN** the contact must give the driver. The PIN's exact position isn't
   fixed — scan the whole screenshot (and scroll once more if needed)
   before concluding it's missing.
10. Send the WhatsApp message (see below) with trip details **including
    the PIN** — the single most critical field, since the driver can't
    start without it:

    ```
    Oi! Chamei um Uber pra você 🚗

    Motorista: <name>
    Veículo: <vehicle> (placa <plate>)
    Chegada: <ETA>
    PIN de início: <pin>
    ```

    If the PIN truly isn't visible, send without it but flag that to the
    *user* (not the contact) — don't silently omit it.
11. Poll every ~30s (`wait` + screenshot), one WhatsApp message per state
    transition, never repeating a state already notified:
    - ETA ≤~3 min: `"O motorista está a poucos minutos de distância! 🕐"`
    - Arriving/≤~1 min: `"O motorista está chegando, já tá bem pertinho! 📍"`
    - **Driver cancels mid-trip** (Uber auto-searches a replacement,
      staying on `/go/on-trip` — inferred, not yet observed live): send
      `"Opa, o motorista cancelou a corrida. Já estou chamando outro pra
      você, só um instante! 🔄"`, loop back to step 9, and once reassigned
      send the same template as step 10 (new driver → re-read the PIN,
      it'll differ) but opening with "Encontrei um novo motorista! 🚗".
      **This is distinct from the user clicking Cancel ride themselves**,
      which dead-ends at `/go/product-selection` with no auto-rebook — if
      you land back there after being on `/go/on-trip`, treat the trip as
      over and report it, don't try to rebook.
    - Trip completes → stop polling.
12. Report final status to the user, in Portuguese.

## Registering a new contact

Triggered from step 1 when no match is found.

1. **Only ask for what's actually missing.** The original request often
   already gives some of this — e.g. "pra minha sogra, Dona Jaque" gives
   the name ("Dona Jaque") and an alias ("minha sogra") right there;
   don't re-ask for a name you were just told. For whatever's genuinely
   still needed among nome completo, telefone (com código do país),
   endereço de partida, endereço de destino — ask **one at a time, each
   its own short Portuguese chat message**, not `AskUserQuestion`
   (free-text, not a pick from options) and not bundled into one message
   listing several fields. Wait for each reply before asking the next.
2. Open a Uber tab, go to `m.uber.com`, resolve the route via the manual
   flow (type + pick suggestions for pickup and dropoff, Search, select
   UberX).
3. Take everything after `?` in the resulting URL as `deep_link_query`.
4. Show the resolved addresses (as Uber interpreted them, from the page)
   back to the user and confirm via `AskUserQuestion` (Confirmar /
   Corrigir) before saving anything.
5. On confirm: merge a new entry into `contatos.json` (read-modify-write,
   don't clobber existing contacts) — short lowercase id, `nome`,
   `apelidos` (include any alias implied by how the user referred to
   them), `telefone` (digits only, country code, no punctuation),
   `endereco_partida`/`endereco_destino` as given, and `deep_link_query`.
   On "Corrigir": ask what's wrong and retry from step 2.

## Sending a WhatsApp message

Use `web.whatsapp.com/send` directly (not `wa.me`, which adds a landing
page) in the tab opened in step 3.

1. Navigate to `https://web.whatsapp.com/send?phone=<number>&text=<url-encoded message>`
   — contact's `telefone` (real mode) or `5511989327233` (test mode).
2. `wait` ~3s for the splash screen, then screenshot — message should be
   pre-filled in the input box.
3. Click the green send button (bottom-right) using screenshot
   coordinates — this actually sends, no confirmation needed (Autonomy).
4. QR code instead of a chat → not logged in; stop and tell the user,
   don't log in on their behalf.

## Notes

- V1 scope: one rider per run, UberX only, for every contact.
- `contatos.json` is the source of truth for registered people —
  git-tracked alongside this file.
