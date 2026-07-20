import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FaArrowRight, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa'
import { resetPassword } from '../../services/auth.service.js'

const tokens = {
  ink: '#16241F',
  paper: '#F3F1E9',
  surface: '#FFFFFF',
  forest: '#234A3C',
  forestDark: '#193329',
  ember: '#B8863B',
  line: '#DAD5C6',
  muted: '#6B7268',
}

// Mirrors the server's passwordSchema (auth.validators.js) so the person gets
// immediate feedback instead of a round trip just to learn their password is
// too short. The server remains the source of truth — this is UX only.
const RULES = [
  { test: (v) => v.length >= 10 && v.length <= 128, label: 'At least 10 characters' },
  { test: (v) => /[a-z]/.test(v), label: 'A lowercase letter' },
  { test: (v) => /[A-Z]/.test(v), label: 'An uppercase letter' },
  { test: (v) => /[0-9]/.test(v), label: 'A digit' },
]

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const failedRules = useMemo(
    () => RULES.filter((rule) => !rule.test(newPassword)),
    [newPassword]
  )
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (failedRules.length > 0) {
      setError('Please meet all password requirements below.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, newPassword)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err.message || 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6 sm:p-10"
        style={{ backgroundColor: tokens.paper, fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <div className="w-full max-w-sm text-center">
          <p className="text-sm mb-4" style={{ color: tokens.ink }}>
            This reset link is missing or invalid. Please request a new one.
          </p>
          <Link to="/forgot-password" className="text-sm font-medium" style={{ color: tokens.forest }}>
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 sm:p-10"
      style={{ backgroundColor: tokens.paper, fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="w-full max-w-sm">
        <div
          className="text-xs tracking-widest uppercase mb-3"
          style={{ fontFamily: 'IBM Plex Mono, monospace', color: tokens.muted }}
        >
          Reset password
        </div>
        <h1
          className="text-3xl mb-2"
          style={{ fontFamily: 'Fraunces, Georgia, serif', color: tokens.ink, fontWeight: 600 }}
        >
          Choose a new password
        </h1>
        <p className="text-sm mb-8" style={{ color: tokens.muted }}>
          Make it something you haven't used before.
        </p>

        {error && (
          <div
            className="mb-5 text-sm rounded-md px-3 py-2 border"
            style={{ color: '#8A3B2A', backgroundColor: '#FBEDE8', borderColor: '#F0CFC4' }}
          >
            {error}
          </div>
        )}

        {done ? (
          <div
            className="mb-5 text-sm rounded-md px-3 py-2.5 border"
            style={{ color: tokens.forestDark, backgroundColor: '#EAF1EC', borderColor: '#CFE0D6' }}
          >
            Password changed. Redirecting you to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="newPassword"
                className="block text-xs font-medium mb-1.5 tracking-wide"
                style={{ color: tokens.ink }}
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-shadow"
                  style={{
                    border: `1px solid ${tokens.line}`,
                    backgroundColor: tokens.surface,
                    color: tokens.ink,
                  }}
                  onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${tokens.ember}33`)}
                  onBlur={(e) => (e.target.style.boxShadow = 'none')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: tokens.muted }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>

              {newPassword.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {RULES.map((rule) => {
                    const met = rule.test(newPassword)
                    return (
                      <li
                        key={rule.label}
                        className="text-xs flex items-center gap-1.5"
                        style={{ color: met ? tokens.forest : tokens.muted }}
                      >
                        <span>{met ? '✓' : '·'}</span>
                        {rule.label}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium mb-1.5 tracking-wide"
                style={{ color: tokens.ink }}
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-shadow"
                style={{
                  border: `1px solid ${tokens.line}`,
                  backgroundColor: tokens.surface,
                  color: tokens.ink,
                }}
                onFocus={(e) => (e.target.style.boxShadow = `0 0 0 3px ${tokens.ember}33`)}
                onBlur={(e) => (e.target.style.boxShadow = 'none')}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs mt-1.5" style={{ color: '#8A3B2A' }}>
                  Passwords do not match.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm
               font-medium transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: tokens.forest, color: tokens.surface }}
            >
              {loading ? (
                <>
                  <FaSpinner size={16} className="animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  Update password
                  <FaArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
