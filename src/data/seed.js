const generateId = (prefix, num) => `${prefix}-${String(num).padStart(4, '0')}`

const classNames = ['Nursery', 'LKG', 'UKG', '1st Class', '2nd Class', '3rd Class', '4th Class', '5th Class', '6th Class', '7th Class', '8th Class', '9th Class', '10th Class', '11th Class', '12th Class']
const sections = ['A', 'B', 'C', 'D']
const classNum = (cn) => {
  if (cn === 'Nursery') return 0
  if (cn === 'LKG') return 1
  if (cn === 'UKG') return 2
  return parseInt(cn)
}

export const SEED_CLASSES = [
  { id: 'CLS-001', name: 'Nursery', numericValue: 0, capacity: 25, feeMultiplier: 0.7, description: 'Pre-primary foundation class for early learners' },
  { id: 'CLS-002', name: 'LKG', numericValue: 1, capacity: 25, feeMultiplier: 0.75, description: 'Lower Kindergarten with play-based curriculum' },
  { id: 'CLS-003', name: 'UKG', numericValue: 2, capacity: 25, feeMultiplier: 0.8, description: 'Upper Kindergarten preparing for primary school' },
  { id: 'CLS-004', name: '1st Class', numericValue: 3, capacity: 30, feeMultiplier: 0.85, description: 'Primary Class 1 - Introduction to formal academics' },
  { id: 'CLS-005', name: '2nd Class', numericValue: 4, capacity: 30, feeMultiplier: 0.9, description: 'Primary Class 2 - Building foundational skills' },
  { id: 'CLS-006', name: '3rd Class', numericValue: 5, capacity: 30, feeMultiplier: 0.95, description: 'Primary Class 3 - Expanding knowledge horizons' },
  { id: 'CLS-007', name: '4th Class', numericValue: 6, capacity: 30, feeMultiplier: 1.0, description: 'Primary Class 4 - Core subjects deep dive' },
  { id: 'CLS-008', name: '5th Class', numericValue: 7, capacity: 30, feeMultiplier: 1.05, description: 'Primary Class 5 - Preparing for middle school' },
  { id: 'CLS-009', name: '6th Class', numericValue: 8, capacity: 35, feeMultiplier: 1.1, description: 'Middle School Class 6 - Transition to specialized subjects' },
  { id: 'CLS-010', name: '7th Class', numericValue: 9, capacity: 35, feeMultiplier: 1.15, description: 'Middle School Class 7 - Advanced concept building' },
  { id: 'CLS-011', name: '8th Class', numericValue: 10, capacity: 35, feeMultiplier: 1.2, description: 'Middle School Class 8 - Critical thinking development' },
  { id: 'CLS-012', name: '9th Class', numericValue: 11, capacity: 40, feeMultiplier: 1.3, description: 'Secondary Class 9 - Foundation for board exams' },
  { id: 'CLS-013', name: '10th Class', numericValue: 12, capacity: 40, feeMultiplier: 1.5, description: 'Secondary Class 10 - Board examination year' },
  { id: 'CLS-014', name: '11th Class', numericValue: 13, capacity: 35, feeMultiplier: 1.6, description: 'Senior Secondary Class 11 - Specialized stream' },
  { id: 'CLS-015', name: '12th Class', numericValue: 14, capacity: 35, feeMultiplier: 1.7, description: 'Senior Secondary Class 12 - Final board year' },
]

const classMap = {}
SEED_CLASSES.forEach(c => { classMap[c.name] = c })

export const SEED_SECTIONS = []
let secIdx = 1
SEED_CLASSES.forEach(cls => {
  sections.forEach(sec => {
    SEED_SECTIONS.push({
      id: `SEC-${String(secIdx).padStart(4, '0')}`,
      classId: cls.id,
      className: cls.name,
      name: sec,
      capacity: cls.capacity,
      roomNumber: `Room-${100 + secIdx}`,
    })
    secIdx++
  })
})

const sectionMap = {}
SEED_SECTIONS.forEach(s => {
  const key = `${s.className}-${s.name}`
  sectionMap[key] = s
})

export const SEED_SUBJECTS = [
  { id: 'SUB-001', code: 'ENG', name: 'English', type: 'Language', description: 'English Language and Literature - Reading, Writing, Grammar', isCore: true },
  { id: 'SUB-002', code: 'HIN', name: 'Hindi', type: 'Language', description: 'Hindi Language and Literature', isCore: true },
  { id: 'SUB-003', code: 'MAT', name: 'Mathematics', type: 'Core', description: 'Arithmetic, Algebra, Geometry, Trigonometry, Calculus', isCore: true },
  { id: 'SUB-004', code: 'SCI', name: 'Science', type: 'Core', description: 'General Science - Integrated Physics, Chemistry, Biology', isCore: true },
  { id: 'SUB-005', code: 'SOC', name: 'Social Studies', type: 'Core', description: 'History, Geography, Civics, Economics combined', isCore: true },
  { id: 'SUB-006', code: 'PHY', name: 'Physics', type: 'Science', description: 'Mechanics, Thermodynamics, Optics, Electromagnetism', isCore: false },
  { id: 'SUB-007', code: 'CHE', name: 'Chemistry', type: 'Science', description: 'Organic, Inorganic, Physical Chemistry', isCore: false },
  { id: 'SUB-008', code: 'BIO', name: 'Biology', type: 'Science', description: 'Botany, Zoology, Human Physiology, Genetics', isCore: false },
  { id: 'SUB-009', code: 'HIS', name: 'History', type: 'Social', description: 'World History, Indian History, Ancient and Modern', isCore: false },
  { id: 'SUB-010', code: 'GEO', name: 'Geography', type: 'Social', description: 'Physical Geography, Human Geography, Cartography', isCore: false },
  { id: 'SUB-011', code: 'CIV', name: 'Civics', type: 'Social', description: 'Political Science, Constitution, Governance', isCore: false },
  { id: 'SUB-012', code: 'ECO', name: 'Economics', type: 'Social', description: 'Microeconomics, Macroeconomics, Indian Economy', isCore: false },
  { id: 'SUB-013', code: 'CSC', name: 'Computer Science', type: 'Vocational', description: 'Programming, Algorithms, Data Structures, DBMS', isCore: false },
  { id: 'SUB-014', code: 'ART', name: 'Art & Drawing', type: 'Creative', description: 'Visual Arts, Sketching, Painting, Craft', isCore: false },
  { id: 'SUB-015', code: 'MUS', name: 'Music', type: 'Creative', description: 'Vocal Music, Instruments, Music Theory', isCore: false },
  { id: 'SUB-016', code: 'PHYED', name: 'Physical Education', type: 'Sports', description: 'Sports, Fitness, Yoga, Athletics', isCore: false },
  { id: 'SUB-017', code: 'SAN', name: 'Sanskrit', type: 'Language', description: 'Classical Sanskrit Language and Literature', isCore: false },
  { id: 'SUB-018', code: 'FREN', name: 'French', type: 'Language', description: 'French Language - Beginner to Intermediate', isCore: false },
  { id: 'SUB-019', code: 'ENV', name: 'Environmental Science', type: 'Science', description: 'Ecology, Conservation, Sustainability, Climate', isCore: false },
  { id: 'SUB-020', code: 'ACC', name: 'Accountancy', type: 'Commerce', description: 'Financial Accounting, Cost Accounting, Auditing', isCore: false },
  { id: 'SUB-021', code: 'BUS', name: 'Business Studies', type: 'Commerce', description: 'Business Organization, Management, Marketing', isCore: false },
  { id: 'SUB-022', code: 'PSY', name: 'Psychology', type: 'Humanities', description: 'General Psychology, Developmental, Social Psychology', isCore: false },
  { id: 'SUB-023', code: 'POL', name: 'Political Science', type: 'Humanities', description: 'Political Theory, International Relations, Comparative Politics', isCore: false },
]

const subjectMap = {}
SEED_SUBJECTS.forEach(s => { subjectMap[s.code] = s })

