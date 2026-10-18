/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from './translations'

export const LANGUAGE_STORAGE_KEY = 'sms_language'

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
]

const defaultContext = {
  language: 'en',
  locale: 'en-IN',
  setLanguage: () => {},
  t: (text) => text,
}

const I18nContext = createContext(defaultContext)

function readLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'hi' ? 'hi' : 'en'
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(readLanguage)

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
  }, [language])

  const setLanguage = useCallback((next) => {
    const value = next === 'hi' ? 'hi' : 'en'
    setLanguageState(value)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, value)
    } catch {
      /* storage blocked */
    }
  }, [])

  const t = useCallback(
    (text, vars) => {
      const source = String(text ?? '')
      let output = language === 'hi' ? translations.hi[source] || source : source
      if (vars) {
        output = output.replace(/\{(\w+)\}/g, (match, key) =>
          Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
        )
      }
      return output
    },
    [language],
  )

  const value = useMemo(
    () => ({
      language,
      locale: language === 'hi' ? 'hi-IN' : 'en-IN',
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
