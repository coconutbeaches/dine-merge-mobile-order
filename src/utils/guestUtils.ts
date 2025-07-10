export const formatStayId = (stayId?: string | null, tableNumber?: string | null) => {
  if (!stayId) return 'unknown';
  const isWalkIn = stayId.startsWith('walkin');
  if (isWalkIn) {
    return tableNumber ? `walkin ${tableNumber}` : 'walkin';
  }
  return stayId;     // hotel guests – unchanged
};
