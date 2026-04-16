import { FormEvent, useMemo, useState } from 'react';
import { FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { loginUser, registerUser } from '../services/authService';
import type { AuthMode } from '../types/auth';

interface AuthPageProps {
  mode: AuthMode;
  onNavigate: (path: string) => void;
}

function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const isLogin = mode === 'login';
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [surname, setSurname] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  const title = useMemo(() => {
    return isLogin ? 'Iniciar la sesión' : 'Crear una cuenta';
  }, [isLogin]);

  const subtitle = useMemo(() => {
    return isLogin
      ? 'Introduce tu correo electrónico para iniciar'
      : 'Introduce tu correo electrónico para registrarte en esta aplicación';
  }, [isLogin]);

  const legalText = 'Al hacer clic en continuar, aceptas nuestros Términos de Servicio y nuestra Política de Privacidad';

  const handleContinue = (event: FormEvent): void => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Introduce un correo electrónico.');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isLogin) {
        await loginUser(email.trim(), password);
        onNavigate('/');
        return;
      }

      await registerUser({
        name: name.trim(),
        surname: surname.trim(),
        username: username.trim(),
        email: email.trim(),
        password
      });

      onNavigate('/login');
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError('Ha ocurrido un error inesperado.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <button
          type="button"
          className="auth-brand"
          onClick={() => onNavigate('/')}
        >
          Trip2Guide
        </button>

        <section className="auth-card">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>

          {step === 1 ? (
            <form className="auth-form" onSubmit={handleContinue}>
              <input
                className="auth-input"
                type="email"
                placeholder="email@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />

              {error ? <p className="auth-error">{error}</p> : null}

              <button type="submit" className="auth-primary-button">
                Continuar
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <input
                className="auth-input"
                type="email"
                placeholder="email@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />

              {!isLogin ? (
                <>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Nombre"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="given-name"
                  />
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Apellidos"
                    value={surname}
                    onChange={(event) => setSurname(event.target.value)}
                    autoComplete="family-name"
                  />
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                  />
                </>
              ) : null}

              <input
                className="auth-input"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />

              {error ? <p className="auth-error">{error}</p> : null}

              <div className="auth-actions-row">
                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                  }}
                >
                  Atrás
                </button>

                <button
                  type="submit"
                  className="auth-primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Cargando...'
                    : isLogin
                      ? 'Iniciar sesión'
                      : 'Crear cuenta'}
                </button>
              </div>
            </form>
          )}

          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">o</span>
            <span className="auth-divider-line" />
          </div>

          <button type="button" className="auth-social-button">
            <FcGoogle className="auth-social-icon" />
            <span>Continuar con Google</span>
          </button>

          <button type="button" className="auth-social-button">
            <FaApple className="auth-social-icon auth-social-icon-apple" />
            <span>Continuar con Apple</span>
          </button>

          <p className="auth-legal-text">{legalText}</p>

          <div className="auth-switch">
            {isLogin ? (
              <>
                <span>¿No tienes cuenta?</span>
                <button type="button" onClick={() => onNavigate('/register')}>
                  Regístrate
                </button>
              </>
            ) : (
              <>
                <span>¿Ya tienes cuenta?</span>
                <button type="button" onClick={() => onNavigate('/login')}>
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;