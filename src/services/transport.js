export const fetchTransportRoutes = async () => {
  return []
}

export const saveTransportRoute = async (route) => {
  return { ...route, id: Date.now().toString() }
}
