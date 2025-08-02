import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  // Return legal page URLs
  return [
    '/legal/privacy-policy',
    '/legal/terms-conditions',
    '/legal/dmca',
    '/legal/affiliate-disclosure',
  ]
})