const firstNamesM = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan', 'Prithvi', 'Karthik', 'Dev', 'Manav', 'Ankit', 'Vikram', 'Karan', 'Ishaan', 'Rishabh', 'Harsh', 'Lakshya', 'Siddharth', 'Raghav', 'Arnav', 'Dhruv', 'Yash', 'Samar', 'Parth', 'Neil', 'Shivam']
const firstNamesF = ['Aanya', 'Diya', 'Ananya', 'Aadhya', 'Pari', 'Anika', 'Myra', 'Saanvi', 'Aarohi', 'Riya', 'Siya', 'Kavya', 'Tanvi', 'Priya', 'Meera', 'Riya', 'Ishita', 'Neha', 'Sonakshi', 'Aisha', 'Sara', 'Kiara', 'Zara', 'Mira', 'Nisha', 'Ridhi', 'Shreya', 'Tanya', 'Avni', 'Lavanya']
const lastNames = ['Sharma', 'Khan', 'Patel', 'Verma', 'Reddy', 'Ali', 'Gupta', 'Singh', 'Nair', 'Kapoor', 'Joshi', 'Rao', 'Menon', 'Malhotra', 'Desai', 'Saxena', 'Thakur', 'Fernandes', 'Iyer', 'Banerjee', 'Chauhan', 'Mishra', 'Pandey', 'Bose', 'Das', 'Sinha', 'Kaur', 'Mehta', 'Chopra', 'Khanna']
const cities = ['New Delhi', 'Mumbai', 'Ahmedabad', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Jaipur', 'Lucknow']
const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-']
const fatherOccupations = ['Engineer', 'Doctor', 'Lawyer', 'Businessman', 'Teacher', 'Architect', 'Chartered Accountant', 'Software Engineer', 'Bank Manager', 'Civil Servant', 'Consultant', 'Professor', 'Designer', 'Pharmacist', 'Dentist']
const motherOccupations = ['Teacher', 'Doctor', 'Engineer', 'Homemaker', 'Architect', 'Lawyer', 'Professor', 'Artist', 'Nurse', 'Banker', 'Designer', 'Writer', 'Accountant', 'Scientist', 'Consultant']
const religions = ['Hindu', 'Islam', 'Christianity', 'Sikhism', 'Buddhism', 'Jainism']
const castes = ['General', 'OBC', 'SC', 'ST', 'EWS']

const randomOf = (arr, seed) => arr[seed % arr.length]
const randomInt = (min, max, seed) => min + (seed % (max - min + 1))

const academicClasses = ['6th Class', '7th Class', '8th Class', '9th Class', '10th Class']

const makeStudent = (idx) => {
  const female = idx % 2 === 0
  const firstName = female ? firstNamesF[idx % firstNamesF.length] : firstNamesM[idx % firstNamesM.length]
  const lastName = lastNames[(idx * 3) % lastNames.length]
  const className = academicClasses[idx % academicClasses.length]
  const section = sections[(idx * 2) % sections.length]
  const clsObj = classMap[className]
  const secObj = sectionMap[`${className}-${section}`]
  const rollNo = ((idx % 30) + 1).toString().padStart(2, '0')
  const city = cities[(idx * 2) % cities.length]
  const bg = bloodGroups[idx % bloodGroups.length]
  const fatherOcc = fatherOccupations[(idx * 3) % fatherOccupations.length]
  const motherOcc = motherOccupations[(idx * 2) % motherOccupations.length]
  const religion = religions[idx % religions.length]
  const caste = castes[idx % castes.length]
  const yob = className === '10th Class' ? 2011 : className === '9th Class' ? 2012 : className === '8th Class' ? 2013 : className === '7th Class' ? 2014 : 2015
  const mob = (idx % 12) + 1
  const dob = `${yob}-${String(mob).padStart(2, '0')}-${String(((idx % 27) + 1)).padStart(2, '0')}`
  const admissionYear = 2020 + (idx % 5)
  const admissionNo = `ADM-${admissionYear}-${String(idx + 1001).padStart(5, '0')}`
  const midTermPct = 55 + (idx * 3) % 40
  const halfYearlyPct = 58 + (idx * 3) % 38
  const prevClassPct = 60 + (idx * 2) % 35
  const attendancePct = 82 + (idx * 2) % 17
  return {
    id: generateId('STU', 1001 + idx),
    admissionNo,
    title: `${firstName} ${lastName}`,
    subtitle: `${className}-${section}`,
    className,
    classId: clsObj.id,
    section,
    sectionId: secObj.id,
    rollNo,
    primary: `${lastNames[(idx * 5) % lastNames.length]} ${fatherOcc}`,
    status: idx % 20 === 0 ? 'On Leave' : idx % 30 === 0 ? 'Suspended' : 'Active',
    owner: `${firstName.toLowerCase()}.parent${idx}@example.com`,
    tone: idx % 20 === 0 ? 'warning' : idx % 30 === 0 ? 'danger' : 'success',
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    dateOfBirth: dob,
    age: 2026 - yob,
    gender: female ? 'Female' : 'Male',
    bloodGroup: bg,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@school.edu`,
    phone: `+91 98${String(10000000 + idx * 137).slice(0, 8)}`,
    religion,
    caste,
    nationality: 'Indian',
    motherTongue: idx % 3 === 0 ? 'English' : idx % 3 === 1 ? 'Hindi' : 'Regional',
    currentAddress: `${100 + idx * 7}, ${lastName} Nagar, Sector ${(idx % 20) + 1}, ${city} - ${110000 + idx * 31}`,
    permanentAddress: `${200 + idx * 5}, Green Avenue, Near ${lastName} Park, ${city} - ${110000 + idx * 31}`,
    fatherName: `${randomOf(firstNamesM, idx + 1)} ${lastName}`,
    fatherOccupation: fatherOcc,
    fatherPhone: `+91 98${String(20000000 + idx * 211).slice(0, 8)}`,
    fatherEmail: `father.${lastName.toLowerCase()}${idx}@example.com`,
    fatherAadhar: `XXXX-XXXX-${String(1000 + idx * 3).padStart(4, '0')}`,
    fatherAnnualIncome: `${(5 + (idx % 30)).toFixed(1)} LPA`,
    motherName: `${randomOf(firstNamesF, idx + 2)} ${lastName}`,
    motherOccupation: motherOcc,
    motherPhone: `+91 98${String(30000000 + idx * 173).slice(0, 8)}`,
    motherEmail: `mother.${lastName.toLowerCase()}${idx}@example.com`,
    motherAadhar: `XXXX-XXXX-${String(2000 + idx * 5).padStart(4, '0')}`,
    guardianName: idx % 10 === 0 ? `${randomOf(firstNamesM, idx + 3)} ${lastName}` : '',
    guardianRelation: idx % 10 === 0 ? 'Maternal Uncle' : '',
    guardianPhone: idx % 10 === 0 ? `+91 98${String(40000000 + idx * 199).slice(0, 8)}` : '',
    transportRequired: idx % 3 !== 0,
    transportRoute: idx % 3 !== 0 ? `Route-${((idx % 8) + 1)}` : '',
    hostelRequired: idx % 15 === 0,
    languages: idx % 4 === 0 ? 'Hindi, English, Sanskrit' : idx % 4 === 1 ? 'Hindi, English' : idx % 4 === 2 ? 'Hindi, English, French' : 'Hindi, English, Regional',
    coCurricular: idx % 3 === 0 ? 'Sports (Cricket), Music' : idx % 3 === 1 ? 'Dance, Art & Craft' : 'Quiz Club, Debate, Science Olympiad',
    medicalHistory: idx % 8 === 0 ? 'Mild Asthma' : idx % 8 === 1 ? 'Allergic to Penicillin' : 'None',
    studentPhotoUrl: '',
    admissionDate: `${admissionYear}-04-${String((idx % 25) + 1).padStart(2, '0')}`,
    admissionType: idx % 10 === 0 ? 'Transfer' : 'Regular',
    previousSchool: idx % 10 === 0 ? `${cities[(idx * 2) % cities.length]} Public School` : '',
    academicYear: '2025-2026',
    attendancePercentage: attendancePct,
    totalWorkingDays: 220,
    presentDays: Math.round(220 * attendancePct / 100),
    absentDays: 220 - Math.round(220 * attendancePct / 100),
    prevClassPercentage: prevClassPct,
    midTermPercentage: midTermPct,
    halfYearlyPercentage: halfYearlyPct,
    cgpa: (midTermPct / 9.5).toFixed(2),
    grade: midTermPct >= 90 ? 'A+' : midTermPct >= 80 ? 'A' : midTermPct >= 70 ? 'B+' : midTermPct >= 60 ? 'B' : midTermPct >= 50 ? 'C' : 'D',
    rank: (idx % 30) + 1,
    classStrength: 40,
    scholarship: idx % 5 === 0,
    scholarshipName: idx % 5 === 0 ? (idx % 10 === 0 ? 'Merit Scholarship' : 'EWS Scholarship') : '',
    feeConcession: idx % 5 === 0 ? (idx % 10 === 0 ? 50 : 25) : 0,
    ncc: idx % 6 === 0,
    scoutGuide: idx % 7 === 0,
    house: idx % 4 === 0 ? 'Red House' : idx % 4 === 1 ? 'Blue House' : idx % 4 === 2 ? 'Green House' : 'Yellow House',
    achievements: idx % 4 === 0 ? ['1st in Inter-School Math Olympiad 2025', 'District Level Chess Winner'] : idx % 4 === 1 ? ['Best Student Award 2024', '2nd in Science Exhibition'] : idx % 4 === 2 ? ['Winner - English Debate Competition'] : ['Participation Certificates in Sports'],
    skills: ['Problem Solving', 'Communication', idx % 2 === 0 ? 'Leadership' : 'Teamwork', 'Time Management'],
    extracurricularHours: randomInt(20, 80, idx),
    communityServiceHours: randomInt(10, 50, idx),
    studentAadhar: `XXXX-XXXX-${String(3000 + idx * 7).padStart(4, '0')}`,
    birthCertificateNumber: `BRN-${String(2025000 + idx).padStart(8, '0')}`,
    disabled: idx % 25 === 0,
    disabilityType: idx % 25 === 0 ? 'Locomotor (Minor)' : '',
    notes: idx % 10 === 0 ? 'Requires extra attention in Mathematics. Slow learner but very sincere.' : '',
  }
}

export const SEED_STUDENTS = Array.from({ length: 35 }, (_, i) => makeStudent(i))

const attendanceStatuses = ['Present', 'Present', 'Present', 'Present', 'Late', 'Absent', 'Leave Approved']
const todayIso = new Date().toISOString().slice(0, 10)

export const SEED_ATTENDANCE = SEED_STUDENTS.map((s, i) => ({
  id: `ATT-${s.id}`,
  title: s.title,
  className: s.className,
  section: s.section,
  rollNo: s.rollNo,
  gender: s.gender,
  status: attendanceStatuses[i % attendanceStatuses.length],
  owner: '08:15 AM',
  markedBy: 'Class Teacher',
  remarks: '',
  fatherName: s.fatherName,
  phone: s.phone,
  date: todayIso,
}))

const studentMap = {}
SEED_STUDENTS.forEach(s => { studentMap[s.id] = s })

const tFirstNames = ['Meera', 'James', 'Sara', 'Rajesh', 'Anjali', 'Arvind', 'Priya', 'Vikas', 'Suman', 'Kunal', 'Deepa', 'Amit', 'Shalini', 'Rahul', 'Neetu', 'Alok', 'Madhuri', 'Sandeep']
const tLastNames = ['Iyer', 'Okonkwo', 'Lindqvist', 'Kumar', 'Verma', 'Sharma', 'Natarajan', 'Singh', 'Pillai', 'Mehta', 'Rao', 'Choudhary', 'Mishra', 'Bhatia', 'Kohli', 'Dubey', 'Nair', 'Trivedi']
const tQualifications = ['Ph.D. in Mathematics', 'M.Sc. Physics, B.Ed.', 'MA English Literature, B.Ed.', 'M.Tech Computer Science', 'M.Sc. Chemistry, B.Ed.', 'MBBS, MD (Biology Teacher)', 'B.Com, M.Com, B.Ed.', 'MA History, M.Phil.', 'MA Geography, B.Ed.', 'M.Sc. Zoology, B.Ed.', 'MCA, B.Ed.', 'BA, B.Ed., Diploma in Art', 'M.P.Ed., Sports Diploma', 'MA Hindi, B.Ed.', 'MA Sanskrit, B.Ed.', 'MA Music, B.Ed.', 'MA Economics, B.Ed.', 'M.Sc. Environmental Science, B.Ed.']
const tExp = [18, 12, 8, 15, 20, 6, 10, 22, 5, 14, 9, 25, 7, 11, 17, 19, 13, 16]
const tSubjects = ['Mathematics', 'Physics', 'English', 'Computer Science', 'Chemistry', 'Biology', 'Accountancy', 'History', 'Geography', 'Science', 'Hindi', 'Art & Drawing', 'Physical Education', 'Sanskrit', 'Music', 'Social Studies', 'Economics', 'Environmental Science']

export const SEED_TEACHERS = tFirstNames.map((fn, i) => {
  const ln = tLastNames[i] || 'Sharma'
  const qual = tQualifications[i] || 'B.Ed.'
  const subj = tSubjects[i] || 'General'
  const exp = tExp[i] ?? 8
  const salary = (35000 + exp * 2500 + (i % 5) * 3000)
  const jY = 2026 - exp
  const jM = (i % 12) + 1
  const classes = academicClasses.filter((_, idx) => idx >= i % 3 && idx < (i % 3) + 3)
  const honorific = String(qual).startsWith('Ph.D') || String(qual).startsWith('MBBS') ? 'Dr. ' : ''
  return {
    id: `TCH-${String(501 + i).padStart(3, '0')}`,
    employeeId: `EMP-${String(2001 + i).padStart(5, '0')}`,
    title: `${honorific}${fn} ${ln}`,
    subtitle: subj,
    primary: `${fn.toLowerCase()}.${ln.toLowerCase()}@school.edu`,
    status: i % 10 === 0 ? 'On Leave' : i % 15 === 0 ? 'Resigned' : 'Active',
    owner: `+91 98${String(50000000 + i * 127).slice(0, 8)}`,
    tone: i % 10 === 0 ? 'warning' : i % 15 === 0 ? 'danger' : 'success',
    firstName: fn,
    lastName: ln,
    fullName: `${honorific}${fn} ${ln}`,
    dateOfBirth: `19${80 + (i % 15)}-${String(((i * 2) % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    gender: i % 2 === 0 ? 'Female' : 'Male',
    bloodGroup: bloodGroups[i % bloodGroups.length],
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@school.edu`,
    alternateEmail: `${fn.toLowerCase()}${ln.toLowerCase()}${i}@gmail.com`,
    phone: `+91 98${String(50000000 + i * 127).slice(0, 8)}`,
    alternatePhone: `+91 97${String(60000000 + i * 233).slice(0, 8)}`,
    currentAddress: `${300 + i * 11}, Faculty Quarters #${i + 1}, ${cities[i % cities.length]} - ${110000 + i * 23}`,
    permanentAddress: `${400 + i * 9}, Hometown Street, Sector ${(i % 15) + 5}, ${cities[(i * 3) % cities.length]}`,
    subject: subj,
    subjectCode: SEED_SUBJECTS.find(s => s.name === subj)?.code || 'MAT',
    qualification: qual,
    experience: exp,
    experienceYears: exp,
    specialization: qual.split(',')[0].replace(/Ph\.D\. in |M\.Sc\. |MA |M\.Tech |MCA |M\.P\.Ed\. |B\.Com |M\.Com /g, ''),
    certifications: ['B.Ed (2012)', 'State Teacher Eligibility Test (Qualified)', 'Smart Classroom Training', i % 3 === 0 ? 'Google Certified Educator Level 2' : 'Google Certified Educator Level 1'],
    teachingPhilosophy: 'Every student is unique and learns differently. I believe in creating an inclusive classroom environment that nurtures curiosity and critical thinking.',
    salary,
    salaryLPA: `₹ ${(salary * 12 / 100000).toFixed(2)} LPA`,
    salaryGrade: exp >= 15 ? 'Senior Grade' : exp >= 8 ? 'Middle Grade' : 'Junior Grade',
    pfNumber: `PF-NCR-${String(100000 + i * 53)}`,
    esiNumber: `ESI-${String(200000 + i * 71)}`,
    panNumber: `ABCDE${String(1000 + i * 3).padStart(4, '0')}X`,
    aadharNumber: `XXXX-XXXX-${String(4000 + i * 11).padStart(4, '0')}`,
    joinDate: `${jY}-${String(jM).padStart(2, '0')}-${String(((i * 3) % 27) + 1).padStart(2, '0')}`,
    retirementDate: `${jY + 35}-${String(jM).padStart(2, '0')}-${String(((i * 3) % 27) + 1).padStart(2, '0')}`,
    assignedClasses: classes,
    sections: ['A', 'B'],
    totalStudents: classes.length * 2 * 35,
    teachingLoad: `${classes.length * 2} periods/day`,
    department: ['Physics', 'Chemistry', 'Biology', 'Science'].includes(subj) ? 'Science Department' : ['History', 'Geography', 'Civics', 'Economics', 'Social Studies'].includes(subj) ? 'Social Sciences' : ['English', 'Hindi', 'Sanskrit', 'French'].includes(subj) ? 'Languages' : ['Mathematics'] ? 'Mathematics' : 'Humanities & Vocational',
    designation: exp >= 15 ? 'Head of Department' : exp >= 8 ? 'Senior Teacher' : 'Teacher',
    isHOD: exp >= 15,
    isClassTeacher: i % 3 === 0,
    classTeacherOf: i % 3 === 0 ? `${classes[0]}-A` : '',
    extracurricular: i % 3 === 0 ? 'Science Club Incharge' : i % 3 === 1 ? 'Cricket Team Coach' : 'Debate Society Advisor',
    achievements: [
      `Best Teacher Award ${2020 + (i % 5)}`,
      `${i + 5} Students Scored 95%+ in Board Exams`,
      'Published Research Paper in Educational Journal 2023',
      'District Level Teacher Excellence Award 2024',
    ],
    training: [
      { name: 'National Initiative for School Heads and Teachers Holistic Advancement', year: 2023, status: 'Completed' },
      { name: 'Experiential Learning Pedagogy Workshop', year: 2024, status: 'Completed' },
      { name: 'AI in Education Certificate Program', year: 2025, status: 'In Progress' },
    ],
    maritalStatus: i % 4 === 0 ? 'Single' : 'Married',
    spouseName: i % 4 !== 0 ? `${tFirstNames[(i + 5) % tFirstNames.length]} ${tLastNames[(i + 3) % tLastNames.length]}` : '',
    children: i % 4 !== 0 ? (i % 2 === 0 ? 2 : 1) : 0,
    emergencyContactName: `${tLastNames[(i + 2) % tLastNames.length]} Family Member`,
    emergencyContactNumber: `+91 96${String(70000000 + i * 199).slice(0, 8)}`,
    bankName: i % 3 === 0 ? 'HDFC Bank' : i % 3 === 1 ? 'ICICI Bank' : 'State Bank of India',
    accountNumber: `XXXXXX${String(500000 + i * 17).slice(0, 6)}`,
    ifscCode: i % 3 === 0 ? 'HDFC0001234' : i % 3 === 1 ? 'ICIC0005678' : 'SBIN0009012',
    passportAvailable: i % 4 === 0,
    passportNumber: i % 4 === 0 ? `J${String(2000000 + i * 51).slice(0, 7)}` : '',
    languagesKnown: ['English', 'Hindi', i % 3 === 0 ? 'Tamil' : i % 3 === 1 ? 'Punjabi' : 'Gujarati'],
    hobbies: ['Reading', i % 2 === 0 ? 'Trekking' : 'Music', 'Cooking', 'Mentoring'],
    photoUrl: '',
    signatureUrl: '',
    resumeUrl: '',
    testimonials: [
      { from: 'Principal', date: '2025-03-15', text: 'An exceptional educator with dedication and innovative teaching methods.' },
    ],
    remarks: '',
  }
})

const teacherMap = {}
SEED_TEACHERS.forEach(t => { teacherMap[t.id] = t })

export const SEED_SUBJECT_ASSIGNMENTS = []
let saIdx = 1
SEED_CLASSES.forEach(cls => {
  const numericVal = cls.numericValue
  const subjectPool = numericVal <= 2
    ? ['ENG', 'HIN', 'MAT']
    : numericVal <= 7
      ? ['ENG', 'HIN', 'MAT', 'SCI', 'SOC', 'ART', 'MUS', 'PHYED', 'ENV']
      : numericVal <= 10
        ? ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'HIS', 'GEO', 'CIV', 'CSC', 'PHYED']
        : numericVal <= 12
          ? ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'HIS', 'GEO', 'CIV', 'ECO', 'CSC', 'PHYED']
          : ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'CSC', 'ACC', 'BUS', 'ECO', 'PSY', 'POL']
  sections.forEach(sec => {
    subjectPool.forEach((sc, sIdx) => {
      const subj = subjectMap[sc]
      const tIdx = (saIdx + sIdx + numericVal * 3) % SEED_TEACHERS.length
      const teacher = SEED_TEACHERS[tIdx]
      SEED_SUBJECT_ASSIGNMENTS.push({
        id: `SASN-${String(saIdx).padStart(5, '0')}`,
        academicYear: '2025-2026',
        classId: cls.id,
        className: cls.name,
        section: sec,
        subjectId: subj.id,
        subjectCode: subj.code,
        subjectName: subj.name,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        weeklyPeriods: subj.type === 'Language' || subj.type === 'Core' ? 6 : subj.type === 'Science' || subj.type === 'Social' ? 4 : 2,
        totalPeriods: subj.type === 'Language' || subj.type === 'Core' ? 180 : subj.type === 'Science' || subj.type === 'Social' ? 120 : 60,
        room: `Room-${100 + saIdx % 60}`,
        syllabusCompleted: 60 + (saIdx % 35),
        textbooks: [`${subj.name} - NCERT Textbook`, `${subj.name} - Reference Book ${numericVal}`],
      })
      saIdx++
    })
  })
})

