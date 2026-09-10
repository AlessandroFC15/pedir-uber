# Barber Ride Automation

> **Update (2026-09-10):** The Uber Riders API is no longer practically
> reachable for a self-serve personal project — the current developer
> dashboard is restructured around internal/enterprise integrations, and a
> registered test app hit `invalid_client` on the standard OAuth flow.
> Per the "Alternatives Considered" section below, the project pivoted to
> **browser automation** against `m.uber.com` (Uber's lightweight web
> client) instead of the Riders API. See MILESTONES.md for the current plan.

## Goal

Build a small personal project that:

1. Solves a real recurring annoyance.
2. Is visible and interesting enough to become LinkedIn content.

Both goals are equally important.

## Current Problem

Every Wednesday:

- I request an Uber for my barber.
- I wait for a driver to be assigned.
- I screenshot the trip details.
- I send them to him on WhatsApp.

The annoying part is everything after deciding to request the ride.

## Desired Experience

Ideally:

```text
"Get my barber an Uber"
        ↓
Show fare / ask for confirmation
        ↓
Request ride
        ↓
Wait for driver assignment
        ↓
Automatically notify barber
        ↓
Done
```

I should not have to manually send him anything.

The notification does **not** have to come from Uber. SMS, WhatsApp, or another service is fine.

## Product Direction

Rather than building an invisible Shortcut or cron job, make the interaction visible.

The most interesting direction is a **Claude Skill**:

> "Get my barber an Uber."

The skill becomes the product/demo surface.

## Proposed Architecture

```text
Claude Skill
    ↓
Local Python / TypeScript scripts
    ↓
Uber Riders API
    ↓
Trip status / driver assignment
    ↓
Notification provider
    ↓
Barber
```

The skill can contain:

```text
barber-ride/
├── SKILL.md
├── scripts/
│   ├── estimate_ride.py
│   ├── request_ride.py
│   ├── get_trip.py
│   └── notify_rider.py
└── config/
    └── ride.json
```

`SKILL.md` provides the workflow instructions. Claude executes the supporting code using its available tools.

## Uber APIs

### Guest Rides API

Would be ideal technically because it supports third-party passengers and automatic notifications.

However, `guests.trips` requires Uber approval/whitelisting and appears targeted at Uber for Business partners.

**Decision: do not build around Guest Rides.**

### Riders API

Still worth pursuing.

Potential flow:

```text
Estimate fare
↓
Request ride from my authenticated Uber account
↓
Retrieve trip status
↓
Detect driver assignment
↓
Extract driver / vehicle / ETA
↓
Notify barber automatically
```

For a personal developer project, Uber's limited developer access may be sufficient.

One thing still worth validating is Uber's current policy around using the normal Riders API when the actual passenger is someone else.

## Alternatives Considered

- **iPhone Shortcut:** solves the personal problem but lacks enough visibility/content value.
- **Uber Central re-book:** too manual and not interesting enough.
- **Recurring rides:** does not fit because the trigger should remain manual.
- **Uber deep links:** still leave too much manual work.
- **Browser automation:** possible fallback, but brittle compared with using Uber's API.
- **Guest Rides API:** technically excellent, but access is likely unrealistic.

## V1 Scope

Keep it deliberately tiny:

- One rider
- One pickup
- One destination
- One ride type, probably UberX
- One conversational command
- Fare confirmation
- Automatic ride request
- Automatic rider notification
- Visible completion/status in Claude

## LinkedIn Angle

Potential framing:

> Every Wednesday I order an Uber for my barber, wait for a driver, screenshot the details, and send them on WhatsApp.

> So I gave Claude a new skill: "Get my barber an Uber."

The interesting part is not just the automation. It is building personal software around a tiny recurring annoyance, integrating a real-world service, dealing with API constraints, and turning it into a visible agent workflow.