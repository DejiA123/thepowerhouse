# Deploy functions, apply phone fix, check daily reminders

1. **Deploy edge functions**: send-daily-reminders, send-push, social-circle, push-subscribe. Report success or the error for each one.
2. **Apply the migration** `20261026230000_no_placeholder_phone.sql` exactly as written:
   - Stop giving new accounts the placeholder phone "+234 123 456 7890".
   - Clear that placeholder from profiles that still have it. Real numbers stay as they are.
3. **Check the daily reminder schedule** (read-only):
   - Look up `cron.job` for `send-daily-reminders`: its schedule, whether it's active, and its command.
   - Show the last 5 rows from `cron.job_run_details` for that job (status, start/end time, return message).
   - If the job is missing or switched off, report that and suggest a fix. Nothing gets changed without your OK.