export const SEED_CLASS_TEACHERS = []
let ctIdx = 1
SEED_CLASSES.slice(0, 12).forEach((cls, ci) => {
  sections.forEach((sec, si) => {
    const tIdx = (ctIdx + ci * 3) % SEED_TEACHERS.length
    const teacher = SEED_TEACHERS[tIdx]
    SEED_CLASS_TEACHERS.push({
      id: `CT-${String(ctIdx).padStart(5, '0')}`,
      academicYear: '2025-2026',
      classId: cls.id,
      className: cls.name,
      section: sec,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      teacherEmail: teacher.email,
      teacherPhone: teacher.phone,
      assignedDate: `2025-04-0${(ctIdx % 9) + 1}`,
      strength: cls.capacity,
      classRepresentative: `${firstNamesM[(ctIdx * 2) % firstNamesM.length]} ${lastNames[ctIdx % lastNames.length]}`,
      viceRepresentative: `${firstNamesF[(ctIdx * 3) % firstNamesF.length]} ${lastNames[(ctIdx + 5) % lastNames.length]}`,
      classPhone: `+91 11-2${String(1000000 + ctIdx * 17).slice(0, 7)}`,
      noticeBoardId: `NB-${cls.name}-${sec}`,
    })
    ctIdx++
  })
})

export const SEED_EXAMS = [
  {
    id: 'EXAM-001',
    name: 'Unit Test I',
    code: 'UT1',
    type: 'Unit Test',
    term: 'Term 1',
    academicYear: '2025-2026',
    startDate: '2026-05-05',
    endDate: '2026-05-10',
    totalMarks: 20,
    passMarks: 7,
    weightage: 10,
    classes: classNames.filter(c => !['Nursery', 'LKG', 'UKG'].includes(c)),
    status: 'Completed',
    resultsPublished: true,
    gradingScale: 'Marks Based',
    description: 'First Unit Test covering 25% syllabus for Formative Assessment',
    instructions: ['Bring pen, pencil, eraser, ruler', 'No electronic devices allowed', 'Reach 15 minutes before exam time'],
  },
  {
    id: 'EXAM-002',
    name: 'Quarterly Examination',
    code: 'Q1',
    type: 'Quarterly',
    term: 'Term 1',
    academicYear: '2025-2026',
    startDate: '2026-06-15',
    endDate: '2026-06-25',
    totalMarks: 80,
    passMarks: 28,
    weightage: 20,
    classes: classNames.filter(c => !['Nursery', 'LKG', 'UKG'].includes(c)),
    status: 'Completed',
    resultsPublished: true,
    gradingScale: 'CGPA (10 Point)',
    description: 'First Quarterly Examination covering 50% of academic syllabus',
    instructions: ['Hall ticket compulsory', 'Blue/Black pen only', 'Answer sheets provided by school'],
  },
  {
    id: 'EXAM-003',
    name: 'Half-Yearly Examination',
    code: 'HY',
    type: 'Half-Yearly',
    term: 'Term 1',
    academicYear: '2025-2026',
    startDate: '2026-09-15',
    endDate: '2026-09-30',
    totalMarks: 100,
    passMarks: 35,
    weightage: 30,
    classes: classNames.filter(c => !['Nursery', 'LKG', 'UKG'].includes(c)),
    status: 'Completed',
    resultsPublished: true,
    gradingScale: 'CGPA (10 Point)',
    description: 'Half-Yearly Exam covering first 75% of annual curriculum',
    instructions: ['Bring admit card', 'Follow dress code', 'No talking during exam'],
  },
  {
    id: 'EXAM-004',
    name: 'Mid-Term Test',
    code: 'MT',
    type: 'Mid-Term',
    term: 'Term 2',
    academicYear: '2025-2026',
    startDate: '2026-11-10',
    endDate: '2026-11-20',
    totalMarks: 50,
    passMarks: 18,
    weightage: 15,
    classes: classNames.filter(c => !['Nursery', 'LKG', 'UKG'].includes(c)),
    status: 'Scheduled',
    resultsPublished: false,
    gradingScale: 'Marks Based',
    description: 'Mid-Term Assessment for Term 2 progress tracking',
    instructions: ['Syllabus on notice board', 'Bring geometry box for Math exam'],
  },
  {
    id: 'EXAM-005',
    name: 'Pre-Board Examination',
    code: 'PB',
    type: 'Pre-Board',
    term: 'Term 2',
    academicYear: '2025-2026',
    startDate: '2027-01-15',
    endDate: '2027-01-30',
    totalMarks: 100,
    passMarks: 35,
    weightage: 0,
    classes: ['10th Class', '12th Class'],
    status: 'Scheduled',
    resultsPublished: false,
    gradingScale: 'CGPA (10 Point)',
    description: 'Board Pattern Practice Exam for Class X and XII Board Students',
    instructions: ['Board pattern answer sheets', 'Strict invigilation', 'Same timing as actual board exam'],
  },
  {
    id: 'EXAM-006',
    name: 'Annual Examination',
    code: 'ANNUAL',
    type: 'Annual',
    term: 'Final',
    academicYear: '2025-2026',
    startDate: '2027-02-20',
    endDate: '2027-03-20',
    totalMarks: 100,
    passMarks: 35,
    weightage: 50,
    classes: classNames.filter(c => !['Nursery', 'LKG', 'UKG', '10th Class', '12th Class'].includes(c)),
    status: 'Scheduled',
    resultsPublished: false,
    gradingScale: 'CGPA (10 Point)',
    description: 'Final Annual Examination - Promotion to Next Class Based',
    instructions: ['Full syllabus', 'Promotion criteria: Min 35% aggregate + each subject', 'Report card distribution post results'],
  },
]

export const SEED_EXAM_SCHEDULES = []
let esIdx = 1
SEED_EXAMS.slice(0, 3).forEach(exam => {
  exam.classes.forEach(cn => {
    const cls = classMap[cn]
    if (!cls) return
    const numericVal = cls.numericValue
    const subjectPool = numericVal <= 2
      ? ['ENG', 'HIN', 'MAT']
      : numericVal <= 7
        ? ['ENG', 'HIN', 'MAT', 'SCI', 'SOC']
        : numericVal <= 10
          ? ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'HIS', 'GEO']
          : ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'CSC']
    sections.forEach(sec => {
      const baseStart = new Date(exam.startDate)
      subjectPool.forEach((sc, sIdx) => {
        const subj = subjectMap[sc]
        if (!subj) return
        const examDate = new Date(baseStart)
        examDate.setDate(examDate.getDate() + sIdx * 2 + (numericVal % 3))
        SEED_EXAM_SCHEDULES.push({
          id: `EXSCH-${String(esIdx).padStart(5, '0')}`,
          examId: exam.id,
          examName: exam.name,
          examCode: exam.code,
          classId: cls.id,
          className: cn,
          section: sec,
          subjectId: subj.id,
          subjectCode: subj.code,
          subjectName: subj.name,
          date: examDate.toISOString().slice(0, 10),
          day: examDate.toLocaleDateString('en-US', { weekday: 'long' }),
          startTime: sIdx % 2 === 0 ? '09:00 AM' : '01:00 PM',
          endTime: sIdx % 2 === 0 ? '12:00 PM' : '04:00 PM',
          duration: '3 Hours',
          totalMarks: exam.totalMarks,
          hallNumber: `Hall-${1 + (esIdx % 6)}`,
          seatingRow: `${String.fromCharCode(65 + (esIdx % 10))}${(esIdx % 20) + 1}`,
          invigilator1: SEED_TEACHERS[(esIdx) % SEED_TEACHERS.length].fullName,
          invigilator2: SEED_TEACHERS[(esIdx + 3) % SEED_TEACHERS.length].fullName,
          syllabus: `Chapters ${(sIdx * 5) + 1}-${(sIdx * 5) + 8} of ${subj.name}`,
          status: exam.status,
        })
        esIdx++
      })
    })
  })
})

export const SEED_EXAM_MARKS = []
let emIdx = 1
SEED_STUDENTS.forEach((stu, sIdx) => {
  if (!sectionMap[`${stu.className}-${stu.section}`]) return
  const numericVal = classMap[stu.className]?.numericValue || 5
  const subjectPool = numericVal <= 2
    ? ['ENG', 'HIN', 'MAT']
    : numericVal <= 7
      ? ['ENG', 'HIN', 'MAT', 'SCI', 'SOC']
      : numericVal <= 10
        ? ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'HIS', 'GEO']
        : ['ENG', 'HIN', 'MAT', 'PHY', 'CHE', 'BIO', 'CSC']
  SEED_EXAMS.slice(0, 3).forEach(exam => {
    subjectPool.forEach((sc, subI) => {
      const subj = subjectMap[sc]
      if (!subj) return
      const marks = Math.max(
        Math.round(exam.totalMarks * 0.3),
        Math.round(exam.totalMarks * (0.35 + ((sIdx * 7 + subI * 13 + exam.id.length) % 55) / 100))
      )
      const percentage = (marks / exam.totalMarks) * 100
      SEED_EXAM_MARKS.push({
        id: `MARK-${String(emIdx).padStart(6, '0')}`,
        examId: exam.id,
        examName: exam.name,
        examCode: exam.code,
        academicYear: '2025-2026',
        studentId: stu.id,
        studentName: stu.fullName,
        admissionNo: stu.admissionNo,
        className: stu.className,
        section: stu.section,
        rollNo: stu.rollNo,
        subjectId: subj.id,
        subjectCode: subj.code,
        subjectName: subj.name,
        totalMarks: exam.totalMarks,
        marksObtained: marks,
        passMarks: exam.passMarks,
        percentage: percentage.toFixed(2),
        grade: percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 35 ? 'D' : 'F',
        gradePoint: percentage >= 90 ? 10 : percentage >= 80 ? 9 : percentage >= 70 ? 8 : percentage >= 60 ? 7 : percentage >= 50 ? 6 : percentage >= 35 ? 5 : 0,
        result: marks >= exam.passMarks ? 'Pass' : 'Fail',
        attemptedOn: exam.endDate,
        submittedBy: SEED_TEACHERS[(emIdx) % SEED_TEACHERS.length].fullName,
        evaluatedBy: SEED_TEACHERS[(emIdx + 5) % SEED_TEACHERS.length].fullName,
        evaluationDate: `${parseInt(exam.endDate.slice(0, 4))}-${exam.endDate.slice(5, 7)}-${String((parseInt(exam.endDate.slice(8)) + 7) % 28).padStart(2, '0')}`,
        remarks: percentage >= 90 ? 'Excellent Performance!' : percentage >= 75 ? 'Very Good Work' : percentage >= 60 ? 'Good, Keep Improving' : percentage >= exam.passMarks ? 'Passed, Needs Improvement' : 'Failed, Re-examination Required',
        revaluationApplied: emIdx % 23 === 0,
        revaluationStatus: emIdx % 23 === 0 ? (emIdx % 46 === 0 ? 'Completed' : 'Pending') : '',
        revisedMarks: emIdx % 46 === 0 ? marks + 2 : null,
      })
      emIdx++
    })
  })
})

export const SEED_FEE_STRUCTURES = []
let fsIdx = 1
SEED_CLASSES.forEach(cls => {
  const baseTution = 12000
  const tution = Math.round(baseTution * cls.feeMultiplier)
  SEED_FEE_STRUCTURES.push({
    id: `FEESTR-${String(fsIdx).padStart(5, '0')}`,
    academicYear: '2025-2026',
    classId: cls.id,
    className: cls.name,
    description: `Complete Fee Structure for ${cls.name} Academic Year 2025-2026`,
    currency: 'INR',
    totalAnnualFee: (tution * 12) + 18000 + 5000 + 3000 + 4000 + 2500,
    installmentPlan: 'Quarterly',
    numberOfInstallments: 4,
    perInstallmentAmount: Math.round(((tution * 12) + 18000 + 5000 + 3000 + 4000 + 2500) / 4),
    lateFeePerDay: 50,
    components: [
      { id: 'CMP-TUIT', name: 'Tuition Fee', amount: tution, frequency: 'Monthly', description: 'Monthly Tuition Fee for Academic Sessions' },
      { id: 'CMP-ADM', name: 'Admission Fee', amount: 5000, frequency: 'Annually', description: 'One-time Admission Processing & Registration Fee' },
      { id: 'CMP-EXAM', name: 'Examination Fee', amount: 1500, frequency: 'Termly', description: 'Exam Conduct, Paper Evaluation, Report Cards (2 Terms)' },
      { id: 'CMP-LAB', name: 'Laboratory Fee', amount: 2500, frequency: 'Annually', description: 'Science, Computer Labs Usage & Maintenance' },
      { id: 'CMP-LIB', name: 'Library Fee', amount: 1500, frequency: 'Annually', description: 'Library Access, Books Subscription, Reading Materials' },
      { id: 'CMP-SPORT', name: 'Sports & Activity Fee', amount: 2000, frequency: 'Annually', description: 'Sports Equipment, CCA, Events, Cultural Activities' },
      { id: 'CMP-MAINT', name: 'Maintenance Fee', amount: 2500, frequency: 'Annually', description: 'Infrastructure Maintenance, Campus Facilities' },
      { id: 'CMP-TRANS', name: 'Transport Fee', amount: 1200, frequency: 'Monthly', description: 'Optional - School Bus Transport Fee (if availed)', optional: true },
      { id: 'CMP-HOSTEL', name: 'Hostel Fee', amount: 8500, frequency: 'Monthly', description: 'Optional - Hostel Accommodation & Mess (if availed)', optional: true },
      { id: 'CMP-UNIFORM', name: 'Uniform Fee', amount: 3500, frequency: 'Annually', description: 'School Uniform - 3 Sets + Sports Wear', optional: false },
      { id: 'CMP-BOOKS', name: 'Books & Stationery', amount: 4000, frequency: 'Annually', description: 'NCERT Textbooks, Notebooks, Stationery Kit' },
      { id: 'CMP-INSUR', name: 'Student Insurance', amount: 500, frequency: 'Annually', description: 'Student Accident & Medical Insurance Cover' },
    ],
    discounts: [
      { category: 'Sibling Discount', percentage: 10, eligibility: '2nd child onwards in same family' },
      { category: 'EWS Scholarship', percentage: 100, eligibility: 'Economically Weaker Section - Valid Income Certificate' },
      { category: 'Merit Scholarship', percentage: 50, eligibility: 'Students scoring 95%+ in previous class' },
      { category: 'Staff Ward', percentage: 100, eligibility: 'Children of School Teaching/Non-Teaching Staff' },
    ],
    paymentDeadlines: [
      { installment: '1st Installment (Apr-Jun)', dueDate: '2026-04-25', amount: Math.round(((tution * 12) + 18000 + 5000 + 3000 + 4000 + 2500) / 4) },
      { installment: '2nd Installment (Jul-Sep)', dueDate: '2026-07-25', amount: Math.round(((tution * 12) + 18000 + 5000 + 3000 + 4000 + 2500) / 4) },
      { installment: '3rd Installment (Oct-Dec)', dueDate: '2026-10-25', amount: Math.round(((tution * 12) + 18000 + 5000 + 3000 + 4000 + 2500) / 4) },
      { installment: '4th Installment (Jan-Mar)', dueDate: '2027-01-25', amount: Math.round(((tution * 12) + 18000 + 5000 + 3000 + 4000 + 2500) / 4) },
    ],
    createdBy: 'Admin',
    approvedBy: 'Principal',
    approvalDate: '2025-03-20',
    status: 'Active',
  })
  fsIdx++
})

