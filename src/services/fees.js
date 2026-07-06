export const fetchFees = async () => {
  return []
}

export const saveFeePayment = async (payment) => {
  return { ...payment, id: Date.now().toString() }
}
