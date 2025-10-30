document.addEventListener('DOMContentLoaded', () => {
  const toastErro = new bootstrap.Toast(document.getElementById("toastErro"));
  const toastMsg = document.getElementById("toastErroMensagem");

  function mostrarToast(mensagem) {
    toastMsg.textContent = mensagem;
    toastErro.show();
  }

  // Bloco de código para o LOGIN DO CLIENTE (já existente)
  const loginForm = document.querySelector('form[action="/login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = new FormData(loginForm);
      const body = Object.fromEntries(dados);

      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok) {
        window.location.href = result.redirectTo || '/';
      } else {
        mostrarToast(result.erro || "Erro inesperado.");
      }
    });
  }

  // --- NOVO BLOCO DE CÓDIGO PARA O LOGIN DO ADMIN ---
  const adminLoginForm = document.querySelector('form[action="/admin/login"]');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = new FormData(adminLoginForm);
      const body = Object.fromEntries(dados);

      const res = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok) {
        // Redireciona para o painel de admin por padrão se tudo der certo
        window.location.href = result.redirectTo || '/admin/painel';
      } else {
        mostrarToast(result.erro || "Erro inesperado.");
      }
    });
  }
  // --- FIM DO NOVO BLOCO ---

  // Bloco de código para o REGISTRO (já existente)
  const registerForm = document.querySelector('form[action="/register"]');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const senha = registerForm.querySelector('input[name="senha"]').value;
      const confirmar = registerForm.querySelector('input[name="confirmar"]').value;

      if (senha !== confirmar) {
        return mostrarToast('As senhas não coincidem!');
      }

      const dados = new FormData(registerForm);
      const body = Object.fromEntries(dados);

      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok) {
        window.location.href = '/login';
      } else {
        mostrarToast(result.erro || "Erro inesperado.");
      }
    });
  }
});