export const SEED_FEE_PAYMENTS = []
let payIdx = 1
SEED_STUDENTS.forEach((stu, sIdx) => {
  const cls = classMap[stu.className]
  if (!cls) return
  const feeStr = SEED_FEE_STRUCTURES.find(f => f.classId === cls.id)
  if (!feeStr) return
  const baseAmount = feeStr.perInstallmentAmount
  const concession = stu.feeConcession || 0
  const effectivePerInstallment = Math.round(baseAmount * (100 - concession) / 100)
  ;[1, 2, 3, 4].forEach((installNum, iIdx) => {
    const s = (sIdx + installNum * 3) % 10
    let status = 'Paid'
    let paid = effectivePerInstallment
    let due = 0
    if (s === 7) { status = 'Pending'; paid = 0; due = effectivePerInstallment }
    else if (s === 8) { status = 'Partial'; paid = Math.round(effectivePerInstallment * 0.6); due = effectivePerInstallment - paid }
    else if (s === 9) { status = 'Overdue'; paid = 0; due = effectivePerInstallment + 250 }
    const monthPad = (iIdx * 3 + 1)
    const dateSkew = (sIdx + installNum) % 20
    SEED_FEE_PAYMENTS.push({
      id: `PAY-${String(payIdx).padStart(5, '0')}`,
      receiptNumber: `RCPT-2026-${String(10000 + payIdx).padStart(6, '0')}`,
      academicYear: '2025-2026',
      studentId: stu.id,
      studentName: stu.fullName,
      admissionNo: stu.admissionNo,
      className: stu.className,
      section: stu.section,
      rollNo: stu.rollNo,
      classId: cls.id,
      feeStructureId: feeStr.id,
      installmentNumber: installNum,
      installmentName: feeStr.paymentDeadlines[iIdx]?.installment || `${installNum}th Installment`,
      dueDate: feeStr.paymentDeadlines[iIdx]?.dueDate || `2026-${String(monthPad).padStart(2, '0')}-25`,
      paymentDate: status === 'Pending' || status === 'Overdue' ? null : `2026-${String(monthPad).padStart(2, '0')}-${String(Math.min(dateSkew + 1, 28)).padStart(2, '0')}`,
      totalAmount: effectivePerInstallment,
      baseAmount: baseAmount,
      concessionApplied: concession,
      concessionAmount: baseAmount - effectivePerInstallment,
      scholarshipApplied: stu.scholarship,
      scholarshipName: stu.scholarshipName,
      amountPaid: paid,
      balanceDue: due,
      lateFeeApplied: status === 'Overdue' ? 250 : (s === 3 ? 100 : 0),
      totalPaidIncludingLateFee: status === 'Overdue' ? 0 : paid + (s === 3 ? 100 : 0),
      status,
      paymentMode: sIdx % 4 === 0 ? 'Online (UPI)' : sIdx % 4 === 1 ? 'Bank Transfer' : sIdx % 4 === 2 ? 'Cheque' : 'Cash',
      transactionId: status === 'Pending' || status === 'Overdue' ? '' : `TXN${String(9876543210 + payIdx * 101).padStart(12, '0')}`,
      bankName: status !== 'Pending' && sIdx % 4 === 2 ? (sIdx % 3 === 0 ? 'HDFC Bank' : 'SBI') : '',
      chequeNumber: status !== 'Pending' && sIdx % 4 === 2 ? `CHQ${String(100000 + payIdx * 13).padStart(6, '0')}` : '',
      chequeDate: status !== 'Pending' && sIdx % 4 === 2 ? `2026-${String(monthPad).padStart(2, '0')}-${String(Math.min(dateSkew + 1, 28)).padStart(2, '0')}` : '',
      chequeStatus: sIdx % 4 === 2 && status === 'Paid' ? 'Cleared' : (sIdx % 4 === 2 && s === 5 ? 'Bounced' : ''),
      bounceCharges: sIdx % 4 === 2 && s === 5 ? 250 : 0,
      feeComponents: feeStr.components.filter(c => !c.optional || (c.id === 'CMP-TRANS' && stu.transportRequired) || (c.id === 'CMP-HOSTEL' && stu.hostelRequired)).map(c => ({
        ...c,
        chargedAmount: c.frequency === 'Monthly' ? Math.round(c.amount * (100 - concession) / 100) * (c.optional ? (c.id === 'CMP-TRANS' ? 3 : c.id === 'CMP-HOSTEL' ? 3 : 0) : 1) : Math.round(c.amount * (100 - concession) / 100) / (installNum === 1 ? 1 : c.frequency === 'Termly' ? 2 : 4),
      })),
      receivedBy: SEED_TEACHERS[payIdx % SEED_TEACHERS.length].fullName,
      receiptGenerated: status !== 'Pending',
      receiptPrinted: payIdx % 3 === 0,
      emailedToParent: status !== 'Pending',
      smsSent: status !== 'Pending',
      remarks: status === 'Overdue' ? 'Immediate payment required' : s === 3 ? 'Payment received 2 days after due date' : '',
      financialYear: '2025-2026',
      paymentGateway: sIdx % 4 === 0 ? 'Razorpay' : sIdx % 4 === 1 ? 'HDFC NetBanking' : '',
      invoiceNo: `INV-2025-26/${String(50000 + payIdx).padStart(5, '0')}`,
    })
    payIdx++
  })
})

