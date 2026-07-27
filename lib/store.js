const { sql } = require('./db');
const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

// ── Users ──

async function getUsers() {
  const { rows } = await sql`SELECT * FROM users ORDER BY id`;
  return rows;
}

async function getUserById(id) {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] || null;
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
           created_by AS "createdBy"
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
           created_by AS "createdBy"
    FROM tasks
    WHERE id = ${id}
  `;
  return rows[0] || null;
}

async function createTask({ title, description, assigneeId, assigneeName, priority, dueDate, createdBy }) {
  const id = generateId();
  const { rows } = await sql`
    INSERT INTO tasks (id, title, description, status, assignee_id, assignee_name, progress, priority, due_date, created_by)
    VALUES (${id}, ${title}, ${description || ''}, '대기', ${assigneeId || null}, ${assigneeName || null}, 0, ${priority || 'mid'}, ${dueDate || null}, ${createdBy})
    RETURNING id, title, description, status,
              assignee_id AS "assigneeId",
              assignee_name AS "assigneeName",
              progress, priority,
              due_date AS "dueDate",
              created_at AS "createdAt",
              created_by AS "createdBy"
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
        due_date = ${updated.dueDate}
    WHERE id = ${id}
    RETURNING id, title, description, status,
              assignee_id AS "assigneeId",
              assignee_name AS "assigneeName",
              progress, priority,
              due_date AS "dueDate",
              created_at AS "createdAt",
              created_by AS "createdBy"
  `;
  return rows[0] || null;
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
    SELECT * FROM users WHERE role IN ('팀장', '부팀장')
  `;
  return rows;
}

module.exports = {
  generateId,
  getUsers,
  getUserById,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getNotificationsByRecipient,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getLeaders,
};
