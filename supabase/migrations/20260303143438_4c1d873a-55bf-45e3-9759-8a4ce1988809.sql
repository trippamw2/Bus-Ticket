
-- Fix the permissive INSERT policy on operators - require auth for registration
DROP POLICY IF EXISTS "Anyone can insert operator (registration)" ON public.operators;

CREATE POLICY "Authenticated users can register as operator" ON public.operators 
FOR INSERT 
WITH CHECK (auth.uid() = id);
