require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

async function migrate() {
  console.log('Running migrations...');

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'sheet_row'
      ) THEN
        ALTER TABLE tasks ADD COLUMN sheet_row INTEGER;
      END IF;
    END $$
  `;
  console.log('  sheet_row: OK');

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'request_date'
      ) THEN
        ALTER TABLE tasks ADD COLUMN request_date DATE;
      END IF;
    END $$
  `;
  console.log('  request_date: OK');

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
      ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(100) UNIQUE;
      END IF;
    END $$
  `;
  console.log('  users.email: OK');

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'part'
      ) THEN
        ALTER TABLE tasks ADD COLUMN part VARCHAR(10);
      END IF;
    END $$
  `;
  console.log('  tasks.part: OK');

  console.log('Migration complete!');
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
