'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { ApiError } from '@/features/forum/lib/api';
import { DEMO_CREDENTIALS, ROLE_LABEL, safeRedirect, signIn } from '@/features/auth/lib/session';
import styles from './SignInForm.module.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignInFormProps {
  next?: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function SignInForm({ next }: SignInFormProps) {
  const router = useRouter();
  const ids = { email: useId(), password: useId(), remember: useId(), error: useId() };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Enter your email.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password.';
    return errors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setInfo(null);
    const errors = validate();
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    setSubmitting(true);
    try {
      const user = await signIn(email, password, remember);
      router.replace(safeRedirect(user.role, next));
      router.refresh();
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError) {
        setFormError(error.status === 401 ? 'Email or password is incorrect.' : error.message);
      } else {
        setFormError('Could not reach the server. Check that the API is running and try again.');
      }
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setFormError(null);
    setInfo(null);
  };

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby={`${ids.email}-title`}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden />
          <span className={styles.brandName}>
            Neuro<span className={styles.brandAccent}>LXP</span>
          </span>
        </div>

        <header className={styles.heading}>
          <h1 id={`${ids.email}-title`} className={styles.title}>
            Sign in to Discussion Forum
          </h1>
          <p className={styles.subtitle}>Use your institution email to continue.</p>
        </header>

        {formError && (
          <p id={ids.error} className={styles.alert} role="alert">
            {formError}
          </p>
        )}
        {info && (
          <p className={styles.info} role="status">
            {info}
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate aria-describedby={formError ? ids.error : undefined}>
          <div className={styles.field}>
            <label htmlFor={ids.email} className={styles.label}>
              Email
            </label>
            <div className={styles.control} data-invalid={fieldErrors.email ? true : undefined}>
              <Mail size={20} strokeWidth={1.5} className={styles.icon} aria-hidden />
              <input
                id={ids.email}
                type="email"
                className={styles.input}
                placeholder="name@institution.edu"
                autoComplete="username"
                value={email}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? `${ids.email}-error` : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {fieldErrors.email && (
              <p id={`${ids.email}-error`} className={styles.fieldError}>
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={ids.password} className={styles.label}>
              Password
            </label>
            <div className={styles.control} data-invalid={fieldErrors.password ? true : undefined}>
              <LockKeyhole size={20} strokeWidth={1.5} className={styles.icon} aria-hidden />
              <input
                id={ids.password}
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? `${ids.password}-error` : undefined}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.reveal}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id={`${ids.password}-error`} className={styles.fieldError}>
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className={styles.row}>
            <label htmlFor={ids.remember} className={styles.check} data-checked={remember || undefined}>
              <input
                id={ids.remember}
                type="checkbox"
                className={styles.srOnly}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className={styles.box} aria-hidden>
                {remember && (
                  <svg viewBox="0 0 16 16" className={styles.tick}>
                    <path d="M4 8.4 6.6 11 12 5.4" />
                  </svg>
                )}
              </span>
              Keep me signed in
            </label>
            <button
              type="button"
              className={styles.link}
              onClick={() => setInfo('Password reset is not available yet. Ask your institution admin to reset it.')}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? (
              <span className={styles.spinner} aria-hidden />
            ) : (
              <LogIn size={20} strokeWidth={1.75} aria-hidden />
            )}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className={styles.demo}>
          <p className={styles.demoTitle}>Demo accounts</p>
          <div className={styles.demoList}>
            {DEMO_CREDENTIALS.map((d) => (
              <button
                key={d.role}
                type="button"
                className={styles.demoItem}
                onClick={() => fillDemo(d.email, d.password)}
              >
                <span className={styles.demoRole}>{ROLE_LABEL[d.role]}</span>
                <span className={styles.demoText}>{d.email}</span>
                <span className={styles.demoText}>{d.password}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}