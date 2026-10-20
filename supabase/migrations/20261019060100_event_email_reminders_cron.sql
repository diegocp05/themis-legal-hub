-- Hourly: e-mail registrants of events starting in the next 24h (event-emails edge function).
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'event-email-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qmjpkketagcczxshrmpk.supabase.co/functions/v1/event-emails',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"type": "reminders"}'::jsonb
  );
  $$
);
