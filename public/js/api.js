const API = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch('/api' + path, opts);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(res.ok ? '서버 응답 오류' : `서버 오류 (${res.status})`);
    }
    if (!res.ok) throw new Error(data.error || '요청 실패');
    return data;
  },

  // Auth
  login(email) { return this.request('POST', '/auth/login', { email }); },
  logout() { return this.request('POST', '/auth/logout'); },
  me() { return this.request('GET', '/auth/me'); },

  // Users
  getUsers() { return this.request('GET', '/users'); },
  createUser(data) { return this.request('POST', '/users', data); },
  updateUser(id, data) { return this.request('PUT', '/users/' + id, data); },
  deleteUser(id) { return this.request('DELETE', '/users/' + id); },
  approveUser(id) { return this.request('PATCH', '/users/' + id + '/approve'); },

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
