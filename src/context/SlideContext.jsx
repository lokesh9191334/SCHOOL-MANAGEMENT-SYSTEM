import { createContext, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export const SlideContext = createContext({ getNextSlideIndex: () => 0 })

export const SlideProvider = ({ children }) => {
  const location = useLocation()
  const slideIndexRef = useRef(0)

  useEffect(() => {
    slideIndexRef.current = 0
  }, [location.key])

  const getNextSlideIndex = () => {
    slideIndexRef.current += 1
    return slideIndexRef.current
  }

  return (
    <SlideContext.Provider value={{ getNextSlideIndex }}>
      {children}
    </SlideContext.Provider>
  )
}

export default SlideProvider
