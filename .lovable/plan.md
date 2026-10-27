# Switch on Feedback and Activity for admins

Apply the migration `20261027120000_feedback_and_activity.sql`. It adds:
- **Feedback**: the thumbs up/down and notes from the Help page. Anyone can send one. Only admins and pastors can read them or mark them Done.
- **Activity**: what each person does in the app (actions only, never what they wrote). People can only record their own activity. Only admins can read it.
- **Admin summaries**: the numbers on the Admin page and the member list, for admins only.
- **Clean-up**: a nightly job that deletes activity older than 6 months.

## One gap in the file
The file never gives the app permission to reach the two new tables. Without that, sending feedback and the Admin pages fail with a permission error. I'll apply the file exactly as written, then straight after it add a small second change that grants that access (anyone can send feedback and record activity; signed-in admins can read them, as the file's rules already say).

## Check afterwards
- Confirm both tables, the two summary functions and the nightly clean-up job exist.
- Open Admin, Feedback and Activity to check the "isn't switched on yet" message is gone.
