import { parse, format, formatDistanceToNowStrict } from 'date-fns'

export function parseFightDate(date: string): Date {
  const parsedDate = parse(date, 'MMM yy', new Date())
  return parsedDate
}

export function isValidDate(date: string) {
  try {
    format(date, 'MMMM dd, yyyy')
    return true
  } catch (error) {
    return false
  }
}

export function calculateAge(date: string) {
  try {
    const age = formatDistanceToNowStrict(date, {
      unit: 'year',
      addSuffix: false,
      roundingMethod: 'trunc',
    })

    return age
  } catch (error) {
    return 'N/A'
  }
}
