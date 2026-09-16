# Barber Ride Automation

A Claude Skill that requests an Uber for my barber every Wednesday and
notifies him automatically once a driver is assigned, replacing the manual
"request → screenshot → WhatsApp" routine.

See [SPEC.md](SPEC.md) for the full write-up (problem, architecture,
Uber API decision, V1 scope, LinkedIn angle).

## Status

Working end-to-end: request the ride, track the driver, notify the
barber via WhatsApp (including the trip start PIN), all autonomously
after one fare confirmation. Skill lives at `.claude/skills/pedir-uber/`.
See [MILESTONES.md](MILESTONES.md) for what's been validated so far.
Milestone 7 (a real Wednesday dry run + LinkedIn content) is next.
