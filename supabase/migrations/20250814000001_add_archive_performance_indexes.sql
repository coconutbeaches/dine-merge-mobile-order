-- Add indexes to optimize archive operations performance
-- These indexes will speed up bulk archive operations significantly

-- Index for profiles archived column (for auth users)
CREATE INDEX IF NOT EXISTS idx_profiles_archived_id ON public.profiles(archived, id) WHERE archived IS NOT NULL;

-- Index for guest_family_archives stay_id (for guest families) 
CREATE INDEX IF NOT EXISTS idx_guest_family_archives_stay_id ON public.guest_family_archives(stay_id);

-- Composite index for bulk operations on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_id_archived ON public.profiles(id, archived);

-- Comment for documentation
COMMENT ON INDEX idx_profiles_archived_id IS 'Optimizes archive filtering and bulk archive operations for authenticated users';
COMMENT ON INDEX idx_guest_family_archives_stay_id IS 'Optimizes guest family archive lookups and bulk operations';
COMMENT ON INDEX idx_profiles_id_archived IS 'Optimizes bulk profile archive operations by ID';
