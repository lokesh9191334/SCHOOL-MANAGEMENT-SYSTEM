export const CURRENCY_STORAGE_KEY = 'sms_currency'

export const CURRENCIES = [
  { value: 'INR', symbol: '₹', label: 'Rupee (INR)', word: 'Rupees' },
  { value: 'USD', symbol: '$', label: 'Dollar (USD)', word: 'Dollars' },
]

export function getCurrency() {
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) === 'USD' ? 'USD' : 'INR'
  } catch {
    return 'INR'
  }
}

export function currentCurrency() {
  return CURRENCIES.find((entry) => entry.value === getCurrency()) || CURRENCIES[0]
}

export function currencySymbol() {
  return currentCurrency().symbol
}

export function currencyWord() {
  return currentCurrency().word
}

export function setCurrency(value) {
  const next = value === 'USD' ? 'USD' : 'INR'
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, next)
  } catch {
    /* storage blocked */
  }
  return next
}

export function formatMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return `${currencySymbol()}${amount.toLocaleString('en-IN')}`
}
