import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEye, FaEyeSlash, FaArrowRight, FaSpinner } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext.jsx'

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

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {

      const user = await login(form.phone, form.password)

      if (user.role === 'owner') navigate('/owner', { replace: true })
      else if (user.role === 'caretaker') navigate('/caretaker', { replace: true })
      else if (user.role === 'admin') navigate('/admin', { replace: true })
      else throw new Error('This account type cannot sign in here.')
    } catch (err) {
      setError(err.message || 'Invalid phone number or password')
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
          Sign in
        </div>
        <h1
          className="text-3xl mb-2"
          style={{ fontFamily: 'Fraunces, Georgia, serif', color: tokens.ink, fontWeight: 600 }}
        >
          Welcome back
        </h1>
        <p className="text-sm mb-8" style={{ color: tokens.muted }}>
          Enter your details to manage your properties effortlessly.
        </p>

        {error && (
          <div
            className="mb-5 text-sm rounded-md px-3 py-2 border"
            style={{ color: '#8A3B2A', backgroundColor: '#FBEDE8', borderColor: '#F0CFC4' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="mb-4">
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
              value={form.phone}
              onChange={handleChange}
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

        
          <div className="mb-5">
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1.5 tracking-wide"
              style={{ color: tokens.ink }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="********"
                value={form.password}
                onChange={handleChange}
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
          </div>


          <div className="flex items-center justify-end mb-6 text-sm">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="font-medium cursor-pointer bg-transparent border-none p-0"
              style={{ color: tokens.forest }}
            >
              Forgot password?
            </button>
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
                Signing in…
              </>
            ) : (
              <>
                Sign in to NyumbaHub
                <FaArrowRight size={16} />
              </>
            )}
          </button>
        </form>


      </div>
    </div>
  )
}

export default Login