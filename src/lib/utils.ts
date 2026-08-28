import { useEffect, useState, createElement } from 'react'

/**
 * Format a static YYYY-MM-DD date string without using timezone conversions,
 * preventing hydration mismatch errors between server and client.
 */
export function formatStaticDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length !== 3) return dateStr
  const [year, month, day] = parts
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  const monthIdx = parseInt(month, 10) - 1
  const formattedMonth = monthNames[monthIdx] || month
  return `${formattedMonth} ${parseInt(day, 10)}, ${year}`
}

interface ClientFeedbackTimeProps {
  isoString: string
  dateOnly?: boolean
}

/**
 * A client-side component to safely format timestamps into the local timezone
 * only after mounting, avoiding server-client hydration mismatch.
 */
export function ClientFeedbackTime({ isoString, dateOnly = false }: ClientFeedbackTimeProps) {
  const [formatted, setFormatted] = useState('')

  useEffect(() => {
    if (!isoString) return
    const date = new Date(isoString)
    const dateStr = date.toLocaleDateString()
    let result = dateStr
    if (!dateOnly) {
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      result = `${dateStr} at ${timeStr}`
    }
    Promise.resolve().then(() => {
      setFormatted(result)
    })
  }, [isoString, dateOnly])

  return createElement('span', null, formatted || '...')
}
