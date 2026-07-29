(async function() {
  // 이미 로그인되어 있으면 보드로 이동
  try {
    await API.me();
    location.href = '/board.html';
    return;
  } catch {}

  const errorEl = document.getElementById('loginError');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  // Google Client ID 가져오기
  let clientId;
  try {
    const config = await API.getAuthConfig();
    clientId = config.googleClientId;
  } catch {
    showError('서버 설정을 불러올 수 없습니다.');
    return;
  }

  if (!clientId) {
    showError('Google 로그인이 설정되지 않았습니다.');
    return;
  }

  // Google Identity Services 로드
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = function() {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
    });

    google.accounts.id.renderButton(
      document.getElementById('googleLoginBtn'),
      {
        theme: 'outline',
        size: 'large',
        width: 300,
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      }
    );
  };
  document.head.appendChild(script);

  async function handleCredentialResponse(response) {
    errorEl.style.display = 'none';
    try {
      await API.googleLogin(response.credential);
      location.href = '/board.html';
    } catch (e) {
      showError(e.message);
    }
  }
})();
