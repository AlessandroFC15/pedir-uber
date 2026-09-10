# Milestones

> Pivoted 2026-09-10 from the Uber Riders API to browser automation against
> `m.uber.com`, after hitting `invalid_client` errors on the API's OAuth
> flow and finding the current developer dashboard restructured around
> enterprise/internal integrations rather than public self-serve access.
> See SPEC.md for the full note.

1. **Skill skeleton** — "get my barber an Uber" triggers the skill, returns a dummy/hardcoded response. Proves the Claude Skill interaction works. ✅
2. **Uber authentication** — log into `m.uber.com` in a browser session (via Claude in Chrome) and keep the session usable for later steps.
3. **Fare estimate** — drive the `m.uber.com` flow to enter pickup/destination and read back the fare estimate.
4. **Ride request** — confirm and submit the ride request through the web UI.
5. **Tracking** — read driver/vehicle/ETA off the post-request page once a driver is assigned.
6. **Notification** — send the barber the trip details via WhatsApp/SMS.
7. **Live dry run + content** — real Wednesday run, capture the demo, write the LinkedIn post.
