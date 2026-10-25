# National Choir page tutorial video

Make a second tutorial video, matching the Galway one, for the TPH National Choir page.

## What it will be
- Phone-shaped (9:16), about 2 minutes, with a spoken AI voiceover, soft music and captions.
- **Getting there:** Teams, then Choir, then "TPH National Choir".
- **Using the page:** a walk through each section on the National Choir page (planner, songs, band tracks, rehearsals, lessons, Choir Academy, team list, songwriting, and anything National-only such as contributions), shown as it actually appears in the app.
- Saved to Files so you can download it, just like the Galway video.

## Same limits as before
- The voice is AI, not a person.
- Built from screenshots of the app with animated taps and scrolling, not filmed on a phone.
- Shows the app signed out, so sign-in-only parts won't appear.

## Technical details
- Call the `animate_video` sub-agent with the user's ask, 9:16, ~2 min, the local preview URL (http://localhost:8080), route `/groups/choir` then `/groups/choir/national`, the brand logo `public/brand/logo-144.png`, and output dir `/mnt/documents/videos/`.
- Add the task to roadmap.md.
