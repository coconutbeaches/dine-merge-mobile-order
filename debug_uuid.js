const customerId = 'A4_Natascha';
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
console.log('customerId:', customerId);
console.log('isUUID:', isUUID);
console.log('Should use stay_id:', !isUUID);

// Test with a real UUID
const realUUID = '123e4567-e89b-12d3-a456-426614174000';
const isRealUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realUUID);
console.log('realUUID:', realUUID);
console.log('isRealUUID:', isRealUUID);
