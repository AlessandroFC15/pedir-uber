# Pedir Uber

<img width="731" height="480" alt="rec_Claude" src="https://github.com/user-attachments/assets/ae98dee8-efbe-4e3d-ae6b-2ecf999e1125" />

------

A Claude Skill that requests an Uber for someone else and notifies them
automatically once a driver is assigned — replacing the manual
"request → screenshot → WhatsApp" routine.

Say "chama um Uber pro meu barbeiro" and Claude drives
`m.uber.com` in your browser, confirms the fare with you once, then
handles everything else — tracking the driver, messaging the rider the
PIN they need to give the driver, and reporting back once the trip
starts.

## How it works

- **Claude in Chrome** drives `m.uber.com` using whatever Uber session
  is already logged into your browser — no Uber API integration.
- **[wacli](https://wacli.sh)** sends the WhatsApp messages (fare
  confirmation, driver details, the trip-start PIN) via the WhatsApp
  Web linked-device protocol.
- **`contatos.json`** stores who you can request rides for — name,
  aliases, phone number, and default pickup/dropoff addresses.

The skill's canonical source lives in this repo at
`.claude/skills/pedir-uber/`; install it as a personal skill via a
symlink (below) so it's available from any directory, not just this one.

## Setup

**Prerequisites:**
- [Claude Code](https://claude.com/claude-code) with the
  [Claude in Chrome](https://claude.com/claude-in-chrome) extension
  installed and connected.
- Chrome logged into the Uber account you want to book rides from.
- [wacli](https://wacli.sh) installed, with `wacli auth` already run
  once to link your WhatsApp account.

**Install:**

```bash
git clone git@github.com:AlessandroFC15/pedir-uber.git
ln -s "$(pwd)/pedir-uber/.claude/skills/pedir-uber" ~/.claude/skills/pedir-uber
```

**Contacts — no setup needed.** The first time you ask for a ride for
someone it doesn't recognize, the skill asks you for their name, phone
number (with country code), and pickup/dropoff addresses, then creates
`contatos.json` and saves them automatically — see "Registering a new
contact" in `SKILL.md`. Nothing to copy or edit by hand.
`contatos.example.json` just documents the schema, and the real
`contatos.json` the skill creates is gitignored since it holds real
phone numbers and addresses.

## Usage

```
chama um Uber pro Elian
pede um Uber pra minha sogra
/pedir-uber Elian --test
```

The optional `--test` flag sends the WhatsApp updates to your own
number instead of the contact's — useful for a dry run. The ride
itself is still real and still gets booked and paid for either way.

Everything is in Brazilian Portuguese by design (chat messages and
WhatsApp messages alike) — translate `SKILL.md` if you want it in
another language.
