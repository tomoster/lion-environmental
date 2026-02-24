-- Enable Row Level Security on all tables
-- Policy: authenticated users get full access, unauthenticated get nothing
-- Service role key (used by admin client, cron jobs, telegram) bypasses RLS automatically

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'email_log', 'expenses', 'ideas', 'invoices', 'job_reports',
      'jobs', 'prospects', 'settings', 'suppression_list',
      'telegram_state', 'worker_availability', 'worker_payments', 'workers'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Authenticated users have full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
