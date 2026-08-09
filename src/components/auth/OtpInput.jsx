import { useEffect, useRef, useState } from 'react'

export default function OtpInput({ value, onChange, length = 6, disabled = false }) {
  const digits = Array.from({ length }, (_, i) => value[i] || '')
  const refs = useRef([])

  useEffect(() => {
    refs.current = refs.current.slice(0, length)
  }, [length])

  const emit = (nextDigits) => {
    onChange(nextDigits.join('').slice(0, length))
  }

  const handleChange = (index, raw) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      const next = [...digits]
      next[index] = ''
      emit(next)
      return
    }

    const chars = cleaned.split('')
    const next = [...digits]
    let cursor = index
    chars.forEach((ch) => {
      if (cursor < length) {
        next[cursor] = ch
        cursor += 1
      }
    })
    emit(next)
    const focusIndex = Math.min(cursor, length - 1)
    refs.current[focusIndex]?.focus()
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    const next = Array.from({ length }, (_, i) => pasted[i] || '')
    emit(next)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="otp-input-row" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          className="otp-box"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
