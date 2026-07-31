const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

async function seed() {
  console.log('Creating tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(20) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      role VARCHAR(20) NOT NULL,
      avatar VARCHAR(10) NOT NULL,
      email VARCHAR(100) UNIQUE,
      approved BOOLEAN DEFAULT TRUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(20) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT DEFAULT '',
      status VARCHAR(10) NOT NULL DEFAULT '대기',
      assignee_id VARCHAR(20) REFERENCES users(id) ON DELETE SET NULL,
      assignee_name VARCHAR(50),
      progress INTEGER NOT NULL DEFAULT 0,
      priority VARCHAR(10) NOT NULL DEFAULT 'mid',
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by VARCHAR(20) REFERENCES users(id),
      sheet_row INTEGER,
      request_date DATE,
      part VARCHAR(10)
    )
  `;

  // 기존 테이블에 신규 컬럼이 없으면 추가
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'sheet_row'
      ) THEN
        ALTER TABLE tasks ADD COLUMN sheet_row INTEGER;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'request_date'
      ) THEN
        ALTER TABLE tasks ADD COLUMN request_date DATE;
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(20) PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      recipient_id VARCHAR(20) NOT NULL REFERENCES users(id),
      task_id VARCHAR(20) REFERENCES tasks(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log('Tables created.');

  console.log('Seeding users...');

  const users = [
    { id: 'admin1', name: '김관리', role: '관리자', avatar: '#6C5CE7' },
    { id: 'member1', name: '박디자이너', role: '팀원', avatar: '#00B894' },
    { id: 'member2', name: '이디자이너', role: '팀원', avatar: '#FDCB6E' },
    { id: 'member3', name: '최디자이너', role: '팀원', avatar: '#E17055' },
    { id: 'vice1', name: '정부팀장', role: '부팀장', avatar: '#0984E3' },
    { id: 'leader1', name: '한파트장', role: '파트장', avatar: '#D63031' },
  ];

  for (const u of users) {
    await sql`
      INSERT INTO users (id, name, role, avatar)
      VALUES (${u.id}, ${u.name}, ${u.role}, ${u.avatar})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
