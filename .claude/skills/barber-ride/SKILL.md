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
logged into the browser. Load `config/ride.json` for pickup, dropoff, city,
and ride type.

## Workflow

1. Load the browser tools (`ToolSearch` for `mcp__claude-in-chrome__*` if
   not already loaded) and open a tab at `https://m.uber.com`.
2. Confirm we're logged in (the account avatar top-right should show a
   name, not a "Log in" prompt). If not logged in, stop and tell the user —
   don't attempt to log in on their behalf.
3. Click the pickup location field, type the `pickup` value from
   `config/ride.json`, and select the matching autocomplete suggestion.
4. Click the dropoff location field, type the `dropoff` value, and select
   the matching suggestion.
5. Click **Search** to load ride options.
6. Select the ride type matching `ride_type` (e.g. UberX) from the list.
7. Read the fare shown next to the selected ride type and **show it to the
   user, asking for explicit confirmation before requesting** — this is a
   real purchase, never request without a yes.
8. Only after the user confirms: click **Request \<ride_type\>** to book
   the ride.
9. Poll the post-request screen for driver assignment (name, vehicle,
   plate, ETA).
10. Once a driver is assigned, send the barber the trip details (channel
    TBD — milestone 6).
11. Report completion status back to the user.

## Notes

- V1 scope: one rider, one pickup, one destination, UberX only, fare
  confirmation required, automatic rider notification (once M6 lands).
- Never click Request without the user's explicit go-ahead in the current
  conversation — a prior confirmation doesn't carry over to a new run.
