export const formatStayId = (stayId?: string | null, tableNumber?: string | null) => {
  if (!stayId) return 'unknown';
  
  // Debug logging to see what stay IDs we're getting
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('formatStayId called with:', { stayId, tableNumber });
  }
  
  const isWalkIn = stayId.toLowerCase().includes('walkin');
  if (isWalkIn) {
    // Extract the table number from the stay ID if not provided separately
    if (!tableNumber) {
      // Extract number from stay ID like "walkin_5" or "walkin5" or "Walkin_21" or "walkin 5"
      const match = stayId.match(/walkin[_\s]?(\d+)/i);
      if (match && match[1]) {
        const result = `Walkin ${match[1]}`;
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('Formatted walkin:', stayId, '->', result);
        }
        return result;
      }
    }
    return tableNumber ? `Walkin ${tableNumber}` : 'Walkin';
  }
  // For hotel guests, replace underscores with spaces for better readability
  return stayId.replace(/_/g, ' ');
};