export const SEED_SCHOLARSHIPS = [
  { id: 'SCH-001', name: 'Merit Scholarship 2025', code: 'MERIT-2025', type: 'Merit Based', description: 'Scholarship for students scoring 95% and above in previous academic year', eligibility: '95%+ marks in previous class', discountPercentage: 50, discountAmount: null, maxBeneficiaries: 20, totalBudget: 500000, academicYear: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', applicationDeadline: '2025-04-30', documentsRequired: ['Previous Class Marksheet', 'Character Certificate', 'Income Certificate'], status: 'Active', beneficiaries: 18, awardedAmount: 425000, createdBy: 'Principal' },
  { id: 'SCH-002', name: 'EWS Tuition Fee Waiver', code: 'EWS-WAIVER', type: 'Need Based', description: 'Full tuition fee waiver for students from Economically Weaker Sections', eligibility: 'Family Income < ₹2,00,000 p.a., Valid EWS Certificate', discountPercentage: 100, discountAmount: null, maxBeneficiaries: 50, totalBudget: 1500000, academicYear: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', applicationDeadline: '2025-05-15', documentsRequired: ['Income Certificate', 'EWS Certificate', 'Aadhar Card', 'Ration Card'], status: 'Active', beneficiaries: 42, awardedAmount: 1350000, createdBy: 'Managing Committee' },
  { id: 'SCH-003', name: 'Sports Excellence Scholarship', code: 'SPORTS-EXC', type: 'Talent Based', description: 'Scholarship for students with outstanding performance in State/National Level Sports', eligibility: 'District Level & above Sports Participation/Certificate', discountPercentage: 30, discountAmount: null, maxBeneficiaries: 15, totalBudget: 300000, academicYear: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', applicationDeadline: '2025-05-30', documentsRequired: ['Sports Certificates', 'Achievement Records', 'Previous Class Marksheet (60%+)'], status: 'Active', beneficiaries: 12, awardedAmount: 260000, createdBy: 'Sports Dept' },
  { id: 'SCH-004', name: 'Single Girl Child Scholarship', code: 'SGC-2025', type: 'Social Welfare', description: 'Special scholarship for single girl child in family to promote girl education', eligibility: 'Single girl child in family, Family Income < ₹5,00,000 p.a.', discountPercentage: 25, discountAmount: null, maxBeneficiaries: 30, totalBudget: 450000, academicYear: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', applicationDeadline: '2025-05-10', documentsRequired: ['Affidavit for Single Girl Child', 'Birth Certificate', 'Income Certificate'], status: 'Active', beneficiaries: 25, awardedAmount: 385000, createdBy: 'Principal' },
  { id: 'SCH-005', name: 'Defence Personnel Ward Concession', code: 'DEF-WARD', type: 'Service Category', description: 'Concession for wards of Defence/Paramilitary Personnel (Serving/Retired/Martyr)', eligibility: 'Valid Defence ID Card / Service Certificate of Parent', discountPercentage: 20, discountAmount: null, maxBeneficiaries: 25, totalBudget: 500000, academicYear: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', applicationDeadline: 'Open', documentsRequired: ['Defence ID / Service Certificate', 'Dependent Proof', 'Previous Class Marksheet'], status: 'Active', beneficiaries: 18, awardedAmount: 380000, createdBy: 'Administration' },
  { id: 'SCH-006', name: 'Staff Ward Full Scholarship', code: 'STAFF-WARD', type: 'Employee Benefit', description: '100% Fee Concession for children of School Teaching and Non-Teaching Staff', eligibility: 'Parent must be permanent employee of school', discountPercentage: 100, discountAmount: null, maxBeneficiaries: 10, totalBudget: 800000, academicYear: '2025-2026', startDate: '2025-04-01', endDate: '2026-03-31', applicationDeadline: '2025-04-15', documentsRequired: ['Employee ID Proof', 'Birth Certificate', 'Parent-Employee Relation Proof'], status: 'Active', beneficiaries: 8, awardedAmount: 680000, createdBy: 'Principal' },
]

SEED_STUDENTS.filter(s => s.scholarship).forEach((stu, i) => {
  SEED_SCHOLARSHIPS[i % SEED_SCHOLARSHIPS.length].beneficiaries = (SEED_SCHOLARSHIPS[i % SEED_SCHOLARSHIPS.length].beneficiaries || 0) + 1
})

export const SEED_SCHOLARSHIP_APPLICATIONS = []
let ssaIdx = 1
SEED_STUDENTS.filter(s => s.scholarship).forEach((stu, i) => {
  const sch = SEED_SCHOLARSHIPS[i % SEED_SCHOLARSHIPS.length]
  SEED_SCHOLARSHIP_APPLICATIONS.push({
    id: `SCHAPP-${String(ssaIdx).padStart(5, '0')}`,
    applicationNumber: `SCH-APP-${2025}-${String(5000 + ssaIdx).padStart(5, '0')}`,
    scholarshipId: sch.id,
    scholarshipName: sch.name,
    scholarshipCode: sch.code,
    studentId: stu.id,
    studentName: stu.fullName,
    className: stu.className,
    section: stu.section,
    academicYear: '2025-2026',
    applicantName: stu.fatherName,
    applicantRelation: 'Father',
    applicantPhone: stu.fatherPhone,
    applicantEmail: stu.fatherEmail,
    familyIncome: `${(2 + (i % 10)).toFixed(1)} LPA`,
    previousYearPercentage: stu.prevClassPercentage,
    totalFamilyMembers: 4 + (i % 3),
    numberOfSiblingsStudying: i % 3,
    applicationDate: `2025-04-${String(5 + (i % 20)).padStart(2, '0')}`,
    documentsSubmitted: sch.documentsRequired,
    documentsVerified: true,
    verificationDate: `2025-05-${String(1 + (i % 15)).padStart(2, '0')}`,
    verifiedBy: SEED_TEACHERS[(i * 3) % SEED_TEACHERS.length].fullName,
    status: i % 11 === 0 ? 'Pending' : i % 37 === 0 ? 'Rejected' : 'Approved',
    approvalDate: i % 11 !== 0 && i % 37 !== 0 ? `2025-05-${String(10 + (i % 15)).padStart(2, '0')}` : null,
    approvedBy: i % 11 !== 0 && i % 37 !== 0 ? 'Principal' : null,
    discountPercentage: sch.discountPercentage,
    effectiveAnnualSavings: Math.round(sch.discountPercentage * (150000 + i * 2000) / 100),
    rejectionReason: i % 37 === 0 ? 'Family Income exceeds eligibility criteria' : '',
    reviewRemarks: i % 11 === 0 ? 'Awaiting final committee review' : 'Excellent application, all criteria met',
    installmentApplied: 'All 4 Installments',
  })
  ssaIdx++
})

export const SEED_EXPENSES = [
  { id: 'EXP-001', voucherNo: 'VCH-2026-0001', date: '2026-04-05', category: 'Salaries & Wages', subCategory: 'Teaching Staff Salaries', description: 'Monthly Salary Payment - Teaching Staff for March 2026', amount: 875000, paymentMode: 'Bank Transfer', bankAccount: 'School Current Account - HDFC', transactionRef: 'NEFT-SAL-APR-2026-001', paidTo: 'All Teaching Staff', paidToContact: 'HR Department', invoiceNo: 'INV-SAL-042026', approvedBy: 'Principal', preparedBy: 'Accounts Dept', status: 'Paid', taxRate: 0, taxAmount: 0, totalAmount: 875000, financialYear: '2025-2026', quarter: 'Q1', budget: 900000, budgetVariance: -25000, remarks: 'Salary disbursed before 5th of month as per policy', paymentReceiptAttached: true, tdsDeducted: true, tdsAmount: 87500, netPaid: 787500 },
  { id: 'EXP-002', voucherNo: 'VCH-2026-0002', date: '2026-04-07', category: 'Salaries & Wages', subCategory: 'Non-Teaching Staff Salaries', description: 'Monthly Salary Payment - Non-Teaching, Admin & Support Staff', amount: 320000, paymentMode: 'Bank Transfer', bankAccount: 'School Current Account - SBI', transactionRef: 'NEFT-NSAL-042026', paidTo: 'Admin, Support, Maintenance Staff', paidToContact: 'Admin Office', invoiceNo: 'INV-NSAL-042026', approvedBy: 'Principal', preparedBy: 'Accounts Dept', status: 'Paid', taxRate: 0, taxAmount: 0, totalAmount: 320000, financialYear: '2025-2026', quarter: 'Q1', budget: 350000, budgetVariance: -30000, remarks: '', paymentReceiptAttached: true, tdsDeducted: true, tdsAmount: 22400, netPaid: 297600 },
  { id: 'EXP-003', voucherNo: 'VCH-2026-0003', date: '2026-04-10', category: 'Utilities', subCategory: 'Electricity Bill', description: 'Electricity Bill - Main Campus & Administrative Block (March 2026)', amount: 85400, paymentMode: 'Online - Net Banking', bankAccount: 'School Current Account - HDFC', transactionRef: 'BBPS-ELEC-202604-4521', paidTo: 'BSES Rajdhani Power Ltd.', paidToContact: 'Customer Care - 19123', invoiceNo: 'ELEC/CRN/2026/457812', approvedBy: 'Admin Officer', preparedBy: 'Accounts Dept', status: 'Paid', taxRate: 18, taxAmount: 13023, totalAmount: 98423, financialYear: '2025-2026', quarter: 'Q1', budget: 90000, budgetVariance: -4600, remarks: '10% lower than previous month due to Spring break', paymentReceiptAttached: true, tdsDeducted: false, tdsAmount: 0, netPaid: 98423 },
  { id: 'EXP-004', voucherNo: 'VCH-2026-0004', date: '2026-04-12', category: 'Utilities', subCategory: 'Water Bill', description: 'Water Supply Charges - Campus & Hostel (March 2026)', amount: 32500, paymentMode: 'Online - UPI', bankAccount: 'Petty Cash - UPI', transactionRef: 'UPI-WTR-20260412-8899', paidTo: 'Delhi Jal Board', paidToContact: '', invoiceNo: 'DJB/2026/WB/334512', approvedBy: 'Admin Officer', preparedBy: 'Admin Dept', status: 'Paid', taxRate: 0, taxAmount: 0, totalAmount: 32500, financialYear: '2025-2026', quarter: 'Q1', budget: 35000, budgetVariance: -2500, remarks: '', paymentReceiptAttached: true },
  { id: 'EXP-005', voucherNo: 'VCH-2026-0005', date: '2026-04-15', category: 'Infrastructure & Maintenance', subCategory: 'Building Repairs & Maintenance', description: 'Classroom Wing-A Renovation & Whitewashing Work', amount: 245000, paymentMode: 'Cheque', bankAccount: 'School Building Fund Account', transactionRef: 'CHQ-998877', paidTo: 'BuildRight Contractors Pvt. Ltd.', paidToContact: '+91 9811112233', invoiceNo: 'BRC/2026/INV-0421', approvedBy: 'Principal', preparedBy: 'Engineering Dept', status: 'Paid', taxRate: 18, taxAmount: 44100, totalAmount: 289100, financialYear: '2025-2026', quarter: 'Q1', budget: 300000, budgetVariance: -10900, remarks: 'Summer vacation renovation project - Phase 1', paymentReceiptAttached: true, tdsDeducted: true, tdsAmount: 5782 },
  { id: 'EXP-006', voucherNo: 'VCH-2026-0006', date: '2026-04-18', category: 'Academic Resources', subCategory: 'Books & Stationery Purchase', description: 'New Library Books & Stationery Kits for New Academic Session', amount: 175000, paymentMode: 'Bank Transfer', bankAccount: 'Academic Fund Account', transactionRef: 'RTGS-LIB-20260418', paidTo: 'Indian Book Depot & Stationers', paidToContact: '+91 9876543210', invoiceNo: 'IBD/2026/22334', approvedBy: 'Librarian + Principal', preparedBy: 'Library Dept', status: 'Paid', taxRate: 5, taxAmount: 8750, totalAmount: 183750, financialYear: '2025-2026', quarter: 'Q1', budget: 200000, budgetVariance: -16250, remarks: 'Includes 500 new library books across categories', paymentReceiptAttached: true },
  { id: 'EXP-007', voucherNo: 'VCH-2026-0007', date: '2026-04-20', category: 'IT & Technology', subCategory: 'Software License & Subscription', description: 'Annual Subscription - Learning Management System, Google Workspace, MS Office', amount: 96000, paymentMode: 'Online - Credit Card', bankAccount: 'School Credit Card - HDFC', transactionRef: 'GWFEE-LMS-2026-ANNUAL', paidTo: 'Google, Microsoft, EduLMS Platform', paidToContact: 'Support Edulms', invoiceNo: 'LMS/2026-27/SUB-0001', approvedBy: 'IT Coordinator', preparedBy: 'IT Dept', status: 'Paid', taxRate: 18, taxAmount: 17280, totalAmount: 113280, financialYear: '2025-2026', quarter: 'Q1', budget: 120000, budgetVariance: -6720, remarks: '10% loyalty discount applied for 3-year renewal', paymentReceiptAttached: true },
  { id: 'EXP-008', voucherNo: 'VCH-2026-0008', date: '2026-04-22', category: 'IT & Technology', subCategory: 'Computer Hardware Upgrade', description: 'Computer Lab Upgrade - 30 New PCs with Accessories', amount: 750000, paymentMode: 'Bank Transfer (EMI)', bankAccount: 'School Current Account - ICICI', transactionRef: 'EMI-HW-LAB2026', paidTo: 'TechServe Solutions Pvt. Ltd.', paidToContact: '+91 9988776655', invoiceNo: 'TSS/2026/HW-04115', approvedBy: 'Principal + IT Coordinator', preparedBy: 'IT Dept', status: 'Paid (1st EMI)', taxRate: 18, taxAmount: 135000, totalAmount: 885000, financialYear: '2025-2026', quarter: 'Q1', budget: 900000, budgetVariance: -15000, remarks: '12 EMI @ ₹73,750 per month. 0% interest scheme', paymentReceiptAttached: true },
  { id: 'EXP-009', voucherNo: 'VCH-2026-0009', date: '2026-04-25', category: 'Transportation', subCategory: 'Bus Maintenance & Fuel', description: 'School Bus Fleet - Monthly Fuel & Maintenance (April 2026)', amount: 215000, paymentMode: 'Bank Transfer + Petrol Pump Credit', bankAccount: 'Transport Operating Account', transactionRef: 'FLEET-FUEL-APR-26', paidTo: 'Indian Oil Corp + AutoCare Service Centre', paidToContact: '', invoiceNo: 'IOCL/FLEET/2026/04/556', approvedBy: 'Transport Incharge', preparedBy: 'Transport Dept', status: 'Paid', taxRate: 28, taxAmount: 60200, totalAmount: 275200, financialYear: '2025-2026', quarter: 'Q1', budget: 280000, budgetVariance: -4800, remarks: 'Includes 2 bus servicing, tyre replacement for 1 bus', paymentReceiptAttached: true },
  { id: 'EXP-010', voucherNo: 'VCH-2026-0010', date: '2026-04-28', category: 'Sports & Co-Curricular', subCategory: 'Sports Equipment Purchase', description: 'Cricket & Football Equipment for New Session - Team Kits, Balls, Nets', amount: 85000, paymentMode: 'Online', bankAccount: 'Sports Fund Account', transactionRef: 'SPORTS-GEAR-2026', paidTo: 'Decathlon Sports India Pvt. Ltd.', paidToContact: '', invoiceNo: 'DEC/2026/INV-88994455', approvedBy: 'Sports Coach', preparedBy: 'Sports Dept', status: 'Paid', taxRate: 18, taxAmount: 15300, totalAmount: 100300, financialYear: '2025-2026', quarter: 'Q1', budget: 120000, budgetVariance: -19700, remarks: 'Annual sports purchase. Additional team kits for all 8 houses', paymentReceiptAttached: true },
  { id: 'EXP-011', voucherNo: 'VCH-2026-0011', date: '2026-05-02', category: 'Safety & Security', subCategory: 'CCTV & Security Services', description: 'Monthly Security Services + CCTV Maintenance Contract', amount: 125000, paymentMode: 'Bank Transfer', bankAccount: 'Admin Operating Account', transactionRef: 'SEC-MONTHLY-05-26', paidTo: 'SecureGuard Security Agency Pvt. Ltd.', paidToContact: '+91 9977665544', invoiceNo: 'SGS/2026/INV-0503', approvedBy: 'Admin Officer', preparedBy: 'Security Dept', status: 'Paid', taxRate: 18, taxAmount: 22500, totalAmount: 147500, financialYear: '2025-2026', quarter: 'Q1', budget: 150000, budgetVariance: -2500, remarks: '12 Guards + Supervisor + CCTV AMC', paymentReceiptAttached: true, tdsDeducted: true, tdsAmount: 2950 },
  { id: 'EXP-012', voucherNo: 'VCH-2026-0012', date: '2026-05-05', category: 'Medical & Health', subCategory: 'Medical Supplies & Health Check-up', description: 'First Aid Kits Refill + Annual Student Health Check-up Camp', amount: 48000, paymentMode: 'Cheque', bankAccount: 'Welfare Fund', transactionRef: 'CHQ-887755', paidTo: 'City Hospital & Medicare Centre', paidToContact: '+91 9811123456', invoiceNo: 'CHMC/2026/05/INV2211', approvedBy: 'School Nurse + Principal', preparedBy: 'Medical Dept', status: 'Paid', taxRate: 5, taxAmount: 2400, totalAmount: 50400, financialYear: '2025-2026', quarter: 'Q1', budget: 60000, budgetVariance: -9600, remarks: 'Health checkup completed for 900 students. Report cards dispatched.', paymentReceiptAttached: true },
  { id: 'EXP-013', voucherNo: 'VCH-2026-0013', date: '2026-05-08', category: 'Events & Functions', subCategory: 'Annual Function / Cultural Event', description: 'Annual Day 2026 Celebration Expenses - Venue, Sound, Prizes, Decoration', amount: 320000, paymentMode: 'Multiple - Bank + Cash', bankAccount: 'Events & Cultural Fund', transactionRef: 'EVENT-ANNDY2026', paidTo: 'Multiple Vendors', paidToContact: 'Cultural Committee', invoiceNo: 'EVT/2026/ANN-05-08', approvedBy: 'Principal + Cultural Committee', preparedBy: 'Cultural Dept', status: 'Paid', taxRate: 18, taxAmount: 48760, totalAmount: 368760, financialYear: '2025-2026', quarter: 'Q1', budget: 400000, budgetVariance: -31240, remarks: 'Grand Annual Day at Campus Auditorium. 2000+ attendees. Successful event.', paymentReceiptAttached: true },
  { id: 'EXP-014', voucherNo: 'VCH-2026-0014', date: '2026-05-10', category: 'Insurance', subCategory: 'General Insurance Premium', description: 'Annual Premium - Building Fire Insurance, Public Liability, Student Accident', amount: 165000, paymentMode: 'Online', bankAccount: 'School Current Account', transactionRef: 'INS-PREMIUM-2026-27', paidTo: 'New India Assurance Co. Ltd.', paidToContact: '1800-209-1416', invoiceNo: 'NIA/2026/POL-8845211', approvedBy: 'Principal', preparedBy: 'Risk Mgmt Dept', status: 'Paid', taxRate: 18, taxAmount: 29700, totalAmount: 194700, financialYear: '2025-2026', quarter: 'Q1', budget: 200000, budgetVariance: -5300, remarks: 'Comprehensive Insurance Package for FY 2026-27. Sum Assured ₹25 Crores', paymentReceiptAttached: true },
  { id: 'EXP-015', voucherNo: 'VCH-2026-0015', date: '2026-05-15', category: 'Hostel & Boarding', subCategory: 'Hostel Mess Expenses', description: 'Hostel Mess - Provisions & Catering for April 2026', amount: 185000, paymentMode: 'Bank Transfer', bankAccount: 'Hostel Operating Account', transactionRef: 'HOSTEL-MESS-APR-26', paidTo: 'NutriServe Catering Services', paidToContact: '+91 9811554433', invoiceNo: 'NCS/2026/04/3322', approvedBy: 'Hostel Warden', preparedBy: 'Hostel Dept', status: 'Paid', taxRate: 5, taxAmount: 9250, totalAmount: 194250, financialYear: '2025-2026', quarter: 'Q1', budget: 200000, budgetVariance: -5750, remarks: '75 Hostel Students Served. Average 50 Rs/day per student.', paymentReceiptAttached: true },
  { id: 'EXP-016', voucherNo: 'VCH-2026-0016', date: '2026-05-18', category: 'Academic Resources', subCategory: 'Laboratory Supplies', description: 'Science Lab - Chemicals, Lab Equipment, Glassware Purchase for Session 2026-27', amount: 120000, paymentMode: 'Bank Transfer', bankAccount: 'Academic Fund - Science', transactionRef: 'LAB-SUPPLY-2026', paidTo: 'LabMaster Scientific Co.', paidToContact: '+91 9899988776', invoiceNo: 'LMSC/2026/INV-S052', approvedBy: 'Science HOD', preparedBy: 'Lab Assistants', status: 'Paid', taxRate: 18, taxAmount: 21600, totalAmount: 141600, financialYear: '2025-2026', quarter: 'Q1', budget: 150000, budgetVariance: -8400, remarks: 'Complete set of lab consumables for Physics, Chemistry & Biology Labs', paymentReceiptAttached: true },
  { id: 'EXP-017', voucherNo: 'VCH-2026-0017', date: '2026-05-20', category: 'Marketing & Promotion', subCategory: 'Admission Campaign & Branding', description: 'New Session 2026-27 Admission Campaign - Hoardings, Newspaper, Digital Ads', amount: 285000, paymentMode: 'Bank Transfer', bankAccount: 'Marketing Fund Account', transactionRef: 'ADM-MKT-2026-27', paidTo: 'PrimeMedia Advertising Agency', paidToContact: '+91 9911122334', invoiceNo: 'PMAA/2026/05/ADM-224', approvedBy: 'Principal + Marketing', preparedBy: 'Admissions Office', status: 'Paid', taxRate: 18, taxAmount: 51300, totalAmount: 336300, financialYear: '2025-2026', quarter: 'Q1', budget: 350000, budgetVariance: -13700, remarks: 'Pan-India Digital Campaign + Local Hoardings. 5000+ inquiries generated.', paymentReceiptAttached: true },
  { id: 'EXP-018', voucherNo: 'VCH-2026-0018', date: '2026-05-25', category: 'Training & Development', subCategory: 'Teacher Training Workshops', description: 'Summer Faculty Development Program - 5 Days Workshop for Teachers', amount: 140000, paymentMode: 'Bank Transfer', bankAccount: 'Staff Development Fund', transactionRef: 'FDP-TRAINING-2026', paidTo: 'EduExcellence Training Institute', paidToContact: '+91 9822233445', invoiceNo: 'EETI/2026/INV-556', approvedBy: 'Principal', preparedBy: 'Academic Director', status: 'Paid', taxRate: 18, taxAmount: 25200, totalAmount: 165200, financialYear: '2025-2026', quarter: 'Q1', budget: 180000, budgetVariance: -14800, remarks: 'Attended by 55 teachers. 30+ hours of hands-on NEP 2020 training sessions.', paymentReceiptAttached: true },
  { id: 'EXP-019', voucherNo: 'VCH-2026-0019', date: '2026-05-28', category: 'Petty Cash Expenses', subCategory: 'Office Supplies & Miscellaneous', description: 'Petty Cash Reimbursement - Printer Ink, Cleaning, Office Refreshments etc.', amount: 28500, paymentMode: 'Cash', bankAccount: 'Petty Cash Box', transactionRef: 'PC-05-2026-REIMB', paidTo: 'Admin Staff Reimbursements', paidToContact: '', invoiceNo: 'PC-202605-MISC', approvedBy: 'Admin Officer', preparedBy: 'Front Office', status: 'Paid', taxRate: 0, taxAmount: 0, totalAmount: 28500, financialYear: '2025-2026', quarter: 'Q1', budget: 35000, budgetVariance: -6500, remarks: 'Attached 47 petty vouchers for May 2026. All verified.', paymentReceiptAttached: true },
  { id: 'EXP-020', voucherNo: 'VCH-2026-0020', date: '2026-05-30', category: 'Legal & Professional', subCategory: 'Audit & Consultancy Fees', description: 'Statutory Audit Fees - FY 2025-26 Half Yearly + CA Consultancy', amount: 75000, paymentMode: 'Bank Transfer', bankAccount: 'Professional Fees Account', transactionRef: 'AUDIT-FY-H1-26', paidTo: 'Sharma & Associates Chartered Accountants', paidToContact: '+91 9811188776', invoiceNo: 'SACA/2026/H1-AUDIT-042', approvedBy: 'Principal', preparedBy: 'Finance Dept', status: 'Paid', taxRate: 18, taxAmount: 13500, totalAmount: 88500, financialYear: '2025-2026', quarter: 'Q1', budget: 90000, budgetVariance: -1500, remarks: 'Half-Yearly Audit Completed. Clean Report. No Qualifications.', paymentReceiptAttached: true, tdsDeducted: true, tdsAmount: 8850 },
]

export const SEED_TRANSPORT_ROUTES = [
  { id: 'ROUTE-001', routeNumber: 'Route 1', routeName: 'Sector 1 - 10 Dwarka', startPoint: 'Dwarka Sector 1 Metro', endPoint: 'School Main Gate', distance: '14.5 km', estimatedTime: '45 mins', waypoints: ['Sector 4', 'Sector 7', 'Sector 10 Market', 'Ventianna Apartments'], totalStops: 8, vehicleId: 'VH-001', driverId: 'DRV-001', alternateDriverId: 'DRV-002', morningDeparture: '07:00 AM', morningArrivalSchool: '07:45 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:15 PM', studentCount: 48, routeColor: '#e74c3c', status: 'Active', insuranceValidTill: '2027-03-15', permitValidTill: '2027-05-20', pollutionValidTill: '2026-11-10', description: 'Covers Dwarka Residential Sectors 1-10', createdBy: 'Transport Incharge' },
  { id: 'ROUTE-002', routeNumber: 'Route 2', routeName: 'Rohini Central', startPoint: 'Rohini Sector 3 Rithala Metro', endPoint: 'School Main Gate', distance: '18.2 km', estimatedTime: '55 mins', waypoints: ['Sector 7', 'Sector 11', 'Sector 15', 'Pitampura TV Tower'], totalStops: 10, vehicleId: 'VH-002', driverId: 'DRV-002', alternateDriverId: 'DRV-003', morningDeparture: '06:50 AM', morningArrivalSchool: '07:45 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:25 PM', studentCount: 52, routeColor: '#3498db', status: 'Active', insuranceValidTill: '2026-12-30', permitValidTill: '2027-04-10', pollutionValidTill: '2026-10-05', description: 'Covers Rohini Sectors 3,5,7,9,11,13,15,18 + Pitampura', createdBy: 'Transport Incharge' },
  { id: 'ROUTE-003', routeNumber: 'Route 3', routeName: 'Paschim Vihar - Punjabi Bagh', startPoint: 'Paschim Vihar West Metro', endPoint: 'School Main Gate', distance: '11.8 km', estimatedTime: '38 mins', waypoints: ['Paschim Vihar Extn', 'Meera Bagh', 'Punjabi Bagh Club', 'Shivaji Park'], totalStops: 7, vehicleId: 'VH-003', driverId: 'DRV-003', alternateDriverId: 'DRV-001', morningDeparture: '07:05 AM', morningArrivalSchool: '07:43 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:08 PM', studentCount: 44, routeColor: '#2ecc71', status: 'Active', insuranceValidTill: '2027-01-25', permitValidTill: '2027-03-08', pollutionValidTill: '2026-12-12', description: 'Paschim Vihar, Punjabi Bagh, Shivaji Park', createdBy: 'Transport Incharge' },
  { id: 'ROUTE-004', routeNumber: 'Route 4', routeName: 'Janakpuri & Vikaspuri', startPoint: 'Janakpuri West Metro', endPoint: 'School Main Gate', distance: '16.5 km', estimatedTime: '50 mins', waypoints: ['Janakpuri District Centre', 'Uttam Nagar', 'Vikaspuri', 'Kirti Nagar'], totalStops: 9, vehicleId: 'VH-004', driverId: 'DRV-004', alternateDriverId: 'DRV-005', morningDeparture: '06:55 AM', morningArrivalSchool: '07:45 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:20 PM', studentCount: 50, routeColor: '#f39c12', status: 'Active', insuranceValidTill: '2026-11-18', permitValidTill: '2027-06-15', pollutionValidTill: '2026-09-28', description: 'Janakpuri, Uttam Nagar, Vikaspuri, Kirti Nagar', createdBy: 'Transport Incharge' },
  { id: 'ROUTE-005', routeNumber: 'Route 5', routeName: 'Rajouri Garden - Mayapuri', startPoint: 'Rajouri Garden Metro', endPoint: 'School Main Gate', distance: '9.5 km', estimatedTime: '30 mins', waypoints: ['Tagore Garden', 'Subhash Nagar', 'Mayapuri', 'Tilak Nagar'], totalStops: 6, vehicleId: 'VH-005', driverId: 'DRV-005', alternateDriverId: 'DRV-006', morningDeparture: '07:15 AM', morningArrivalSchool: '07:45 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:00 PM', studentCount: 36, routeColor: '#9b59b6', status: 'Active', insuranceValidTill: '2027-04-22', permitValidTill: '2027-02-14', pollutionValidTill: '2027-01-05', description: 'Rajouri Garden, Tagore Garden, Subhash Nagar, Mayapuri, Tilak Nagar', createdBy: 'Transport Incharge' },
  { id: 'ROUTE-006', routeNumber: 'Route 6', routeName: 'South Delhi - Saket to Vasant Kunj', startPoint: 'Saket Metro Station', endPoint: 'School Main Gate', distance: '22.0 km', estimatedTime: '70 mins', waypoints: ['Press Enclave', 'Malviya Nagar', 'Hauz Khas', 'Vasant Vihar', 'Vasant Kunj'], totalStops: 12, vehicleId: 'VH-006', driverId: 'DRV-006', alternateDriverId: 'DRV-007', morningDeparture: '06:30 AM', morningArrivalSchool: '07:40 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:40 PM', studentCount: 42, routeColor: '#1abc9c', status: 'Active', insuranceValidTill: '2026-10-15', permitValidTill: '2027-05-01', pollutionValidTill: '2026-08-30', description: 'South Delhi Premium Route: Saket, Malviya Nagar, Hauz Khas, Vasant Vihar, Vasant Kunj', createdBy: 'Transport Incharge' },
  { id: 'ROUTE-007', routeNumber: 'Route 7', routeName: 'Gurugram - Cyber City to Sector 49', startPoint: 'Cyber City Metro, Gurugram', endPoint: 'School Main Gate', distance: '28.5 km', estimatedTime: '85 mins', waypoints: ['DLF Phase 1-5', 'Sohna Road', 'Sector 31', 'Sector 49'], totalStops: 14, vehicleId: 'VH-007', driverId: 'DRV-007', alternateDriverId: 'DRV-008', morningDeparture: '06:15 AM', morningArrivalSchool: '07:40 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:55 PM', studentCount: 38, routeColor: '#e67e22', status: 'Active', insuranceValidTill: '2027-02-10', permitValidTill: '2027-07-25', pollutionValidTill: '2026-11-18', description: 'NRI & Expat heavy route - Gurugram DLF, Sohna Road', createdBy: 'Transport Incharge' },
  { id: 'ROUTE-008', routeNumber: 'Route 8', routeName: 'Ghaziabad - Vaishali, Indirapuram, Kaushambi', startPoint: 'Vaishali Metro Station', endPoint: 'School Main Gate', distance: '25.8 km', estimatedTime: '78 mins', waypoints: ['Indirapuram Habitat Centre', 'Kaushambi', 'Shahdara', 'Anand Vihar'], totalStops: 11, vehicleId: 'VH-008', driverId: 'DRV-008', alternateDriverId: 'DRV-001', morningDeparture: '06:20 AM', morningArrivalSchool: '07:38 AM', eveningDepartureSchool: '02:30 PM', eveningArrivalEnd: '03:48 PM', studentCount: 40, routeColor: '#34495e', status: 'Active', insuranceValidTill: '2027-05-30', permitValidTill: '2027-03-18', pollutionValidTill: '2026-12-05', description: 'Ghaziabad Suburbs: Vaishali, Indirapuram, Kaushambi, Shahdara', createdBy: 'Transport Incharge' },
]

const routeMap = {}
SEED_TRANSPORT_ROUTES.forEach(r => { routeMap[r.routeNumber] = r })

const driverNames = [
  { name: 'Rajesh Kumar', age: 48 }, { name: 'Suresh Chandra', age: 52 }, { name: 'Amit Kumar Verma', age: 44 },
  { name: 'Ramesh Singh', age: 50 }, { name: 'Naresh Kumar', age: 46 }, { name: 'Satveer Singh', age: 54 },
  { name: 'Om Prakash', age: 49 }, { name: 'Jitender Singh', age: 45 }, { name: 'Anil Kumar', age: 47 },
  { name: 'Mahendra Pal', age: 53 },
]

export const SEED_DRIVERS = driverNames.map((d, i) => ({
  id: `DRV-${String(i + 1).padStart(3, '0')}`,
  employeeId: `DRV-EMP-${String(100 + i).padStart(4, '0')}`,
  name: d.name,
  fullName: d.name,
  age: d.age,
  gender: 'Male',
  dateOfBirth: `19${70 + (i % 25)}-${String(((i * 3) % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
  phone: `+91 98${String(70000000 + i * 157).slice(0, 8)}`,
  alternatePhone: `+91 97${String(80000000 + i * 223).slice(0, 8)}`,
  email: `driver${i + 1}@schooltransport.edu`,
  currentAddress: `${500 + i * 9}, Transport Colony, Sector ${(i % 10) + 1}, ${cities[i % cities.length]}`,
  permanentAddress: `Vill. & Post ${lastNames[(i * 2) % lastNames.length]}, Distt. ${cities[(i * 3) % cities.length]}`,
  bloodGroup: bloodGroups[i % bloodGroups.length],
  experience: 10 + (i % 15),
  drivingExperience: 15 + (i % 20),
  licenseNumber: `DL-${cities[i % cities.length].slice(0, 3).toUpperCase()}/${String(2005 + i)}/${String(100000 + i * 37).padStart(8, '0')}`,
  licenseType: 'HMV (Heavy Motor Vehicle)',
  licenseValidFrom: `20${10 + (i % 5)}-0${1 + (i % 9)}-15`,
  licenseValidTill: `20${28 + (i % 5)}-0${1 + (i % 9)}-14`,
  licenseVerified: true,
  badgeNumber: `T-BADGE-${String(5000 + i).padStart(5, '0')}`,
  aadharNumber: `XXXX-XXXX-${String(5000 + i * 17).padStart(4, '0')}`,
  panNumber: `DRV${String(1000 + i * 3).padStart(4, '0')}P`,
  assignedRouteId: SEED_TRANSPORT_ROUTES[i % SEED_TRANSPORT_ROUTES.length].id,
  assignedRouteName: SEED_TRANSPORT_ROUTES[i % SEED_TRANSPORT_ROUTES.length].routeName,
  assignedRouteNumber: SEED_TRANSPORT_ROUTES[i % SEED_TRANSPORT_ROUTES.length].routeNumber,
  assignedVehicleId: `VH-${String(i + 1).padStart(3, '0')}`,
  monthlySalary: 22000 + (i % 5) * 2000,
  salaryPerMonth: `₹ ${(22000 + (i % 5) * 2000).toLocaleString()}`,
  overtimeRatePerHour: 150,
  joinDate: `20${10 + (i % 10)}-${String(((i * 2) % 12) + 1).padStart(2, '0')}-05`,
  employeeStatus: i % 11 === 0 ? 'On Medical Leave' : 'Active',
  trainingCompleted: ['Defensive Driving Training', 'First Aid & Emergency Response', 'Fire Safety Drill', 'Student Handling & Behaviour'],
  certifications: ['HMV Driver Training Certified', 'First Aid Provider (St. John Ambulance)', 'Road Safety Officer'],
  medicalFitnessCertDate: `2026-0${((i * 2) % 9) + 1}-20`,
  medicalFitnessValidTill: `2027-0${((i * 2) % 9) + 1}-19`,
  accidentsRecorded: i % 9 === 0 ? 1 : 0,
  lastAccidentDate: i % 9 === 0 ? '2024-08-15' : null,
  violations: i % 7 === 0 ? 1 : 0,
  lastViolation: i % 7 === 0 ? 'Speeding - ₹500 Challan Paid' : '',
  rating: 5 - (i % 2),
  remarks: i === 0 ? 'Senior Driver. Excellent feedback from parents.' : '',
  photoUrl: '',
  emergencyContactName: `${lastNames[(i + 3) % lastNames.length]} - Spouse`,
  emergencyContactPhone: `+91 96${String(90000000 + i * 199).slice(0, 8)}`,
  insurance: true,
}))

const vehicleData = [
  { make: 'Tata', model: 'Marcopolo Starbus', type: 'School Bus', seats: 52, color: 'Yellow & Black', year: 2022 },
  { make: 'Eicher', model: '10.75L Skyline Pro', type: 'School Bus', seats: 55, color: 'Yellow & Black', year: 2021 },
  { make: 'Ashok Leyland', model: 'MiTR School Bus', type: 'School Bus', seats: 48, color: 'Yellow & Black', year: 2023 },
  { make: 'Tata', model: 'Ultra LPO 10.2', type: 'School Bus', seats: 50, color: 'Yellow & Black', year: 2022 },
  { make: 'Eicher', model: 'Skyline 2050L', type: 'School Bus', seats: 56, color: 'Yellow & Black', year: 2020 },
  { make: 'SML Isuzu', model: 'Executive LX Bus', type: 'School Van', seats: 32, color: 'Yellow & White', year: 2023 },
  { make: 'Force', model: 'Traveller 3350 Super', type: 'School Van', seats: 26, color: 'Yellow & White', year: 2024 },
  { make: 'Ashok Leyland', model: 'Bada Dost School', type: 'School Van', seats: 24, color: 'Yellow & White', year: 2022 },
  { make: 'Toyota', model: 'Innova Crysta', type: 'Staff Car', seats: 7, color: 'White', year: 2023 },
  { make: 'Maruti Suzuki', model: 'Eeco CNG', type: 'Support Vehicle', seats: 7, color: 'White & Green', year: 2024 },
]

export const SEED_VEHICLES = vehicleData.map((v, i) => ({
  id: `VH-${String(i + 1).padStart(3, '0')}`,
  vehicleNumber: `DL-${String(1 + (i % 2)).padStart(2, '0')}${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 5) % 26))}-${String(1000 + i * 31).padStart(4, '0')}`,
  make: v.make,
  model: v.model,
  manufacturer: v.make,
  vehicleType: v.type,
  description: `${v.make} ${v.model} ${v.type}`,
  year: v.year,
  manufacturingYear: v.year,
  purchaseDate: `${v.year}-${String(((i * 3) % 12) + 1).padStart(2, '0')}-10`,
  purchasePrice: v.type === 'School Bus' ? 2800000 + (i % 3) * 150000 : v.type === 'School Van' ? 1400000 + (i % 2) * 100000 : 2400000,
  currentValue: v.type === 'School Bus' ? Math.round((2800000 + (i % 3) * 150000) * (1 - (2026 - v.year) * 0.12)) : v.type === 'School Van' ? Math.round((1400000 + (i % 2) * 100000) * (1 - (2026 - v.year) * 0.1)) : Math.round(2400000 * (1 - (2026 - v.year) * 0.15)),
  seatingCapacity: v.seats,
  numberOfSeats: v.seats,
  color: v.color,
  fuelType: i % 3 === 0 ? 'Diesel' : i % 3 === 1 ? 'Diesel' : 'CNG',
  engineNumber: `ENG${v.make.slice(0, 3).toUpperCase()}${String(100000 + i * 53).padStart(8, '0')}`,
  chassisNumber: `CHS${String(2000000 + i * 19).padStart(17, '0')}`,
  insuredValue: v.type === 'School Bus' ? 3000000 : v.type === 'School Van' ? 1500000 : 2500000,
  insuranceCompany: i % 3 === 0 ? 'New India Assurance' : i % 3 === 1 ? 'United India Insurance' : 'ICICI Lombard General',
  insurancePolicyNumber: `INS-${v.type.slice(0, 3).toUpperCase()}-${String(300000 + i * 113).padStart(8, '0')}`,
  insuranceStartDate: `2026-03-${String(1 + (i % 20)).padStart(2, '0')}`,
  insuranceExpiryDate: `2027-03-${String(1 + (i % 20)).padStart(2, '0')}`,
  roadTaxPaidUpto: '2030-03-31',
  fitnessCertificateValid: true,
  fitnessCertificateExpiry: `20${27 + (i % 3)}-06-30`,
  pollutionCertificateExpiry: `2026-0${11 + (i % 3)}-${String(1 + (i % 20)).padStart(2, '0')}`,
  permitType: v.type === 'Staff Car' || v.type === 'Support Vehicle' ? 'Private Permit' : 'All India Tourist Permit (School)',
  permitNumber: `PRM-${String(50000 + i * 29).padStart(8, '0')}`,
  permitExpiry: `2027-0${((i * 2) % 9) + 1}-${String(10 + (i % 15)).padStart(2, '0')}`,
  schoolBusSafetyCodeCompliant: v.type === 'School Bus' || v.type === 'School Van',
  speedLimiterInstalled: true,
  gpsTrackingInstalled: true,
  gpsDeviceId: `GPS-SCH-${String(1000 + i).padStart(5, '0')}`,
  cctvInstalled: v.type === 'School Bus' || v.type === 'School Van',
  numberOfCameras: v.type === 'School Bus' ? 8 : v.type === 'School Van' ? 4 : 0,
  firstAidKitAvailable: true,
  fireExtinguisherAvailable: true,
  emergencyExitCount: v.type === 'School Bus' ? 2 : v.type === 'School Van' ? 1 : 0,
  assignedRouteId: i < SEED_TRANSPORT_ROUTES.length ? SEED_TRANSPORT_ROUTES[i].id : '',
  assignedRouteName: i < SEED_TRANSPORT_ROUTES.length ? SEED_TRANSPORT_ROUTES[i].routeName : 'Staff Pool',
  assignedDriverId: i < SEED_DRIVERS.length ? SEED_DRIVERS[i].id : SEED_DRIVERS[0].id,
  assignedDriverName: i < SEED_DRIVERS.length ? SEED_DRIVERS[i].fullName : SEED_DRIVERS[0].fullName,
  currentOdometerReading: 45000 + i * 8500 + (2026 - v.year) * 20000,
  lastServiceDate: `2026-0${((i * 2) % 6) + 1}-${String(15 + (i % 10)).padStart(2, '0')}`,
  nextServiceDueKm: 45000 + i * 8500 + (2026 - v.year) * 20000 + 10000 - ((i * 8500) % 10000),
  nextServiceDueDate: `2026-0${((i * 2) % 6) + 7}-${String(10 + (i % 15)).padStart(2, '0')}`,
  totalFuelConsumedLtr: 5000 + i * 1200,
  averageKmL: v.fuelType === 'Diesel' ? 6.5 : v.fuelType === 'CNG' ? 18 : 12,
  totalTripsCompleted: 400 + i * 50,
  totalStudentsTransportedTotal: 60000 + i * 8000,
  status: i % 13 === 0 ? 'Under Maintenance' : 'Running',
  statusDate: new Date().toISOString().slice(0, 10),
  photos: [],
  documents: ['RC', 'Insurance', 'Pollution', 'Fitness', 'Permit', 'Road Tax'],
  maintenanceHistory: [
    { date: `2026-02-${String(5 + (i % 20)).padStart(2, '0')}`, type: 'Complete Service', odometer: 40000 + i * 8000, cost: 15000, description: 'Oil Change, Filters, Brake Check' },
    { date: `2025-11-${String(10 + (i % 15)).padStart(2, '0')}`, type: 'Tyre Replacement', odometer: 30000 + i * 8000, cost: 45000, description: 'All 6 new tyres' },
  ],
  fuelCard: i % 2 === 0 ? 'IOCL Fleet Card - ****8899' : 'HPCL Commercial - ****5566',
  monthlyEMI: v.year >= 2023 ? Math.round(v.purchasePrice / (7 * 12)) : 0,
  loanAccount: v.year >= 2023 ? `HDFC Auto Loan A/c ****${String(2000 + i).padStart(4, '0')}` : '',
}))

export const SEED_PICKUP_POINTS = []
let pIdx = 1
SEED_TRANSPORT_ROUTES.forEach(route => {
  route.waypoints.forEach((wp, wpi) => {
    const studentList = SEED_STUDENTS.filter(s => s.transportRoute === route.routeNumber).slice(0, route.studentCount / route.totalStops)
    SEED_PICKUP_POINTS.push({
      id: `PP-${String(pIdx).padStart(4, '0')}`,
      routeId: route.id,
      routeNumber: route.routeNumber,
      routeName: route.routeName,
      stopNumber: wpi + 1,
      stopName: wp,
      fullAddress: `${wp}, ${cities[wpi % cities.length]}`,
      landmark: `Near ${lastNames[wpi % lastNames.length]} ${['Park', 'Temple', 'Market', 'Metro Gate #2', 'School Crossing', 'Hospital Main Gate', 'Bank ATM'][wpi % 7]}`,
      gpsCoordinates: `${28.50 + pIdx * 0.01}, ${77.10 + pIdx * 0.015}`,
      googleMapsUrl: `https://maps.google.com/?q=28.${5000 + pIdx * 10},77.${1000 + pIdx * 15}`,
      morningArrivalTime: `07:${String(5 + wpi * 5).padStart(2, '0')} AM`,
      eveningDropTime: `02:${String(35 + wpi * 4).padStart(2, '0')} PM`,
      assignedBusId: route.vehicleId,
      assignedBusNumber: SEED_VEHICLES.find(v => v.id === route.vehicleId)?.vehicleNumber,
      assignedDriverName: SEED_DRIVERS.find(d => d.id === route.driverId)?.fullName,
      assignedDriverPhone: SEED_DRIVERS.find(d => d.id === route.driverId)?.phone,
      studentCount: Math.max(3, Math.round(route.studentCount / route.totalStops) + ((pIdx * 3) % 5) - 2),
      studentIds: SEED_STUDENTS.filter(s => s.transportRoute === route.routeNumber).slice((wpi * 5), (wpi * 5) + 8).map(s => s.id),
      waitingArea: wpi % 3 === 0 ? 'Covered Bus Bay' : wpi % 3 === 1 ? 'Open Bus Stand' : 'Road Side with Shelter',
      lightingAvailable: wpi % 2 === 0,
      securityGuardPosted: wpi % 4 === 0,
      status: 'Active',
      createdAt: '2025-04-01',
    })
    pIdx++
  })
})

