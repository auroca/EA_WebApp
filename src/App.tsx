import { useMemo, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import './index.css';
import { loginUser, registerUser } from './services/authService';
import type { AuthMode, AuthUser } from './types/auth';

interface RegisterFormState {
  name: string;
  surname: string;
  username: string;
  email: string;
  password: string;
}

interface LoginFormState {
  email: string;
  password: string;
}

type AuthStep = 'email' | 'details';

const initialRegisterState: RegisterFormState = {
  name: '',
  surname: '',
  username: '',
  email: '',
  password: ''
};

const initialLoginState: LoginFormState = {
  email: '',
  password: ''
};

function App() {
  const [mode, setMode] = useState<AuthMode>('register');
  const [step, setStep] = useState<AuthStep>('email');
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(initialRegisterState);
  const [loginForm, setLoginForm] = useState<LoginFormState>(initialLoginState);
  const [message, setMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const screenText = useMemo(() => {
    if (mode === 'register') {
      return {
        title: 'Crear una cuenta',
        subtitle: 'Introduce tu correo electrónico para registrarte en esta aplicación',
        submitLabel: step === 'email' ? 'Continuar' : 'Crear cuenta'
      };
    }

    return {
      title: 'Iniciar la sesión',
      subtitle: 'Introduce tu correo electrónico para iniciar',
      submitLabel: step === 'email' ? 'Continuar' : 'Iniciar sesión'
    };
  }, [mode, step]);

  const resetMessages = (): void => {
    setMessage('');
    setErrorMessage('');
  };

  const switchMode = (nextMode: AuthMode): void => {
    setMode(nextMode);
    setStep('email');
    setRegisterForm(initialRegisterState);
    setLoginForm(initialLoginState);
    resetMessages();
  };

  const handleRegisterChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;

    setRegisterForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;

    setLoginForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContinue = (): void => {
    resetMessages();

    if (mode === 'register' && !registerForm.email.trim()) {
      setErrorMessage('Introduce un email válido.');
      return;
    }

    if (mode === 'login' && !loginForm.email.trim()) {
      setErrorMessage('Introduce un email válido.');
      return;
    }

    setStep('details');
  };

  const handleSubmit = async (): Promise<void> => {
    resetMessages();
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        if (
          !registerForm.name.trim() ||
          !registerForm.surname.trim() ||
          !registerForm.username.trim() ||
          !registerForm.email.trim() ||
          !registerForm.password.trim()
        ) {
          throw new Error('Completa todos los campos del registro.');
        }

        const createdUser = await registerUser({
          name: registerForm.name.trim(),
          surname: registerForm.surname.trim(),
          username: registerForm.username.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password
        });

        setMessage(`El usuario ${createdUser.name} se ha registrado correctamente.`);
        setRegisterForm(initialRegisterState);
        setStep('email');
        return;
      }

      if (!loginForm.email.trim() || !loginForm.password.trim()) {
        throw new Error('Completa email y contraseña.');
      }

      const loginResult = await loginUser(loginForm.email.trim(), loginForm.password);

      setCurrentUser(loginResult.user);
      setMessage(`El usuario ${loginResult.user.name} ha iniciado sesión correctamente.`);
      setLoginForm(initialLoginState);
      setStep('email');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Ha ocurrido un error inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMainButtonClick = async (): Promise<void> => {
    if (step === 'email') {
      handleContinue();
      return;
    }

    await handleSubmit();
  };

  const currentEmailValue = mode === 'register' ? registerForm.email : loginForm.email;
  const currentEmailOnChange = mode === 'register' ? handleRegisterChange : handleLoginChange;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="brand-title">Trip2Guide</h1>

        <div className="auth-box">
          <div className="heading-block">
            <h2>{screenText.title}</h2>
            <p>{screenText.subtitle}</p>
          </div>

          {step === 'email' ? (
            <input
              className="auth-input"
              type="email"
              name="email"
              placeholder="email@domain.com"
              value={currentEmailValue}
              onChange={currentEmailOnChange}
            />
          ) : mode === 'register' ? (
            <div className="stack-fields">
              <input
                className="auth-input"
                type="text"
                name="name"
                placeholder="Nombre"
                value={registerForm.name}
                onChange={handleRegisterChange}
              />
              <input
                className="auth-input"
                type="text"
                name="surname"
                placeholder="Apellidos"
                value={registerForm.surname}
                onChange={handleRegisterChange}
              />
              <input
                className="auth-input"
                type="text"
                name="username"
                placeholder="Nombre de usuario"
                value={registerForm.username}
                onChange={handleRegisterChange}
              />
              <input
                className="auth-input"
                type="password"
                name="password"
                placeholder="Contraseña"
                value={registerForm.password}
                onChange={handleRegisterChange}
              />
            </div>
          ) : (
            <div className="stack-fields">
              <input
                className="auth-input"
                type="password"
                name="password"
                placeholder="Contraseña"
                value={loginForm.password}
                onChange={handleLoginChange}
              />
            </div>
          )}

          <button
            className="primary-button"
            type="button"
            onClick={handleMainButtonClick}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Procesando...' : screenText.submitLabel}
          </button>

          <div className="divider">
            <span className="line" />
            <span className="divider-text">o</span>
            <span className="line" />
          </div>

          <div className="social-buttons">
            <button type="button" className="social-button" disabled>
              <FcGoogle size={20} />
              <span>Continuar con Google</span>
            </button>

            <button type="button" className="social-button" disabled>
              <FaApple size={20} />
              <span>Continuar con Apple</span>
            </button>
          </div>

          <p className="legal-text">
            Al hacer clic en continuar, aceptas nuestros <strong>Términos de Servicio</strong> y
            nuestra <strong>Política de Privacidad</strong>
          </p>

          <div className="bottom-switch">
            <button
              type="button"
              className={mode === 'register' ? 'switch-link active' : 'switch-link'}
              onClick={() => switchMode('register')}
            >
              Register
            </button>

            <button
              type="button"
              className={mode === 'login' ? 'switch-link active' : 'switch-link'}
              onClick={() => switchMode('login')}
            >
              Login
            </button>
          </div>

          {currentUser ? (
            <div className="feedback success">
              Sesión activa: {currentUser.name} ({currentUser.email})
            </div>
          ) : null}

          {message ? <div className="feedback success">{message}</div> : null}
          {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
        </div>
      </section>
    </main>
  );
}

export default App;