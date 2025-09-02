# README

## Sitemap

- /
- /about
- /boxers
- /boxers/[slug].vue
- /divisions
- /divisions/[slug]
- /legal/affiliate-disclosure/
- /legal/privacy-policy/
- /legal/terms-conditions/
- /legal/dmca/


## Development Database (NuxtHub D1 Local)

### READ THIS DOCUMENTATION:

- https://developers.cloudflare.com/d1/best-practices/local-development/
- https://developers.cloudflare.com/pages/framework-guides/deploy-a-nuxt-site/
- https://orm.drizzle.team/docs/drizzle-config-file
- https://orm.drizzle.team/docs/connect-overview
- https://hub.nuxt.com/docs/features/database
- https://hub.nuxt.com/docs/recipes/drizzle
- https://hub.nuxt.com/docs/recipes/cloudflare-access

NuxtHub creates and manages its own local D1 database in `.data/hub/d1/`. This is the database your app uses during development.


### How to reset and reseed your database in your setup:

1. Delete the SQLite file:
    ```
    rm ./.data/hub/d1/miniflare-D1DatabaseObject/7b8799eb95f0bb5448e259812996a461ce40142dacbdea254ea597e307767f45.sqlite
    ```

2. Run Drizzle migrations:
    ```
    pnpm db:migrate
    ```

3. Start your development server:
    ```
    pnpm dev
    ```

4. Once the server is running, open your application in the browser.
   At the bottom of the page, you’ll see the Nuxt DevTools panel.

5. In Nuxt DevTools, navigate to the **Server Tasks** section.

6. Find and run the `seed` task to populate your database.

(Make sure your .env or .env.local has the correct DRIZZLE_DB_URL.)
# Force rebuild Fri Aug  1 18:26:58 PDT 2025

To reseed the database, first ensure you have the variables `LIBSQL_CONNECTION_URL` and `LIBSQL_AUTH_TOKEN` in your `.env`; then run:
```
pnpm db:sync:staging
```