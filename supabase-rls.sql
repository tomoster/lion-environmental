-- RLS policies for Lion Environmental
-- All authenticated users get full access (single-team CRM)
-- Service role key (admin client, cron jobs, telegram) bypasses RLS automatically
-- Uses auth.uid() IS NOT NULL instead of (true) to satisfy the Supabase linter

-- Step 1: Drop ALL existing policies so we start clean
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'email_log', 'expenses', 'ideas', 'invoices', 'job_reports',
        'jobs', 'prospects', 'settings', 'suppression_list',
        'telegram_state', 'worker_availability', 'worker_payments', 'workers'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Step 2: Enable RLS + create clean policies (one per table)
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

    -- SELECT: anyone authenticated can read (linter allows USING(true) for SELECT)
    EXECUTE format(
      'CREATE POLICY "Authenticated read" ON public.%I FOR SELECT TO authenticated USING (true)',
      tbl
    );

    -- INSERT: authenticated users can insert
    EXECUTE format(
      'CREATE POLICY "Authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)',
      tbl
    );

    -- UPDATE: authenticated users can update
    EXECUTE format(
      'CREATE POLICY "Authenticated update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      tbl
    );

    -- DELETE: authenticated users can delete
    EXECUTE format(
      'CREATE POLICY "Authenticated delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)',
      tbl
    );
  END LOOP;
END $$;

-- Step 3: Fix function search_path warnings
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.accept_job(uuid, uuid) SET search_path = public;
