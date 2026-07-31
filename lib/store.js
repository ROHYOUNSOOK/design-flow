const { sql } = require('./db');
const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

// ── Migration ──

async function migrateApprovedColumn() {
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'approved'
      ) THEN
        ALTER TABLE users ADD COLUMN approved BOOLEAN DEFAULT TRUE;
      END IF;
    END $$
  `;
}

// 앱 시작 시 마이그레이션 실행
migrateApprovedColumn().catch(err => console.error('Migration error:', err));

// ── Users ──

async function getUsers() {
  const { rows } = await sql`SELECT id, name, role, avatar, email, approved FROM users ORDER BY id`;
  return rows;
}

async function getUserById(id) {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] || null;
}

async function getUserByEmail(email) {
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
  return rows[0] || null;
}

async function createUser({ id, name, role, avatar, email, approved }) {
  const userId = id || generateId();
  const approvedVal = approved !== undefined ? approved : true;
  const { rows } = await sql`
    INSERT INTO users (id, name, role, avatar, email, approved)
    VALUES (${userId}, ${name}, ${role}, ${avatar}, ${email || null}, ${approvedVal})
    RETURNING *
  `;
  return rows[0];
}

async function updateUser(id, fields) {
  const user = await getUserById(id);
  if (!user) return null;
  const updated = { ...user, ...fields };
  const { rows } = await sql`
    UPDATE users
    SET name = ${updated.name}, role = ${updated.role}, avatar = ${updated.avatar}, email = ${updated.email || null}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] || null;
}

async function deleteUser(id) {
  const { rowCount } = await sql`DELETE FROM users WHERE id = ${id}`;
  return rowCount > 0;
}

// ── Tasks ──

async function getTasks() {
  const { rows } = await sql`
    SELECT id, title, description, status,
           assignee_id AS "assigneeId",
           assignee_name AS "assigneeName",
           progress, priority,
           due_date AS "dueDate",
           created_at AS "createdAt",
           created_by AS "createdBy",
           sheet_row AS "sheetRow",
           request_date AS "requestDate",
           part
    FROM tasks
    ORDER BY created_at DESC
  `;
  return rows;
}

async function getTaskById(id) {
  const { rows } = await sql`
    SELECT id, title, description, status,
           assignee_id AS "assigneeId",
           assignee_name AS "assigneeName",
           progress, priority,
           due_date AS "dueDate",
           created_at AS "createdAt",
           created_by AS "createdBy",
           sheet_row AS "sheetRow",
           request_date AS "requestDate",
           part
    FROM tasks
    WHERE id = ${id}
  `;
  return rows[0] || null;
}

async function createTask({ title, description, assigneeId, assigneeName, priority, dueDate, createdBy, status, progress, sheetRow, requestDate, part }) {
  const id = generateId();
  const { rows } = await sql`
    INSERT INTO tasks (id, title, description, status, assignee_id, assignee_name, progress, priority, due_date, created_by, sheet_row, request_date, part)
    VALUES (${id}, ${title}, ${description || ''}, ${status || '대기'}, ${assigneeId || null}, ${assigneeName || null}, ${progress || 0}, ${priority || 'mid'}, ${dueDate || null}, ${createdBy || null}, ${sheetRow || null}, ${requestDate || null}, ${part || null})
    RETURNING id, title, description, status,
              assignee_id AS "assigneeId",
              assignee_name AS "assigneeName",
              progress, priority,
              due_date AS "dueDate",
              created_at AS "createdAt",
              created_by AS "createdBy",
              sheet_row AS "sheetRow",
              request_date AS "requestDate",
              part
  `;
  return rows[0];
}

