import { useEffect } from 'react'

export function useCardPrint() {
  useEffect(() => {
    const reset = () => document.body.classList.remove('sidc-printing')
    window.addEventListener('afterprint', reset)
    return () => {
      window.removeEventListener('afterprint', reset)
      document.body.classList.remove('sidc-printing')
    }
  }, [])

  return (students) => {
    if (!students.length) return
    document.body.classList.add('sidc-printing')
    window.setTimeout(() => window.print(), 120)
  }
}
