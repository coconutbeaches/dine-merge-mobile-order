const formatThaiCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0, // Ensure no decimals for whole numbers
    maximumFractionDigits: 2, // Allow up to 2 decimal places
  }).format(amount);
};

export { formatThaiCurrency };
