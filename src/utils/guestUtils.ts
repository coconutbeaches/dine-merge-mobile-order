export const formatStayId = (stayId?: string | null, tableNumber?: string | null) => {
  if (!stayId) return 'unknown';
  const isWalkIn = stayId.startsWith('walkin') || stayId.startsWith('Walkin');
  if (isWalkIn) {
    return tableNumber ? `Walkin ${tableNumber}` : 'Walkin';
  }
  return stayId;     // hotel guests – unchanged
};