async function updateTask(id, fields) {
  // Build SET clause dynamically
  const task = await getTaskById(id);
  if (!task) return null;

  const updated = { ...task, ...fields };

  const { rows } = await sql`
    UPDATE tasks
    SET title = ${updated.title},
        description = ${updated.description},
        status = ${updated.status},
        assignee_id = ${updated.assigneeId},
        assignee_name = ${updated.assigneeName},
        progress = ${updated.progress},
        priority = ${updated.priority},
        due_date = ${updated.dueDate},
        sheet_row = ${updated.sheetRow || null},
        request_date = ${updated.requestDate || null},
        part = ${updated.part || null}
    WHERE id = ${id}
    RETURNING id, title, description, status,
              assignee_id AS "assigneeId",
              assignee_name AS "assigneeName",
              progress, priority,
              due_date AS "dueDate",
              created_at AS "createdAt",
              created_by AS "createdBy",
              sheet_row AS "sheetRow",
              request_date AS "requestDate",
              part
  `;
  return rows[0] || null;
}

async function getTaskBySheetRow(sheetRow, part) {
  const { rows } = await sql`
    SELECT id, title, description, status,
           assignee_id AS "assigneeId",
           assignee_name AS "assigneeName",
           progress, priority,
           due_date AS "dueDate",
           created_at AS "createdAt",
           created_by AS "createdBy",
           sheet_row AS "sheetRow",
           request_date AS "requestDate",
           part
    FROM tasks
    WHERE sheet_row = ${sheetRow} AND part = ${part}
  `;
  return rows[0] || null;
}

async function getTasksByMonth(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const { rows } = await sql`
    SELECT id, title, description, status,
           assignee_id AS "assigneeId",
           assignee_name AS "assigneeName",
           progress, priority,
           due_date AS "dueDate",
           created_at AS "createdAt",
           created_by AS "createdBy",
           sheet_row AS "sheetRow",
           request_date AS "requestDate",
           part
    FROM tasks
    WHERE request_date >= ${startDate}::date AND request_date < ${endDate}::date
    ORDER BY request_date ASC, created_at DESC
  `;
  return rows;
}

async function getMaxSheetRow(part) {
  const { rows } = await sql`
    SELECT MAX(sheet_row) AS "maxSheetRow"
    FROM tasks
    WHERE part = ${part} AND sheet_row IS NOT NULL
  `;
  return rows[0]?.maxSheetRow || null;
}

async function deleteTask(id) {
  const { rowCount } = await sql`DELETE FROM tasks WHERE id = ${id}`;
  return rowCount > 0;
}

// ── Notifications ──

async function getNotificationsByRecipient(recipientId) {
  const { rows } = await sql`
    SELECT id, type,
           recipient_id AS "recipientId",
           task_id AS "taskId",
           message, read,
           created_at AS "createdAt"
    FROM notifications
    WHERE recipient_id = ${recipientId}
    ORDER BY created_at DESC
  `;
  return rows;
}

async function createNotification({ type, recipientId, taskId, message }) {
  const id = generateId();
  await sql`
    INSERT INTO notifications (id, type, recipient_id, task_id, message)
    VALUES (${id}, ${type}, ${recipientId}, ${taskId}, ${message})
  `;
}

async function markNotificationRead(id) {
  const { rows } = await sql`
    UPDATE notifications SET read = TRUE WHERE id = ${id}
    RETURNING id, type,
              recipient_id AS "recipientId",
              task_id AS "taskId",
              message, read,
              created_at AS "createdAt"
  `;
  return rows[0] || null;
}

async function markAllNotificationsRead(recipientId) {
  await sql`
    UPDATE notifications SET read = TRUE WHERE recipient_id = ${recipientId}
  `;
}

async function getLeaders() {
  const { rows } = await sql`
    SELECT * FROM users WHERE role IN ('파트장', '부팀장')
  `;
  return rows;
}

async function approveUser(id) {
  const { rows } = await sql`
    UPDATE users SET approved = TRUE WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] || null;
}

module.exports = {
  generateId,
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getTasks,
  getTaskById,
  getTaskBySheetRow,
  getMaxSheetRow,
  getTasksByMonth,
  createTask,
  updateTask,
  deleteTask,
  getNotificationsByRecipient,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getLeaders,
  approveUser,
};