export const SEED_TRANSPORT_FEES = []
let tfIdx = 1
SEED_STUDENTS.filter(s => s.transportRequired).forEach(stu => {
  const routeNum = stu.transportRoute
  const route = routeMap[routeNum]
  if (!route) return
  const distanceFactor = parseFloat(route.distance)
  const monthlyFee = Math.round(15 * Math.round(distanceFactor * 18))
  ;['Q1', 'Q2', 'Q3', 'Q4'].forEach((q, qi) => {
    SEED_TRANSPORT_FEES.push({
      id: `TF-${String(tfIdx).padStart(5, '0')}`,
      receiptNumber: `TFRCPT-${2026}-${String(30000 + tfIdx).padStart(6, '0')}`,
      academicYear: '2025-2026',
      studentId: stu.id,
      studentName: stu.fullName,
      admissionNo: stu.admissionNo,
      className: stu.className,
      section: stu.section,
      routeId: route.id,
      routeNumber: route.routeNumber,
      routeName: route.routeName,
      pickupPoint: SEED_PICKUP_POINTS.find(p => p.routeId === route.id && p.studentIds.includes(stu.id))?.stopName || route.waypoints[tfIdx % route.waypoints.length],
      pickupPointId: SEED_PICKUP_POINTS.find(p => p.routeId === route.id && p.studentIds.includes(stu.id))?.id,
      vehicleId: route.vehicleId,
      vehicleNumber: SEED_VEHICLES.find(v => v.id === route.vehicleId)?.vehicleNumber,
      driverId: route.driverId,
      driverName: SEED_DRIVERS.find(d => d.id === route.driverId)?.fullName,
      quarter: q,
      months: `${['Apr-Jun', 'Jul-Sep', 'Oct-Dec', 'Jan-Mar'][qi]}`,
      billingMonthStart: `2026-${String(qi * 3 + 1).padStart(2, '0')}-01`,
      billingMonthEnd: `2026-${String((qi + 1) * 3).padStart(2, '0')}-${qi % 2 === 1 ? 30 : 31}`,
      monthlyFee,
      numberOfMonths: 3,
      baseAmount: monthlyFee * 3,
      distance: route.distance,
      distanceSurcharge: Math.round(monthlyFee * 3 * 0.02),
      totalAmount: Math.round(monthlyFee * 3 * 1.02),
      lateFee: tfIdx % 19 === 0 ? 100 : 0,
      oneWayConcession: 0,
      scholarshipConcession: 0,
      totalPayable: Math.round(monthlyFee * 3 * 1.02) + (tfIdx % 19 === 0 ? 100 : 0),
      status: tfIdx % 13 === 0 ? 'Pending' : tfIdx % 29 === 0 ? 'Partial' : 'Paid',
      amountPaid: tfIdx % 13 === 0 ? 0 : tfIdx % 29 === 0 ? Math.round(monthlyFee * 3 * 0.5) : Math.round(monthlyFee * 3 * 1.02),
      balanceDue: tfIdx % 13 === 0 ? Math.round(monthlyFee * 3 * 1.02) + (tfIdx % 19 === 0 ? 100 : 0) : tfIdx % 29 === 0 ? Math.round(monthlyFee * 3 * 0.52) + (tfIdx % 19 === 0 ? 100 : 0) : 0,
      paymentDate: tfIdx % 13 !== 0 ? `2026-${String(qi * 3 + 1).padStart(2, '0')}-${String((tfIdx % 25) + 1).padStart(2, '0')}` : null,
      paymentMode: tfIdx % 4 === 0 ? 'UPI' : tfIdx % 4 === 1 ? 'Net Banking' : tfIdx % 4 === 2 ? 'Cheque' : 'Cash',
      transactionId: tfIdx % 13 !== 0 ? `TF-TXN-${String(400000 + tfIdx * 17).padStart(8, '0')}` : '',
      generatedBy: SEED_TEACHERS[tfIdx % SEED_TEACHERS.length].fullName,
      receiptPrinted: tfIdx % 3 === 0,
      remarks: '',
    })
    tfIdx++
  })
})

