import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { loginUser, registerUser } from '../../../services/authService';
import { routeDataProvider } from '../../../services/routeService';
import type { AuthMode } from '../../../types/auth';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

const PASSWORD_ERROR =
  'The password must have at least 6 characters, one uppercase letter, one number and one special character.';

const PASSWORD_CONFIRM_ERROR = 'Passwords do not match.';

interface AuthPageProps {
  mode: AuthMode;
  onNavigate: (path: string) => void;
}

function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const isLogin = mode === 'login';
  const redirectPath = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = (params.get('redirect') ?? '').trim();

    if (!redirect.startsWith('/')) {
      return '';
    }

    return redirect;
  }, []);

  const routeIdFromRedirect = useMemo(() => {
    if (!redirectPath.startsWith('/route.html')) {
      return '';
    }

    try {
      const redirectUrl = new URL(redirectPath, window.location.origin);
      return (redirectUrl.searchParams.get('id') ?? '').trim();
    } catch {
      return '';
    }
  }, [redirectPath]);

  const [routeNameFromRedirect, setRouteNameFromRedirect] = useState<string>('');
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [surname, setSurname] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  const title = useMemo(() => {
    return isLogin ? 'Sign in' : 'Create an account';
  }, [isLogin]);

  const subtitle = useMemo(() => {
    return isLogin
      ? 'Enter your email to continue'
      : 'Enter your email to sign up in this app';
  }, [isLogin]);

  const legalText =
    'By clicking continue, you agree to our Terms of Service and Privacy Policy.';

  useEffect(() => {
    if (!routeIdFromRedirect) {
      setRouteNameFromRedirect('');
      return;
    }

    let mounted = true;

    const loadRouteName = async (): Promise<void> => {
      try {
        const data = await routeDataProvider.getHomeData();
        const matchedRoute = data.routes.find((route) => route._id === routeIdFromRedirect);

        if (mounted) {
          setRouteNameFromRedirect(matchedRoute?.name ?? 'this route');
        }
      } catch {
        if (mounted) {
          setRouteNameFromRedirect('this route');
        }
      }
    };

    void loadRouteName();

    return () => {
      mounted = false;
    };
  }, [routeIdFromRedirect]);

  const handleContinue = (event: FormEvent): void => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (!isLogin && !PASSWORD_REGEX.test(password)) {
      setError(PASSWORD_ERROR);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError(PASSWORD_CONFIRM_ERROR);
      return;
    }

    setSubmitting(true);

    try {
      if (isLogin) {
        await loginUser(email.trim(), password);

        if (redirectPath) {
          window.location.href = redirectPath;
        } else {
          onNavigate('/');
        }

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
        setError('An unexpected error occurred.');
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

          {routeIdFromRedirect ? (
            <p className="auth-error auth-route-warning">
              Login to view {routeNameFromRedirect || 'this route'}.
            </p>
          ) : null}

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
                Continue
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
                    placeholder="First name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="given-name"
                  />

                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Last name"
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
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />

              {!isLogin ? (
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              ) : null}

              {error ? <p className="auth-error">{error}</p> : null}

              <div className="auth-actions-row">
                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setConfirmPassword('');
                  }}
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="auth-primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Loading...'
                    : isLogin
                      ? 'Sign in'
                      : 'Create account'}
                </button>
              </div>
            </form>
          )}

          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>

          <button type="button" className="auth-social-button">
            <FcGoogle className="auth-social-icon" />
            <span>Continue with Google</span>
          </button>

          <button type="button" className="auth-social-button">
            <FaApple className="auth-social-icon auth-social-icon-apple" />
            <span>Continue with Apple</span>
          </button>

          <p className="auth-legal-text">{legalText}</p>

          <div className="auth-switch">
            {isLogin ? (
              <>
                <span>Don&apos;t have an account?</span>
                <button type="button" onClick={() => onNavigate('/register')}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <button type="button" onClick={() => onNavigate('/login')}>
                  Sign in
                </button>
              </>
            )}
          </div>

          <button type="button" className="auth-main-page-button" onClick={() => onNavigate('/')}>
            Go to main page
          </button>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;