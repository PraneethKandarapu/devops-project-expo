document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('rupee_token');
  if (token) {
    window.location.href = '/';
  }

  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabSignupBtn = document.getElementById('tab-signup-btn');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const alertBox = document.getElementById('auth-alert');

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.style.display = 'block';
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }

  tabLoginBtn.addEventListener('click', () => {
    hideAlert();
    tabLoginBtn.classList.add('active');
    tabSignupBtn.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
  });

  tabSignupBtn.addEventListener('click', () => {
    hideAlert();
    tabSignupBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
  });

  // Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('rupee_token', data.token);
      localStorage.setItem('rupee_user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err) {
      showAlert(err.message);
    }
  });

  // // Signup Submit
  // signupForm.addEventListener('submit', async (e) => {
  //   e.preventDefault();
  //   hideAlert();

  //   const name = document.getElementById('signup-name').value.trim();
  //   const email = document.getElementById('signup-email').value.trim();
  //   const institution = document.getElementById('signup-institution').value.trim();
  //   const password = document.getElementById('signup-password').value;

  //   try {
  //     const res = await fetch('/api/auth/register', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ name, email, password, institution }),
  //     });

  //     const data = await res.json();
  //     if (!res.ok) {
  //       throw new Error(data.message || 'Signup failed');
  //     }

  //     localStorage.setItem('rupee_token', data.token);
  //     localStorage.setItem('rupee_user', JSON.stringify(data.user));
  //     window.location.href = '/';
  //   } catch (err) {
  //     showAlert(err.message);
  //   }
  // });
  // Signup Submit
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      localStorage.setItem('rupee_token', data.token);
      localStorage.setItem('rupee_user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err) {
      showAlert(err.message);
    }
  });
});