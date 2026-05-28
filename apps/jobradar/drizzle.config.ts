import { defineConfig } from 'drizzle-kit'
import { join } from 'path'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.JOBRADAR_DB_PATH ?? join(process.cwd(), '.data', 'jobradar.db'),
  },
})
