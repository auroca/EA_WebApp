import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import {
  getGoogleClientId,
  loginUser,
  loginWithGoogle,
  registerUser
} from '../../../services/authService';
import { routeDataProvider } from '../../../services/routeService';
import type { AuthMode } from '../../../types/auth';
import { useLanguage } from '../../../i18n/LanguageContext';

declare global {
  interface Window {
    google?: any;
  }
}

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

interface AuthPageProps {
  mode: AuthMode;
  onNavigate: (path: string) => void;
}

const loadGoogleIdentityScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Google script failed to load.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed to load.'));

    document.head.appendChild(script);
  });
};

function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { t } = useLanguage();
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
    return isLogin ? t('auth.signIn') : t('auth.createTitle');
  }, [isLogin, t]);

  const subtitle = useMemo(() => {
    return isLogin
      ? t('auth.signInSubtitle')
      : t('auth.signUpSubtitle');
  }, [isLogin, t]);

  const legalText = t('auth.legal');

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
          setRouteNameFromRedirect(matchedRoute?.name ?? t('auth.thisRoute'));
        }
      } catch {
        if (mounted) {
          setRouteNameFromRedirect(t('auth.thisRoute'));
        }
      }
    };

    void loadRouteName();

    return () => {
      mounted = false;
    };
  }, [routeIdFromRedirect, t]);

  const finishSocialLogin = (): void => {
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      onNavigate('/');
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setError('');

    try {
      await loadGoogleIdentityScript();

      if (!window.google?.accounts?.oauth2) {
        setError(t('auth.googleUnavailable'));
        return;
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: getGoogleClientId(),
        scope: 'openid email profile',
        callback: async (tokenResponse: { access_token?: string; error?: string }) => {
          try {
            if (tokenResponse.error || !tokenResponse.access_token) {
              setError(tokenResponse.error || t('auth.googleTokenError'));
              return;
            }

            setSubmitting(true);
            await loginWithGoogle(tokenResponse.access_token);
            finishSocialLogin();
          } catch (googleError) {
            setError(googleError instanceof Error ? googleError.message : t('auth.googleFailed'));
          } finally {
            setSubmitting(false);
          }
        }
      });

      tokenClient.requestAccessToken();
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : t('auth.googleFailed'));
    }
  };

  const handleContinue = (event: FormEvent): void => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');

    if (!password) {
      setError(t('auth.passwordRequired'));
      return;
    }

    if (!isLogin && !PASSWORD_REGEX.test(password)) {
      setError(t('auth.passwordRules'));
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError(t('auth.passwordConfirmError'));
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
        setError(t('auth.unexpected'));
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
              {t('auth.loginRoute', { route: routeNameFromRedirect || t('auth.thisRoute') })}
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
                {t('auth.continue')}
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
                    placeholder={t('auth.firstName')}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="given-name"
                  />

                  <input
                    className="auth-input"
                    type="text"
                    placeholder={t('auth.lastName')}
                    value={surname}
                    onChange={(event) => setSurname(event.target.value)}
                    autoComplete="family-name"
                  />

                  <input
                    className="auth-input"
                    type="text"
                    placeholder={t('common.username')}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                  />
                </>
              ) : null}

              <input
                className="auth-input"
                type="password"
                placeholder={t('common.password')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />

              {!isLogin ? (
                <input
                  className="auth-input"
                  type="password"
                  placeholder={t('auth.passwordConfirm')}
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
                  {t('common.back')}
                </button>

                <button
                  type="submit"
                  className="auth-primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? t('routes.loading')
                    : isLogin
                      ? t('auth.signIn')
                      : t('auth.createAccount')}
                </button>
              </div>
            </form>
          )}

          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">{t('auth.or')}</span>
            <span className="auth-divider-line" />
          </div>

          <button
            type="button"
            className="auth-social-button"
            onClick={() => {
              void handleGoogleLogin();
            }}
            disabled={submitting}
          >
            <FcGoogle className="auth-social-icon" />
            <span>{t('auth.continueGoogle')}</span>
          </button>

          <p className="auth-legal-text">{legalText}</p>

          <div className="auth-switch">
            {isLogin ? (
              <>
                <span>{t('auth.noAccount')}</span>
                <button type="button" onClick={() => onNavigate('/register')}>
                  {t('auth.signUp')}
                </button>
              </>
            ) : (
              <>
                <span>{t('auth.alreadyHaveAccount')}</span>
                <button type="button" onClick={() => onNavigate('/login')}>
                  {t('auth.signIn')}
                </button>
              </>
            )}
          </div>

          <button type="button" className="auth-main-page-button" onClick={() => onNavigate('/')}>
            {t('auth.goMain')}
          </button>
        </section>
      </div>
    </main>
  );
}

export default AuthPage;
