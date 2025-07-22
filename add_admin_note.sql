-- Add admin note to Double_Nathan's profile documenting the merge for audit purposes
-- This note summarizes the consolidation of duplicate profiles and order counts

INSERT INTO admin_notes (customer_id, note_type, note_content, created_by, created_at)
SELECT 
    c.id,
    'PROFILE_MERGE',
    'Profile merge completed: Consolidated duplicate Double_Nathan profiles. Combined order counts from multiple profiles into single account. Previous separate profiles had scattered order history - now unified under single customer record. Total orders preserved during merge process.',
    'SYSTEM_ADMIN',
    NOW()
FROM customers c
WHERE c.name = 'Double_Nathan' 
AND c.phone = '555-0199';

-- Verify the admin note was added
SELECT 
    c.name,
    c.phone,
    an.note_type,
    an.note_content,
    an.created_at
FROM customers c
JOIN admin_notes an ON c.id = an.customer_id
WHERE c.name = 'Double_Nathan' 
AND c.phone = '555-0199'
AND an.note_type = 'PROFILE_MERGE'
ORDER BY an.created_at DESC
LIMIT 1;
