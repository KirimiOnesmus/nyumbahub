import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaArrowRight, FaSpinner } from 'react-icons/fa'
import { requestPasswordReset } from '../../services/auth.service.js'

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

const ForgotPassword = () => {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // The backend intentionally returns the same generic message whether or
      // not the phone number is registered, to avoid leaking account
      // existence. We show that same message regardless of outcome here too.
      await requestPasswordReset(phone)
      setSubmitted(true)
    } catch (err) {
      // Only surface something other than the generic success state for
      // genuine client-side problems (e.g. malformed request, rate limited).
      // Never imply whether the phone number exists in our system.
      if (err.status === 429) {
        setError('Too many requests. Please wait a while before trying again.')
      } else {
        setSubmitted(true)
      }
    } finally {
      setLoading(false)
    }
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
          Forgot your password?
        </h1>
        <p className="text-sm mb-8" style={{ color: tokens.muted }}>
          Enter the phone number on your account and, if it's registered, we'll send a reset link to it.
        </p>

        {error && (
          <div
            className="mb-5 text-sm rounded-md px-3 py-2 border"
            style={{ color: '#8A3B2A', backgroundColor: '#FBEDE8', borderColor: '#F0CFC4' }}
          >
            {error}
          </div>
        )}

        {submitted ? (
          <div
            className="mb-5 text-sm rounded-md px-3 py-2.5 border"
            style={{ color: tokens.forestDark, backgroundColor: '#EAF1EC', borderColor: '#CFE0D6' }}
          >
            If that phone number is registered, a reset link has been sent to it. It may take a few minutes to arrive.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="phone"
                className="block text-xs font-medium mb-1.5 tracking-wide"
                style={{ color: tokens.ink }}
              >
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                  Sending…
                </>
              ) : (
                <>
                  Send reset link
                  <FaArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: tokens.muted }}
        >
          <FaArrowLeft size={12} />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

export default ForgotPassword
