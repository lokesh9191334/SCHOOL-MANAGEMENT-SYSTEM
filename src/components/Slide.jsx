import { useContext, useEffect, useRef, useState } from 'react'
import { SlideContext } from '../context/SlideContext'
import './Slide.css'

const Slide = ({ children, className = '' }) => {
  const { getNextSlideIndex } = useContext(SlideContext)
  const [myIndex] = useState(() => getNextSlideIndex())
  const [isVisible, setIsVisible] = useState(false)
  const slideRef = useRef(null)

  useEffect(() => {
    const node = slideRef.current

    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={slideRef}
      className={`slide-root ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{ '--slide-delay': `${Math.max(myIndex - 1, 0) * 90}ms` }}
    >
      {children}
    </div>
  )
}

export default Slide
