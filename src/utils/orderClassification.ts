type OrderClassificationInput = {
  stay_id?: string | null;
};

export type OrderCustomerChannel = 'hotel_guest' | 'outside';

export const isWalkInStayId = (stayId?: string | null) =>
  Boolean(stayId?.trim().toLowerCase().startsWith('walkin'));

export const getOrderCustomerChannel = ({
  stay_id,
}: OrderClassificationInput): OrderCustomerChannel => {
  const normalizedStayId = stay_id?.trim();

  if (normalizedStayId && !isWalkInStayId(normalizedStayId)) {
    return 'hotel_guest';
  }

  return 'outside';
};

export const isHotelGuestOrder = (order: OrderClassificationInput) =>
  getOrderCustomerChannel(order) === 'hotel_guest';

export const isOutsideOrder = (order: OrderClassificationInput) =>
  getOrderCustomerChannel(order) === 'outside';
