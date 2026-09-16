-- Safe Web Push subscription cleanup for BLACKANDBREW ERP
-- Run previews first. Apply deletes only after reviewing output.
--
-- Supabase SQL editor: paste one section at a time.
-- CLI: npm run push:cleanup (dry-run) or npm run push:cleanup:apply

-- 1) Inventory (read-only)
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE endpoint LIKE '%fcm.googleapis.com%') AS android,
  count(*) FILTER (WHERE endpoint LIKE '%web.push.apple.com%') AS apple,
  max(updated_at) AS latest_update,
  min(updated_at) AS oldest_update
FROM public.push_subscriptions;

-- 2) List devices (read-only, newest first)
SELECT
  id,
  left(endpoint, 72) AS endpoint_prefix,
  client_session_id,
  left(coalesce(user_agent, ''), 80) AS user_agent,
  updated_at,
  CASE
    WHEN endpoint LIKE '%fcm.googleapis.com%' THEN 'android'
    WHEN endpoint LIKE '%web.push.apple.com%' THEN 'apple'
    ELSE 'other'
  END AS platform
FROM public.push_subscriptions
ORDER BY updated_at DESC;

-- 3) Stale rows (no server touch in 60+ days, read-only)
SELECT id, left(endpoint, 72) AS endpoint_prefix, updated_at
FROM public.push_subscriptions
WHERE updated_at < now() - interval '60 days'
ORDER BY updated_at ASC;

-- 4) DELETE stale only (safer default reset)
-- DELETE FROM public.push_subscriptions
-- WHERE updated_at < now() - interval '60 days';

-- 5) DELETE ALL subscriptions (full reset: every device must register again)
-- Uncomment only after backup or dry-run review:
-- DELETE FROM public.push_subscriptions;
