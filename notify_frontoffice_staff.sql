-- Notify front-office staff about updated order counts due to profile merge
-- This creates a system notification for staff to be aware of the changes

INSERT INTO staff_notifications (
    notification_type,
    title,
    message,
    priority,
    department,
    created_at,
    expires_at
)
VALUES (
    'CUSTOMER_UPDATE',
    'Customer Profile Merge Completed - Double_Nathan',
    'IMPORTANT: Double_Nathan customer profile has been consolidated. Previous duplicate profiles have been merged into a single account (Phone: 555-0199). Order counts have been updated and consolidated. Please note this change when assisting this customer with order history inquiries.',
    'HIGH',
    'FRONT_OFFICE',
    NOW(),
    NOW() + INTERVAL '30 days'
);

-- Also create a quick reference summary for staff
INSERT INTO customer_alerts (
    customer_id,
    alert_type,
    alert_message,
    active_until,
    created_at
)
SELECT 
    c.id,
    'PROFILE_MERGED',
    'This customer profile was recently merged from duplicate accounts. Order history has been consolidated.',
    NOW() + INTERVAL '60 days',
    NOW()
FROM customers c
WHERE c.name = 'Double_Nathan' 
AND c.phone = '555-0199';

-- Show the current consolidated customer information for verification
SELECT 
    c.id,
    c.name,
    c.phone,
    c.order_count,
    'Profile merged - order history consolidated' as status
FROM customers c
WHERE c.name = 'Double_Nathan' 
AND c.phone = '555-0199';
