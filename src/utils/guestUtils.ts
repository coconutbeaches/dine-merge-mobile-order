export const formatStayId = (stayId?: string | null, tableNumber?: string | null) => {
  if (!stayId) return 'unknown';
  
  const isWalkIn = stayId.toLowerCase().includes('walkin');
  if (isWalkIn) {
    // Use table number if provided, otherwise extract from stay ID
    if (tableNumber) {
      return `Walkin ${tableNumber}`;
    }
    
    // Extract number from stay ID like "walkin_5" or "walkin5" or "Walkin_21" or "walkin 5"
    const match = stayId.match(/walkin[_\s]?(\d+)/i);
    if (match && match[1]) {
      return `Walkin ${match[1]}`;
    }
    
    return 'Walkin';
  }
  
  // For hotel guests, replace underscores with spaces for better readability
  return stayId.replace(/_/g, ' ');
};
