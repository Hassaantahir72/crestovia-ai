-- v0.2.94: bounded, resumable task reminder enqueue batches.
-- Existing daily dedupe keys let subsequent cron runs advance to the next eligible tasks.
-- The RPC is service-role-only and executes with the caller's privileges.

CREATE OR REPLACE FUNCTION public.enqueue_due_task_reminders(
  p_now timestamptz,
  p_window_end timestamptz,
  p_day date,
  p_batch_size integer DEFAULT 500
)
RETURNS TABLE (
  scanned integer,
  overdue_scanned integer,
  due_soon_scanned integer,
  queued integer
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH candidates AS (
    SELECT
      t.id,
      t.organization_id,
      t.title,
      t.assigned_to,
      t.due_at,
      CASE WHEN t.due_at <= p_now THEN 'task_overdue' ELSE 'task_due_soon' END AS reminder_type
    FROM public.tasks AS t
    WHERE t.assigned_to IS NOT NULL
      AND t.due_at IS NOT NULL
      AND t.status NOT IN ('done', 'cancelled')
      AND t.due_at <= p_window_end
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications AS n
        WHERE n.dedupe_key =
          (CASE WHEN t.due_at <= p_now THEN 'task_overdue:' ELSE 'task_due_soon:' END)
          || t.id::text || ':' || p_day::text
      )
    ORDER BY t.due_at ASC, t.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_batch_size, 500), 1), 500)
  ),
  inserted AS (
    INSERT INTO public.notifications (
      organization_id,
      recipient_id,
      created_by,
      type,
      title,
      body,
      entity_type,
      entity_id,
      dedupe_key
    )
    SELECT
      c.organization_id,
      c.assigned_to,
      NULL,
      c.reminder_type,
      CASE WHEN c.reminder_type = 'task_overdue' THEN 'Task overdue' ELSE 'Task due within 24 hours' END,
      c.title,
      'task',
      c.id,
      c.reminder_type || ':' || c.id::text || ':' || p_day::text
    FROM candidates AS c
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING type
  )
  SELECT
    (SELECT count(*) FROM candidates)::integer,
    (SELECT count(*) FROM candidates WHERE reminder_type = 'task_overdue')::integer,
    (SELECT count(*) FROM candidates WHERE reminder_type = 'task_due_soon')::integer,
    (SELECT count(*) FROM inserted)::integer;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_due_task_reminders(timestamptz, timestamptz, date, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_due_task_reminders(timestamptz, timestamptz, date, integer)
  TO service_role;
