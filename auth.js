(() => {
  const ready = () =>
    window.supabase &&
    window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.startsWith('COLE_AQUI') &&
    !window.SUPABASE_ANON_KEY.startsWith('COLE_AQUI');

  if (!ready()) {
    window.rcSupabase = null;
    console.error('Supabase não configurado. Confira o arquivo config.js.');
    return;
  }

  const sb = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  window.rcSupabase = sb;

  // Busca a função do usuário na tabela profiles.
  async function getUserProfile(userId) {
    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, role, active')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao consultar perfil:', error);
      return { profile: null, error };
    }

    return { profile: data, error: null };
  }

  // LOGIN
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const msg = document.getElementById('login-error');
      const button = loginForm.querySelector('button');

      msg.textContent = '';
      if (button) button.disabled = true;

      try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const { data, error } = await sb.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          msg.textContent = 'Não foi possível entrar. Confira e-mail e senha.';
          return;
        }

        const { profile, error: profileError } =
          await getUserProfile(data.user.id);

        if (profileError || !profile || !profile.active) {
          await sb.auth.signOut();
          msg.textContent =
            'Perfil não encontrado ou inativo. Solicite ao administrador.';
          return;
        }

        if (profile.role === 'admin') {
          window.location.href = 'admin.html';
          return;
        }

        if (profile.role === 'barber') {
          const { data: barber, error: barberError } = await sb
            .from('barbers')
            .select('id')
            .eq('profile_id', data.user.id)
            .eq('active', true)
            .maybeSingle();

          if (barberError || !barber) {
            await sb.auth.signOut();
            msg.textContent =
              'Sua conta ainda não está vinculada a um barbeiro ativo.';
            return;
          }

          window.location.href = 'painel.html';
          return;
        }

        await sb.auth.signOut();
        msg.textContent = 'Seu perfil não tem uma função de acesso válida.';
      } catch (err) {
        console.error('Erro no login:', err);
        msg.textContent = 'Ocorreu um erro ao entrar. Tente novamente.';
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  // SAIR DA CONTA
  const logout = document.getElementById('logout');

  if (logout) {
    logout.addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // PROTEÇÃO DAS PÁGINAS INTERNAS
  window.rcRequireUser = async (adminOnly = false) => {
    const {
      data: { user },
      error: authError
    } = await sb.auth.getUser();

    if (authError || !user) {
      window.location.href = 'login.html';
      return null;
    }

    const { profile, error: profileError } =
      await getUserProfile(user.id);

    if (profileError || !profile || !profile.active) {
      await sb.auth.signOut();
      window.location.href = 'login.html';
      return null;
    }

    if (adminOnly) {
      if (profile.role !== 'admin') {
        document.body.innerHTML = `
          <main style="padding:40px;color:#eee;font-family:Arial">
            <h1>Acesso negado</h1>
            <p>Esta área é exclusiva do administrador.</p>
            <a href="login.html">Voltar ao login</a>
          </main>
        `;
        return null;
      }

      return { user, profile, role: 'admin' };
    }

    if (profile.role === 'admin') {
      window.location.href = 'admin.html';
      return null;
    }

    if (profile.role !== 'barber') {
      await sb.auth.signOut();
      window.location.href = 'login.html';
      return null;
    }

    const { data: barber, error: barberError } = await sb
      .from('barbers')
      .select('id, name, specialty, photo, active, profile_id')
      .eq('profile_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (barberError || !barber) {
      await sb.auth.signOut();
      window.location.href = 'login.html';
      return null;
    }

    return { user, profile, barber, role: 'barber' };
  };
})();