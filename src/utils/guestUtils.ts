export const formatStayId = (stayId?: string | null, tableNumber?: string | null, guestFirstName?: string | null) => {
  if (!stayId) return 'unknown';
  
  const isWalkIn = stayId.toLowerCase().includes('walkin');
  if (isWalkIn) {
    let baseLabel = 'Walkin';
    
    // Use table number if provided, otherwise extract from stay ID
    if (tableNumber) {
      baseLabel = `Walkin ${tableNumber}`;
    } else {
      // Extract number from stay ID like "walkin_5" or "walkin5" or "Walkin_21" or "walkin 5"
      const match = stayId.match(/walkin[_\s]?(\d+)/i);
      if (match && match[1]) {
        baseLabel = `Walkin ${match[1]}`;
      }
    }
    
    // Add first name if available
    if (guestFirstName) {
      return `${baseLabel} (${guestFirstName})`;
    }
    
    return baseLabel;
  }
  
  // For hotel guests, replace underscores with spaces for better readability
  return stayId.replace(/_/g, ' ');
};
