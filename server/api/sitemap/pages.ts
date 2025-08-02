import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  // Return main static page URLs (legal pages handled separately)
  return [
    '/',
    '/about',
    '/boxers',
    '/divisions',
  ]
})