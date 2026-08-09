export const fetchExamSessions = async () => {
  return []
}

export const saveExamSession = async (session) => {
  return { ...session, id: Date.now().toString() }
}
