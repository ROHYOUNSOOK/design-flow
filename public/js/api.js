const API = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch('/api' + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '요청 실패');
    return data;
  },

  // Auth
  login(userId) { return this.request('POST', '/auth/login', { userId }); },
  logout() { return this.request('POST', '/auth/logout'); },
  me() { return this.request('GET', '/auth/me'); },

  // Users
  getUsers() { return this.request('GET', '/users'); },
  createUser(data) { return this.request('POST', '/users', data); },
  updateUser(id, data) { return this.request('PUT', '/users/' + id, data); },
  deleteUser(id) { return this.request('DELETE', '/users/' + id); },

  // Tasks
  getTasks() { return this.request('GET', '/tasks'); },
  createTask(data) { return this.request('POST', '/tasks', data); },
  updateTask(id, data) { return this.request('PUT', '/tasks/' + id, data); },
  deleteTask(id) { return this.request('DELETE', '/tasks/' + id); },
  startTask(id) { return this.request('PATCH', '/tasks/' + id + '/start'); },
  completeTask(id) { return this.request('PATCH', '/tasks/' + id + '/complete'); },
  updateProgress(id, progress) { return this.request('PATCH', '/tasks/' + id + '/progress', { progress }); },
  updateTaskStatus(id, status) { return this.request('PATCH', '/tasks/' + id + '/status', { status }); },

  // Notifications
  getNotifications() { return this.request('GET', '/notifications'); },
  markRead(id) { return this.request('PATCH', '/notifications/' + id + '/read'); },
  markAllRead() { return this.request('PATCH', '/notifications/read-all'); }
};
