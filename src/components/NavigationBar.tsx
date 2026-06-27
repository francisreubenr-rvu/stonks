import { useEffect, useState } from 'react'

interface Props {
  loading: boolean
}

export function NavigationBar({ loading }: Props) {
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (loading) {
      setVisible(true)
      setWidth(0)
      const t1 = setTimeout(() => setWidth(30), 50)
      const t2 = setTimeout(() => setWidth(65), 300)
      const t3 = setTimeout(() => setWidth(85), 1000)
      const t4 = setTimeout(() => setWidth(95), 2500)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
    } else {
      setWidth(100)
      const t = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-transparent pointer-events-none">
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${width}%`,
          background: 'linear-gradient(90deg, var(--primary), #6EE7B7)',
          boxShadow: '0 0 6px rgba(52, 211, 153, 0.4)',
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  )
}
