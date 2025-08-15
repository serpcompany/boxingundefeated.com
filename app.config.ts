export default defineAppConfig({
  ui: {
    colors: {
        primary: 'black',
        neutral: 'zinc',
        secondary: 'blue'
    },
  },
  uiPro: {
    user: {
        variants: {
            to: {
                true: {
                    avatar: 'group-hover/user:scale-100'
                }
            }
        }
    },
    pageHero: {
        slots: {
            container: 'py-16 sm:py-20 lg:py-24'
        }
    }
  },
  site: {
    url: 'https://boxingundefeated.com',
    name: 'Boxing Undefeated',
    description: 'Your comprehensive guide to professional boxing. Fighter profiles, weight divisions, and the sweet science.',
    defaultLocale: 'en',
    tagline: 'Keep swinging champ',
    copyright: '© Boxing Undefeated',
  },
})
