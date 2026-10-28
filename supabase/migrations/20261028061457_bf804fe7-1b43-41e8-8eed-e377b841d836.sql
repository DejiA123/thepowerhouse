GRANT INSERT ON public.app_feedback TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_feedback TO authenticated;
GRANT ALL ON public.app_feedback TO service_role;
GRANT INSERT ON public.app_activity TO anon;
GRANT SELECT, INSERT ON public.app_activity TO authenticated;
GRANT ALL ON public.app_activity TO service_role;