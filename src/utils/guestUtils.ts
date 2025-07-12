export const formatStayId = (stayId?: string | null, tableNumber?: string | null) => {
  if (!stayId) return 'unknown';
  const isWalkIn = stayId.startsWith('walkin') || stayId.startsWith('Walkin');
  if (isWalkIn) {
    // Extract the table number from the stay ID if not provided separately
    if (!tableNumber) {
      // Extract number from stay ID like "walkin_5" or "walkin5" or "Walkin_21"
      const match = stayId.match(/walkin[_]?(\d+)/i);
      if (match && match[1]) {
        return `Walkin ${match[1]}`;
      }
    }
    return tableNumber ? `Walkin ${tableNumber}` : 'Walkin';
  }
  // For hotel guests, replace underscores with spaces for better readability
  return stayId.replace(/_/g, ' ');
};
