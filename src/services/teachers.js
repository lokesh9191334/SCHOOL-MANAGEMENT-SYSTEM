export const fetchTeachers = async () => {
  return []
}

export const saveTeacher = async (teacher) => {
  return { ...teacher, id: Date.now().toString() }
}
