(function () {
  const modal = document.getElementById('userModal');
  const closeBtn = document.getElementById('userModalClose');
  const saveBtn = document.getElementById('userSaveBtn');
  const nameInput = document.getElementById('userNameInput');
  const roleInput = document.getElementById('userRoleInput');
  const avatarInput = document.getElementById('userAvatarInput');
  const editIdInput = document.getElementById('editUserId');
  const tbody = document.getElementById('userTableBody');
  const manageBtn = document.getElementById('manageUsersBtn');

  function openModal() {
    modal.classList.add('active');
    resetForm();
    renderUserList();
  }

  function closeModal() {
    modal.classList.remove('active');
    resetForm();
  }

  function resetForm() {
    editIdInput.value = '';
    nameInput.value = '';
    roleInput.value = '팀원';
    avatarInput.value = '#6C5CE7';
    saveBtn.textContent = '추가';
  }

  async function renderUserList() {
    try {
      const users = await API.getUsers();
      tbody.innerHTML = '';
      users.forEach(function (u) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td><div class="user-avatar" style="background:' + u.avatar + ';width:28px;height:28px;font-size:12px;">' + u.name[0] + '</div></td>' +
          '<td>' + u.name + '</td>' +
          '<td><span class="role-badge">' + u.role + '</span></td>' +
          '<td>' +
            '<button class="btn-user-edit" data-id="' + u.id + '">수정</button>' +
            '<button class="btn-user-delete" data-id="' + u.id + '">삭제</button>' +
          '</td>';
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-user-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var user = users.find(function (u) { return u.id === btn.dataset.id; });
          if (user) {
            editIdInput.value = user.id;
            nameInput.value = user.name;
            roleInput.value = user.role;
            avatarInput.value = user.avatar;
            saveBtn.textContent = '수정';
          }
        });
      });

      tbody.querySelectorAll('.btn-user-delete').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('정말 삭제하시겠습니까?')) return;
          try {
            await API.deleteUser(btn.dataset.id);
            renderUserList();
            loadBoard();
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  saveBtn.addEventListener('click', async function () {
    var name = nameInput.value.trim();
    var role = roleInput.value;
    var avatar = avatarInput.value;

    if (!name) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      if (editIdInput.value) {
        await API.updateUser(editIdInput.value, { name: name, role: role, avatar: avatar });
      } else {
        await API.createUser({ name: name, role: role, avatar: avatar });
      }
      resetForm();
      renderUserList();
      loadBoard();
    } catch (err) {
      alert(err.message);
    }
  });

  manageBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
})();
