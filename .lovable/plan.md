Apply the Church Space step 2 migration exactly as written (no edits to the SQL).

What it does:
- Each church only sees its own records. An extra "only this church" rule sits on top of every church list; it can only narrow who sees what, never widen it.
- Roles (admin, pastor, choir and so on) count only in the church they were given in.
- Members only see profiles of people in their own church (and themselves).
- The admin activity summaries count only their own church.
- Adds a hidden "Test Church" used to check churches are kept apart.
- No visible change today: everyone is in The Power House and the app doesn't ask for another church yet.

After applying:
- Fix any new security warnings the migration raises.
- Check the hidden Test Church exists, every role still belongs to The Power House, and a signed-out visitor still gets The Power House as their church.
- Check, signed in, that Home, Church and Choir still show their content and that an admin still counts as an admin.