const bookCats = [
  { id: 'CAT-001', name: 'Academic - Textbooks', description: 'NCERT & Reference Textbooks for all Classes', prefix: 'TXB', count: 0 },
  { id: 'CAT-002', name: 'Fiction', description: 'Novels, Short Stories, Classic Literature', prefix: 'FIC', count: 0 },
  { id: 'CAT-003', name: 'Non-Fiction - Science', description: 'Popular Science, Biographies of Scientists', prefix: 'NFS', count: 0 },
  { id: 'CAT-004', name: 'Non-Fiction - History', description: 'World & Indian History, Historical Biographies', prefix: 'NFH', count: 0 },
  { id: 'CAT-005', name: 'Reference & Encyclopedia', description: 'General Knowledge, Dictionaries, Atlases', prefix: 'REF', count: 0 },
  { id: 'CAT-006', name: 'Children & Illustrated', description: 'Activity Books, Picture Books, Moral Stories', prefix: 'CHL', count: 0 },
  { id: 'CAT-007', name: 'Competitive Exams', description: 'Olympiad, NTSE, IIT, NEET Foundation Books', prefix: 'COM', count: 0 },
  { id: 'CAT-008', name: 'Biographies & Self-Help', description: 'Biographies, Inspirational, Motivational', prefix: 'BIO', count: 0 },
  { id: 'CAT-009', name: 'Periodicals & Magazines', description: 'Academic Magazines, Newspaper Subscriptions', prefix: 'PER', count: 0 },
  { id: 'CAT-010', name: 'Arts, Music & Sports', description: 'Arts & Craft, Music Lessons, Sports Biographies', prefix: 'AMS', count: 0 },
]

export const SEED_BOOK_CATEGORIES = bookCats

const catMap = {}
bookCats.forEach(c => { catMap[c.prefix] = c })

const bookTemplate = [
  { t: 'Mathematics Textbook Class 9', a: 'NCERT Council', isbn: '978-81-7450-676-8', cat: 'TXB', pub: 'NCERT', y: 2024, p: 512, price: 250 },
  { t: 'Science Textbook Class 10', a: 'NCERT Council', isbn: '978-81-7450-760-4', cat: 'TXB', pub: 'NCERT', y: 2024, p: 480, price: 230 },
  { t: 'Physics - Concepts of Physics Vol 1', a: 'H.C. Verma', isbn: '978-81-7709-189-0', cat: 'TXB', pub: 'Bharati Bhawan', y: 2022, p: 472, price: 425 },
  { t: 'Organic Chemistry - Morrison & Boyd', a: 'Robert Thornton Morrison', isbn: '978-93-325-5430-2', cat: 'TXB', pub: 'Pearson India', y: 2023, p: 1350, price: 1299 },
  { t: 'Biology - Trueman Elementary', a: 'K.N. Bhatia', isbn: '978-81-8971-818-2', cat: 'TXB', pub: 'Trueman Book Co.', y: 2024, p: 1100, price: 899 },
  { t: 'Indian History - Ancient to Modern', a: 'Bipan Chandra', isbn: '978-01-4029-322-0', cat: 'TXB', pub: 'Penguin Random House', y: 2021, p: 680, price: 599 },
  { t: 'Oxford Student Atlas for India', a: 'Oxford University Press', isbn: '978-01-9946-899-5', cat: 'REF', pub: 'Oxford Press', y: 2024, p: 180, price: 399 },
  { t: 'Merriam-Webster Collegiate Dictionary', a: 'Merriam-Webster Editors', isbn: '978-08-7779-807-2', cat: 'REF', pub: 'Merriam-Webster Inc.', y: 2023, p: 1664, price: 2499 },
  { t: 'Encyclopedia Britannica 2024', a: 'Britannica Editors', isbn: '978-15-9339-292-5', cat: 'REF', pub: 'Britannica Group', y: 2024, p: 800, price: 4999 },
  { t: 'General Knowledge 2026', a: 'Arihant Experts', isbn: '978-93-252-9832-3', cat: 'REF', pub: 'Arihant Publications', y: 2025, p: 650, price: 599 },
]

