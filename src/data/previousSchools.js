/** Previous-school catalog for admission lookup (name, alias, or PIN). */

export const PREVIOUS_SCHOOLS = [
  { id: 'SCH-DL-01', name: 'Delhi Public School, R.K. Puram', aliases: ['dps', 'dps rk puram', 'delhi public school'], pincode: '110022', city: 'New Delhi', district: 'South Delhi', board: 'CBSE', type: 'Private' },
  { id: 'SCH-DL-02', name: 'Modern School, Barakhamba Road', aliases: ['modern school', 'barakhamba'], pincode: '110001', city: 'New Delhi', district: 'New Delhi', board: 'CBSE', type: 'Private' },
  { id: 'SCH-DL-03', name: "St. Columba's School", aliases: ['columba', 'st columba'], pincode: '110001', city: 'New Delhi', district: 'New Delhi', board: 'CBSE', type: 'Private' },
  { id: 'SCH-DL-04', name: 'Sanskriti School, Chanakyapuri', aliases: ['sanskriti'], pincode: '110021', city: 'New Delhi', district: 'New Delhi', board: 'CBSE', type: 'Private' },
  { id: 'SCH-DL-05', name: 'Kendriya Vidyalaya, Gole Market', aliases: ['kv', 'kendriya', 'kendriya vidyalaya'], pincode: '110001', city: 'New Delhi', district: 'New Delhi', board: 'CBSE', type: 'Central' },
  { id: 'SCH-DL-06', name: 'DAV Public School, Vasant Kunj', aliases: ['dav', 'dav vasant kunj'], pincode: '110070', city: 'New Delhi', district: 'South West Delhi', board: 'CBSE', type: 'Private' },
  { id: 'SCH-DL-07', name: 'Amity International School, Saket', aliases: ['amity', 'amity saket'], pincode: '110017', city: 'New Delhi', district: 'South Delhi', board: 'CBSE', type: 'Private' },

  { id: 'SCH-MH-01', name: 'Bombay Scottish School, Mahim', aliases: ['bombay scottish', 'scottish'], pincode: '400016', city: 'Mumbai', district: 'Mumbai', board: 'ICSE', type: 'Private' },
  { id: 'SCH-MH-02', name: 'Cathedral & John Connon School', aliases: ['cathedral', 'john connon'], pincode: '400001', city: 'Mumbai', district: 'Mumbai', board: 'ICSE', type: 'Private' },
  { id: 'SCH-MH-03', name: 'Campion School, Mumbai', aliases: ['campion mumbai'], pincode: '400026', city: 'Mumbai', district: 'Mumbai', board: 'ICSE', type: 'Private' },
  { id: 'SCH-MH-04', name: 'Dhirubhai Ambani International School', aliases: ['dais', 'ambani school'], pincode: '400076', city: 'Mumbai', district: 'Mumbai', board: 'IB', type: 'Private' },
  { id: 'SCH-MH-05', name: 'Ryan International School, Malad', aliases: ['ryan', 'ryan malad'], pincode: '400064', city: 'Mumbai', district: 'Mumbai', board: 'CBSE', type: 'Private' },
  { id: 'SCH-MH-06', name: 'Jamnabai Narsee School', aliases: ['jamnabai', 'jns'], pincode: '400056', city: 'Mumbai', district: 'Mumbai', board: 'ICSE', type: 'Private' },

  { id: 'SCH-PN-01', name: "The Bishop's School, Pune", aliases: ['bishops', 'bishop pune'], pincode: '411001', city: 'Pune', district: 'Pune', board: 'ICSE', type: 'Private' },
  { id: 'SCH-PN-02', name: 'Symbiosis International School', aliases: ['symbiosis'], pincode: '411014', city: 'Pune', district: 'Pune', board: 'IB', type: 'Private' },
  { id: 'SCH-PN-03', name: 'Delhi Public School, Pune', aliases: ['dps', 'dps pune', 'delhi public school pune'], pincode: '411057', city: 'Pune', district: 'Pune', board: 'CBSE', type: 'Private' },
  { id: 'SCH-PN-04', name: 'Kendriya Vidyalaya, Southern Command', aliases: ['kv', 'kv pune', 'kendriya'], pincode: '411001', city: 'Pune', district: 'Pune', board: 'CBSE', type: 'Central' },
  { id: 'SCH-PN-05', name: 'Vikhe Patil Memorial School', aliases: ['vikhe patil'], pincode: '411001', city: 'Pune', district: 'Pune', board: 'CBSE', type: 'Private' },

  { id: 'SCH-KA-01', name: 'National Public School, Indiranagar', aliases: ['nps', 'nps indiranagar'], pincode: '560038', city: 'Bengaluru', district: 'Bengaluru Urban', board: 'CBSE', type: 'Private' },
  { id: 'SCH-KA-02', name: "Bishop Cotton Boys' School", aliases: ['bishop cotton', 'bcbs'], pincode: '560001', city: 'Bengaluru', district: 'Bengaluru Urban', board: 'ICSE', type: 'Private' },
  { id: 'SCH-KA-03', name: "Baldwin Boys' High School", aliases: ['baldwin'], pincode: '560025', city: 'Bengaluru', district: 'Bengaluru Urban', board: 'ICSE', type: 'Private' },
  { id: 'SCH-KA-04', name: 'Delhi Public School, Bengaluru East', aliases: ['dps', 'dps bangalore', 'dps bengaluru'], pincode: '560049', city: 'Bengaluru', district: 'Bengaluru Urban', board: 'CBSE', type: 'Private' },
  { id: 'SCH-KA-05', name: 'Kendriya Vidyalaya, Asc Centre', aliases: ['kv', 'kendriya bangalore'], pincode: '560001', city: 'Bengaluru', district: 'Bengaluru Urban', board: 'CBSE', type: 'Central' },

  { id: 'SCH-TN-01', name: 'The School KFI, Chennai', aliases: ['kfi', 'school kfi'], pincode: '600028', city: 'Chennai', district: 'Chennai', board: 'ICSE', type: 'Private' },
  { id: 'SCH-TN-02', name: 'PSBB Millennium School, Chennai', aliases: ['psbb'], pincode: '600001', city: 'Chennai', district: 'Chennai', board: 'CBSE', type: 'Private' },
  { id: 'SCH-TN-03', name: 'Don Bosco Matriculation School', aliases: ['don bosco'], pincode: '600010', city: 'Chennai', district: 'Chennai', board: 'State', type: 'Private' },
  { id: 'SCH-TN-04', name: 'Kendriya Vidyalaya, Gill Nagar', aliases: ['kv', 'kendriya chennai'], pincode: '600001', city: 'Chennai', district: 'Chennai', board: 'CBSE', type: 'Central' },

  { id: 'SCH-TG-01', name: 'Hyderabad Public School, Begumpet', aliases: ['hps', 'hyderabad public school'], pincode: '500016', city: 'Hyderabad', district: 'Hyderabad', board: 'ICSE', type: 'Private' },
  { id: 'SCH-TG-02', name: 'Oakridge International School', aliases: ['oakridge'], pincode: '500032', city: 'Hyderabad', district: 'Ranga Reddy', board: 'IB', type: 'Private' },
  { id: 'SCH-TG-03', name: 'Delhi Public School, Hyderabad', aliases: ['dps', 'dps hyderabad'], pincode: '500008', city: 'Hyderabad', district: 'Hyderabad', board: 'CBSE', type: 'Private' },
  { id: 'SCH-TG-04', name: 'Kendriya Vidyalaya, Bowenpally', aliases: ['kv', 'kendriya hyderabad'], pincode: '500001', city: 'Hyderabad', district: 'Hyderabad', board: 'CBSE', type: 'Central' },

  { id: 'SCH-WB-01', name: 'La Martiniere for Boys, Kolkata', aliases: ['la martiniere', 'lmb'], pincode: '700017', city: 'Kolkata', district: 'Kolkata', board: 'ICSE', type: 'Private' },
  { id: 'SCH-WB-02', name: "St. Xavier's Collegiate School", aliases: ['xavier', 'st xavier kolkata'], pincode: '700016', city: 'Kolkata', district: 'Kolkata', board: 'ICSE', type: 'Private' },
  { id: 'SCH-WB-03', name: 'South Point High School', aliases: ['south point'], pincode: '700029', city: 'Kolkata', district: 'Kolkata', board: 'CISCE', type: 'Private' },
  { id: 'SCH-WB-04', name: 'Kendriya Vidyalaya, Ballygunge', aliases: ['kv', 'kendriya kolkata'], pincode: '700001', city: 'Kolkata', district: 'Kolkata', board: 'CBSE', type: 'Central' },

  { id: 'SCH-GJ-01', name: 'Anand Niketan School, Ahmedabad', aliases: ['anand niketan'], pincode: '380015', city: 'Ahmedabad', district: 'Ahmedabad', board: 'CBSE', type: 'Private' },
  { id: 'SCH-GJ-02', name: 'Udgam School for Children', aliases: ['udgam'], pincode: '380054', city: 'Ahmedabad', district: 'Ahmedabad', board: 'CBSE', type: 'Private' },
  { id: 'SCH-GJ-03', name: 'Delhi Public School, Bopal', aliases: ['dps', 'dps bopal', 'dps ahmedabad'], pincode: '380058', city: 'Ahmedabad', district: 'Ahmedabad', board: 'CBSE', type: 'Private' },
  { id: 'SCH-GJ-04', name: 'Kendriya Vidyalaya, Ahmedabad Cantt', aliases: ['kv', 'kendriya ahmedabad'], pincode: '380001', city: 'Ahmedabad', district: 'Ahmedabad', board: 'CBSE', type: 'Central' },

  { id: 'SCH-RJ-01', name: "Maharani Gayatri Devi Girls' School", aliases: ['mgd', 'gayatri devi'], pincode: '302001', city: 'Jaipur', district: 'Jaipur', board: 'CBSE', type: 'Private' },
  { id: 'SCH-RJ-02', name: "St. Xavier's School, Jaipur", aliases: ['xavier jaipur'], pincode: '302001', city: 'Jaipur', district: 'Jaipur', board: 'CBSE', type: 'Private' },
  { id: 'SCH-RJ-03', name: 'Seedling Modern Public School', aliases: ['seedling'], pincode: '302017', city: 'Jaipur', district: 'Jaipur', board: 'CBSE', type: 'Private' },
  { id: 'SCH-RJ-04', name: 'Kendriya Vidyalaya No.1, Jaipur', aliases: ['kv', 'kendriya jaipur'], pincode: '302001', city: 'Jaipur', district: 'Jaipur', board: 'CBSE', type: 'Central' },

  { id: 'SCH-UP-01', name: 'City Montessori School, Gomti Nagar', aliases: ['cms', 'city montessori'], pincode: '226010', city: 'Lucknow', district: 'Lucknow', board: 'ICSE', type: 'Private' },
  { id: 'SCH-UP-02', name: 'La Martiniere College, Lucknow', aliases: ['la martiniere lucknow'], pincode: '226001', city: 'Lucknow', district: 'Lucknow', board: 'ICSE', type: 'Private' },
  { id: 'SCH-UP-03', name: 'Delhi Public School, Lucknow', aliases: ['dps', 'dps lucknow'], pincode: '226030', city: 'Lucknow', district: 'Lucknow', board: 'CBSE', type: 'Private' },
  { id: 'SCH-UP-04', name: 'Kendriya Vidyalaya, Aliganj', aliases: ['kv', 'kendriya lucknow'], pincode: '226001', city: 'Lucknow', district: 'Lucknow', board: 'CBSE', type: 'Central' },

  { id: 'SCH-CH-01', name: "St. John's High School, Chandigarh", aliases: ['st john chandigarh'], pincode: '160017', city: 'Chandigarh', district: 'Chandigarh', board: 'ICSE', type: 'Private' },
  { id: 'SCH-CH-02', name: 'Sacred Heart Senior Secondary School', aliases: ['sacred heart chandigarh'], pincode: '160022', city: 'Chandigarh', district: 'Chandigarh', board: 'ICSE', type: 'Private' },
  { id: 'SCH-CH-03', name: 'Kendriya Vidyalaya, Sector 31', aliases: ['kv', 'kendriya chandigarh'], pincode: '160030', city: 'Chandigarh', district: 'Chandigarh', board: 'CBSE', type: 'Central' },

  { id: 'SCH-HR-01', name: 'The Shri Ram School, Aravali', aliases: ['shri ram', 'tsrs'], pincode: '122003', city: 'Gurugram', district: 'Gurugram', board: 'IB', type: 'Private' },
  { id: 'SCH-HR-02', name: 'DPS International, Gurugram', aliases: ['dps', 'dps gurgaon', 'dps gurugram'], pincode: '122017', city: 'Gurugram', district: 'Gurugram', board: 'IB', type: 'Private' },
  { id: 'SCH-HR-03', name: 'GD Goenka Public School, Gurugram', aliases: ['goenka', 'gd goenka'], pincode: '122002', city: 'Gurugram', district: 'Gurugram', board: 'CBSE', type: 'Private' },

  { id: 'SCH-PB-01', name: 'Yadavindra Public School, Patiala', aliases: ['yps', 'yadavindra'], pincode: '147001', city: 'Patiala', district: 'Patiala', board: 'ICSE', type: 'Private' },
  { id: 'SCH-PB-02', name: 'Sacred Heart Convent School, Ludhiana', aliases: ['sacred heart ludhiana'], pincode: '141001', city: 'Ludhiana', district: 'Ludhiana', board: 'ICSE', type: 'Private' },

  { id: 'SCH-KL-01', name: 'Choice School, Tripunithura', aliases: ['choice school'], pincode: '682301', city: 'Kochi', district: 'Ernakulam', board: 'CBSE', type: 'Private' },
  { id: 'SCH-KL-02', name: 'Rajagiri Public School, Kalamassery', aliases: ['rajagiri'], pincode: '683104', city: 'Kochi', district: 'Ernakulam', board: 'CBSE', type: 'Private' },

  { id: 'SCH-MP-01', name: 'Campion School, Bhopal', aliases: ['campion bhopal'], pincode: '462001', city: 'Bhopal', district: 'Bhopal', board: 'CBSE', type: 'Private' },
  { id: 'SCH-MP-02', name: 'Delhi Public School, Bhopal', aliases: ['dps', 'dps bhopal'], pincode: '462044', city: 'Bhopal', district: 'Bhopal', board: 'CBSE', type: 'Private' },
]

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchPreviousSchools(query, { limit = 15 } = {}) {
  const raw = String(query || '').trim()
  if (!raw) return []

  const q = normalize(raw)
  const digits = raw.replace(/\D/g, '')
  const isPinHeavy = digits.length >= 3 && digits.length >= raw.replace(/\s+/g, '').length - 1
  const tokens = q.split(' ').filter((t) => t.length > 0)

  const scored = PREVIOUS_SCHOOLS.map((school) => {
    const name = normalize(school.name)
    const city = normalize(school.city)
    const district = normalize(school.district)
    const board = normalize(school.board)
    const aliases = (school.aliases || []).map(normalize)
    const haystack = [name, city, district, board, school.pincode, ...aliases].join(' ')
    let score = 0

    if (isPinHeavy || digits.length >= 3) {
      if (school.pincode.startsWith(digits)) score += 120
      if (school.pincode === digits) score += 80
    }

    if (name === q || aliases.includes(q)) score += 100
    if (name.startsWith(q)) score += 50
    if (aliases.some((a) => a.startsWith(q) || a.includes(q))) score += 45
    if (name.includes(q)) score += 35
    if (city.includes(q) || district.includes(q)) score += 20

    tokens.forEach((token) => {
      if (token.length < 2) return
      if (name.includes(token)) score += 12
      if (aliases.some((a) => a.includes(token))) score += 14
      if (city.includes(token)) score += 8
      if (haystack.includes(token)) score += 4
    })

    return { school, score }
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name))
    .slice(0, limit)
    .map((row) => row.school)

  return scored
}
