-- Add admin note to A5_Bianca's profile documenting the Mila merge for audit purposes

INSERT INTO admin_notes (customer_id, note_type, note_content, created_by, created_at)
SELECT 
    'A5_Bianca' as customer_id,
    'PROFILE_MERGE',
    'Profile merge completed: Consolidated walk-in order (walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd) to A5_Bianca family for guest member Mila. Order history has been unified under the family stay account. Previous walk-in order now properly attributed to family member.',
    'SYSTEM_ADMIN',
    NOW();

-- Verify the admin note was added
SELECT 
    customer_id,
    note_type,
    note_content,
    created_at
FROM admin_notes
WHERE customer_id = 'A5_Bianca'
AND note_type = 'PROFILE_MERGE'
ORDER BY created_at DESC
LIMIT 1;
