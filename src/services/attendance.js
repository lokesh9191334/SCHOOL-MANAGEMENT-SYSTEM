export const fetchAttendanceRecords = async () => {
  return []
}

export const saveAttendanceRecord = async (record) => {
  return { ...record, id: Date.now().toString() }
}