export const SEED_BOOKS = bookTemplate.concat([
  { t: 'The Alchemist', a: 'Paulo Coelho', isbn: '978-00-6231-500-7', cat: 'FIC', pub: 'HarperCollins', y: 1988, p: 208, price: 399 },
  { t: 'To Kill a Mockingbird', a: 'Harper Lee', isbn: '978-00-6112-008-4', cat: 'FIC', pub: 'J.B. Lippincott & Co.', y: 1960, p: 336, price: 549 },
  { t: '1984 - George Orwell', a: 'George Orwell', isbn: '978-04-5152-493-5', cat: 'FIC', pub: 'Secker & Warburg', y: 1949, p: 328, price: 499 },
  { t: 'The Great Gatsby', a: 'F. Scott Fitzgerald', isbn: '978-07-4327-356-5', cat: 'FIC', pub: 'Scribner Classics', y: 1925, p: 180, price: 299 },
  { t: 'Animal Farm', a: 'George Orwell', isbn: '978-04-5152-634-2', cat: 'FIC', pub: 'Penguin Books', y: 1945, p: 112, price: 249 },
  { t: 'The White Tiger', a: 'Aravind Adiga', isbn: '978-81-7223-745-5', cat: 'FIC', pub: 'HarperCollins India', y: 2008, p: 320, price: 499 },
  { t: 'Midnight\'s Children', a: 'Salman Rushdie', isbn: '978-02-2401-817-0', cat: 'FIC', pub: 'Jonathan Cape', y: 1981, p: 536, price: 799 },
  { t: 'A Brief History of Time', a: 'Stephen Hawking', isbn: '978-05-5338-016-0', cat: 'NFS', pub: 'Bantam Dell', y: 1988, p: 256, price: 699 },
  { t: 'Sapiens: A Brief History of Humankind', a: 'Yuval Noah Harari', isbn: '978-00-6231-609-7', cat: 'NFS', pub: 'Harper', y: 2011, p: 464, price: 599 },
  { t: 'The Origin of Species', a: 'Charles Darwin', isbn: '978-04-5152-906-0', cat: 'NFS', pub: 'Signet Classics', y: 1859, p: 560, price: 549 },
  { t: 'Cosmos', a: 'Carl Sagan', isbn: '978-03-4553-943-6', cat: 'NFS', pub: 'Ballantine Books', y: 1980, p: 480, price: 799 },
  { t: 'India After Gandhi', a: 'Ramachandra Guha', isbn: '978-00-6095-858-1', cat: 'NFH', pub: 'HarperCollins', y: 2007, p: 893, price: 999 },
  { t: 'The Discovery of India', a: 'Jawaharlal Nehru', isbn: '978-01-9562-359-3', cat: 'NFH', pub: 'Oxford University Press', y: 1946, p: 656, price: 899 },
  { t: 'Freedom at Midnight', a: 'Dominique Lapierre', isbn: '978-81-7223-219-1', cat: 'NFH', pub: 'Vikas Publishing', y: 1975, p: 600, price: 699 },
  { t: 'Panchatantra Stories', a: 'Vishnu Sharma', isbn: '978-81-2880-581-9', cat: 'CHL', pub: 'Scholastic India', y: 2015, p: 192, price: 349 },
  { t: 'Moral Tales from the Panchatantra', a: 'Anita Nair', isbn: '978-93-5103-517-3', cat: 'CHL', pub: 'HarperCollins Children', y: 2020, p: 220, price: 399 },
  { t: 'Grandma\'s Bag of Stories', a: 'Sudha Murty', isbn: '978-01-4333-346-0', cat: 'CHL', pub: 'Penguin Books India', y: 2015, p: 208, price: 299 },
  { t: 'Wings of Fire', a: 'A.P.J. Abdul Kalam', isbn: '978-81-7371-146-0', cat: 'BIO', pub: 'Universities Press', y: 1999, p: 297, price: 499 },
  { t: 'The Story of My Experiments with Truth', a: 'M.K. Gandhi', isbn: '978-08-0701-906-0', cat: 'BIO', pub: 'Dover Publications', y: 1927, p: 560, price: 599 },
  { t: 'Atomic Habits', a: 'James Clear', isbn: '978-07-3521-129-2', cat: 'BIO', pub: 'Avery Publishing', y: 2018, p: 320, price: 699 },
  { t: 'The 7 Habits of Highly Effective People', a: 'Stephen Covey', isbn: '978-06-7167-396-8', cat: 'BIO', pub: 'Free Press', y: 1989, p: 432, price: 799 },
  { t: 'IIT JEE Foundation Mathematics', a: 'R.D. Sharma', isbn: '978-93-5253-142-5', cat: 'COM', pub: 'Dhanpat Rai & Co.', y: 2024, p: 920, price: 1299 },
  { t: 'NEET Biology - Objective Volume 1', a: 'Trueman Editorial', isbn: '978-81-8971-901-1', cat: 'COM', pub: 'Trueman Book Co.', y: 2024, p: 1250, price: 1499 },
  { t: 'NTSE Study Package - SAT', a: 'McGraw Hill Experts', isbn: '978-93-3922-261-4', cat: 'COM', pub: 'McGraw Hill India', y: 2025, p: 720, price: 999 },
  { t: 'Maths Olympiad for Class 10', a: 'Silver Zone Foundation', isbn: '978-93-8623-499-7', cat: 'COM', pub: 'SilverZone', y: 2024, p: 320, price: 499 },
  { t: 'The Hindu Newspaper - Annual Pack', a: 'THG Publishing', isbn: 'NEWS-HINDU', cat: 'PER', pub: 'The Hindu Group', y: 2026, p: 365, price: 5499 },
  { t: 'India Today - Monthly Magazine Subscription', a: 'Living Media India', isbn: 'MAG-IT-2026', cat: 'PER', pub: 'Living Media Ltd.', y: 2026, p: 12, price: 2999 },
  { t: 'Competition Success Review', a: 'CSR Editorial', isbn: 'MAG-CSR-2026', cat: 'PER', pub: 'Kirti Prakashan', y: 2026, p: 12, price: 1499 },
  { t: 'National Geographic Kids Magazine', a: 'Nat Geo Society', isbn: 'MAG-NGK-2026', cat: 'PER', pub: 'National Geographic Partners', y: 2026, p: 12, price: 2499 },
  { t: 'Sportstar - Weekly', a: 'The Hindu Group', isbn: 'MAG-SPORT-2026', cat: 'PER', pub: 'THG Publishing', y: 2026, p: 52, price: 1999 },
  { t: 'Drawing Book: Master the Basics', a: 'David Sanmiguel', isbn: '978-17-8157-648-1', cat: 'AMS', pub: 'Arcturus Publishing', y: 2022, p: 256, price: 499 },
  { t: 'Keyboard Lessons - Complete Course', a: 'Willard A. Palmer', isbn: '978-07-3901-587-3', cat: 'AMS', pub: 'Alfred Music', y: 2020, p: 384, price: 1299 },
  { t: 'The Art of War - Sun Tzu', a: 'Sun Tzu', isbn: '978-15-9030-643-4', cat: 'AMS', pub: 'Shambhala Publications', y: 2005, p: 128, price: 299 },
  { t: 'Playing It My Way', a: 'Sachin Tendulkar', isbn: '978-14-7360-556-8', cat: 'AMS', pub: 'Hodder & Stoughton', y: 2014, p: 480, price: 899 },
  { t: 'Ramanujan - The Man Who Knew Infinity', a: 'Robert Kanigel', isbn: '978-06-7175-061-9', cat: 'BIO', pub: 'Washington Square Press', y: 1991, p: 512, price: 799 },
  { t: 'Chhava - The Life of Chhatrapati Shivaji', a: 'Vasudev S. Khare', isbn: '978-93-8689-255-1', cat: 'NFH', pub: 'Sakal Publications', y: 2018, p: 600, price: 749 },
  { t: 'CBSE All in One Class 10 English', a: 'Arihant Experts', isbn: '978-93-2619-448-8', cat: 'TXB', pub: 'Arihant Publications', y: 2025, p: 680, price: 699 },
  { t: 'The Diary of a Young Girl', a: 'Anne Frank', isbn: '978-05-5329-698-1', cat: 'BIO', pub: 'Bantam Books', y: 1947, p: 352, price: 399 },
  { t: 'Think and Grow Rich', a: 'Napoleon Hill', isbn: '978-81-8322-082-8', cat: 'BIO', pub: 'Fingerprint Publishing', y: 1937, p: 320, price: 299 },
  { t: 'Hindi Vyakaran Class 10', a: 'Saraswati Experts', isbn: '978-93-5043-201-5', cat: 'TXB', pub: 'Saraswati House', y: 2024, p: 240, price: 250 },
  { t: 'Computer Science with Python', a: 'Sumita Arora', isbn: '978-93-8734-007-6', cat: 'TXB', pub: 'Dhanpat Rai & Co.', y: 2024, p: 680, price: 899 },
  { t: 'Cognitive Psychology for Students', a: 'Robert J. Sternberg', isbn: '978-04-9550-619-4', cat: 'TXB', pub: 'Cengage Learning', y: 2012, p: 528, price: 4999 },
  { t: 'Commerce - Business Studies Class 12', a: 'Poonam Gandhi', isbn: '978-93-2725-089-5', cat: 'TXB', pub: 'VK Global Publications', y: 2025, p: 640, price: 699 },
  { t: 'The Lord of the Rings - Fellowship', a: 'J.R.R. Tolkien', isbn: '978-05-4792-825-8', cat: 'FIC', pub: 'Houghton Mifflin', y: 1954, p: 527, price: 899 },
  { t: 'Pride and Prejudice', a: 'Jane Austen', isbn: '978-01-4143-951-0', cat: 'FIC', pub: 'Penguin Classics', y: 1813, p: 480, price: 349 },
  { t: 'Rich Dad Poor Dad', a: 'Robert T. Kiyosaki', isbn: '978-16-1268-019-3', cat: 'BIO', pub: 'Plata Publishing', y: 1997, p: 336, price: 599 },
]).map((b, i) => {
  const c = catMap[b.cat]
  const categoryId = c ? c.id : 'CAT-001'
  const categoryName = c ? c.name : 'General'
  return {
    id: `BK-${String(1001 + i).padStart(5, '0')}`,
    accessionNo: `ACC-${2025}-${String(10001 + i).padStart(6, '0')}`,
    title: b.t,
    subtitle: '',
    author: b.a,
    coAuthors: [],
    translators: [],
    editor: '',
    edition: (i % 5) + 1,
    editionYear: b.y,
    yearOfPublication: b.y,
    copyright: b.y,
    isbn: b.isbn,
    issn: '',
    categoryId,
    categoryName,
    categoryCode: b.cat,
    language: i % 5 === 0 ? 'Hindi' : 'English',
    publisher: b.pub,
    publisherAddress: `${cities[i % cities.length]} Office, ${lastNames[i % lastNames.length]} Bhavan, ${cities[i % cities.length]} - ${110000 + i * 37}`,
    placeOfPublication: cities[i % cities.length],
    countryOfPublication: 'India',
    totalPages: b.p,
    numberOfVolumes: 1,
    volumeNo: 1,
    seriesName: '',
    source: i % 10 === 0 ? 'Donation' : 'Purchase',
    donorName: i % 10 === 0 ? `${tFirstNames[i % tFirstNames.length]} ${tLastNames[(i + 3) % tLastNames.length]}` : '',
    donorDate: i % 10 === 0 ? `2025-0${((i * 3) % 9) + 1}-${String(5 + (i % 20)).padStart(2, '0')}` : '',
    billNo: i % 10 !== 0 ? `BILL-${2025}-${String(3000 + i).padStart(5, '0')}` : '',
    billDate: i % 10 !== 0 ? `2025-0${((i * 2) % 6) + 1}-${String(10 + (i % 15)).padStart(2, '0')}` : '',
    vendorName: i % 10 !== 0 ? (i % 3 === 0 ? 'Indian Book Depot' : 'S Chand & Company Ltd.') : '',
    price: b.price,
    currency: 'INR',
    purchasePrice: i % 10 !== 0 ? Math.round(b.price * (i % 5 === 0 ? 0.8 : 0.9)) : 0,
    currentValue: Math.round(b.price * (1 - (2026 - b.y) * 0.07 > 0.3 ? 1 - (2026 - b.y) * 0.07 : 0.3)),
    sellingPrice: b.price,
    discountAllowed: i % 10 !== 0 ? (i % 5 === 0 ? 20 : 10) : 0,
    shelfLocation: `Shelf ${String.fromCharCode(65 + (i % 10))}-${String(Math.floor(i / 10) + 1).padStart(2, '0')}-${String((i % 5) + 1).padStart(2, '0')}`,
    rackNumber: `Rack ${String.fromCharCode(65 + (i % 10))}`,
    section: i % 5 === 0 ? 'Reference Section' : i % 5 === 1 ? 'Circulation Section' : i % 5 === 2 ? 'Periodicals' : 'Reading Room',
    keywords: [b.cat, b.pub.split(' ')[0], String(b.y)],
    subjects: [categoryName],
    bindingType: i % 4 === 0 ? 'Hardcover' : i % 4 === 1 ? 'Paperback' : 'Casebound',
    pages: b.p,
    height: i % 3 === 0 ? '280mm' : '240mm',
    width: i % 3 === 0 ? '220mm' : '180mm',
    deweyDecimal: `${100 + (i * 7) % 900}.${String(i * 13).padStart(2, '0')}`,
    libraryOfCongress: `${String.fromCharCode(65 + (i % 26))}${100 + (i * 17) % 800}`,
    tableOfContents: ['Part 1 - Introduction', 'Part 2 - Core Concepts', 'Part 3 - Advanced Topics', 'Part 4 - Exercises & Answers'],
    summary: `${b.t} by ${b.a} is a comprehensive book covering ${categoryName.toLowerCase()}. Suitable for students of all grades and educators.`,
    awards: i % 8 === 0 ? ['Best Book Award 2024', 'Reader\'s Choice'] : [],
    firstPublished: b.y,
    copyrightExpiry: b.y + 70,
    totalCopies: (i % 5) + 2,
    copiesAvailable: ((i % 5) + 2) - (i % 3),
    copiesIssued: i % 3,
    copiesReserved: i % 6 === 0 ? 1 : 0,
    copiesLost: i % 15 === 0 ? 1 : 0,
    copiesDamaged: i % 20 === 0 ? 1 : 0,
    rating: 4 + (i % 2),
    totalReviews: 25 + (i * 7) % 75,
    barcode: `BAR-${String(1000000 + i * 37).padStart(12, '0')}`,
    rfidTag: `RFID-SCH-${String(5000 + i).padStart(5, '0')}`,
    issuedCount: 10 + (i * 5) % 50,
    lastIssuedDate: `2026-0${((i * 2) % 6) + 1}-${String(10 + (i % 18)).padStart(2, '0')}`,
    status: i % 22 === 0 ? 'Lost' : i % 17 === 0 ? 'Damaged' : i % 13 === 0 ? 'Under Repair' : 'Available',
    addedBy: 'Librarian',
    addedDate: `20${20 + (i % 6)}-${String(((i * 3) % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    updatedDate: new Date().toISOString().slice(0, 10),
    coverImage: '',
    ebookAvailable: i % 3 === 0,
    ebookUrl: i % 3 === 0 ? `https://library.school.edu/ebooks/${b.isbn}.pdf` : '',
    audiobookAvailable: i % 7 === 0,
    remarks: i % 11 === 0 ? 'Bestseller - Keep extra copies' : '',
  }
})