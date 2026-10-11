/**
 * Typography for the legal pages, from the theme tokens. The site has no typography plugin, so
 * `prose` classes would leave the headings unstyled. Headings match the other pages' sizes.
 */
export const legalTypography = [
  'leading-7',
  '[&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight',
  // The "Last updated" line under the title.
  '[&_h1+p]:mt-2 [&_h1+p]:text-sm [&_h1+p]:text-muted-foreground',
  '[&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight',
  '[&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight',
  '[&_p]:mt-4',
  '[&_ol]:mt-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:mt-4 [&_ul]:ml-6 [&_ul]:list-disc [&_li]:mt-2'
].join(' ')
