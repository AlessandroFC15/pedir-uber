# Milestones

1. **Skill skeleton** — "get my barber an Uber" triggers the skill, returns a dummy/hardcoded response. Proves the Claude Skill interaction works.
2. **Uber authentication** — OAuth flow against the Riders API, get a working authenticated client.
3. **Fare estimate** — `estimate_ride.py` returns a real fare for the configured pickup/destination.
4. **Ride request** — `request_ride.py` actually books the ride.
5. **Tracking** — `get_trip.py`, poll trip status, detect driver assignment.
6. **Notification** — `notify_rider.py`, send barber the trip details via WhatsApp/SMS.
7. **Live dry run + content** — real Wednesday run, capture the demo, write the LinkedIn post.
