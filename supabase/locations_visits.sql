-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for quick lookups on locations
CREATE INDEX IF NOT EXISTS locations_user_id_created_at_idx
    ON public.locations(user_id, created_at DESC);

-- Enable RLS on locations table
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Enable RLS policies for locations table
DROP POLICY IF EXISTS "Users can read own locations" ON public.locations;
CREATE POLICY "Users can read own locations"
    ON public.locations FOR SELECT
    USING (auth.uid()::text = user_id OR user_id = 'anon');

DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
CREATE POLICY "Users can insert own locations"
    ON public.locations FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id = 'anon');

DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;
CREATE POLICY "Users can delete own locations"
    ON public.locations FOR DELETE
    USING (auth.uid()::text = user_id OR user_id = 'anon');


-- Create visits table
CREATE TABLE IF NOT EXISTS public.visits (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    entered_at TIMESTAMPTZ NOT NULL,
    exited_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for quick lookups on visits
CREATE INDEX IF NOT EXISTS visits_user_id_entered_at_idx
    ON public.visits(user_id, entered_at DESC);

-- Enable RLS on visits table
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Enable RLS policies for visits table
DROP POLICY IF EXISTS "Users can read own visits" ON public.visits;
CREATE POLICY "Users can read own visits"
    ON public.visits FOR SELECT
    USING (auth.uid()::text = user_id OR user_id = 'anon');

DROP POLICY IF EXISTS "Users can insert own visits" ON public.visits;
CREATE POLICY "Users can insert own visits"
    ON public.visits FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id = 'anon');

DROP POLICY IF EXISTS "Users can delete own visits" ON public.visits;
CREATE POLICY "Users can delete own visits"
    ON public.visits FOR DELETE
    USING (auth.uid()::text = user_id OR user_id = 'anon');
