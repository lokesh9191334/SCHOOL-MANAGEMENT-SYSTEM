import PremiumWorkspace from '../../components/PremiumWorkspace/PremiumWorkspace'

const libraryConfig = {
  section: 'Resources',
  title: 'Digital Library',
  description: 'Manage catalogue titles, lending status, ISBN details and overdue follow-ups from one workspace.',
  idPrefix: 'LIB',
  storageKey: 'sms_library_records',
  createLabel: 'Add book',
  statusOptions: ['Available', 'On loan', 'Overdue', 'Archived'],
  columns: [
    { key: 'title', label: 'Book' },
    { key: 'author', label: 'Author' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'status', label: 'Status' },
  ],
  fields: [
    { key: 'title', label: 'Book title' },
    { key: 'author', label: 'Author' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status', type: 'select', options: ['Available', 'On loan', 'Overdue', 'Archived'] },
  ],
  seed: [
    { id: 'LIB-1001', title: 'The Blue Umbrella', author: 'Ruskin Bond', isbn: '9788129118921', category: 'Literature', status: 'Available' },
    { id: 'LIB-1002', title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553176988', category: 'Science', status: 'On loan' },
    { id: 'LIB-1003', title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', isbn: '9788173711466', category: 'Biography', status: 'Overdue' },
  ],
  features: ['ISBN catalogue', 'Loan status tracking', 'Overdue follow-up', 'Archive controls'],
  recordActions: [
    { label: 'Mark available', patch: { status: 'Available' }, toast: 'Book marked available' },
    { label: 'Mark overdue', patch: { status: 'Overdue' }, toast: 'Overdue follow-up created' },
  ],
}

const LibraryPage = () => {
  return <PremiumWorkspace config={libraryConfig} />
}

export default LibraryPage
