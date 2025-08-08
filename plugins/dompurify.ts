import DOMPurify from 'isomorphic-dompurify'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      sanitize: (html: string) => {
        if (!html) return ''
        return DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        })
      }
    }
  }
})