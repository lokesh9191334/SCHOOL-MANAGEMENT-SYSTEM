export default function BrandMark({ size = 40, className = '', alt = 'SMS crest' }) {
  return (
    <img
      src="/brand/sms-mark.svg"
      width={size}
      height={size}
      alt={alt}
      className={`brand-mark ${className}`.trim()}
      draggable={false}
    />
  )
}
