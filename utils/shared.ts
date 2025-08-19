import { parse } from "date-fns"

export function parseFightDate(date: string): Date {
  const parsedDate = parse(date, 'MMM yy', new Date());
  return parsedDate
}
