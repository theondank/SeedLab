import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import {
  AiOutlineCheck,
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineLock,
  AiOutlineUser,
} from 'react-icons/ai'
import { LuFingerprint } from 'react-icons/lu'
import hero from '../assets/login-image.jpg'
import logo from '../assets/seedlab-logo-trimmed.png'
import { authService } from '../services'

type LoginFormValues = {
  identifiant: string
  password: string
  remember: boolean
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bioStatus, setBioStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle')
  const [bioMessage, setBioMessage] = useState('')
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      identifiant: '',
      password: '',
      remember: true,
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setError(null)
    try {
      const session = await authService.login(values)
      console.info('Session ouverte pour', session.user.email)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    }
  }

  const startBiometricLogin = async () => {
    try {
      setBioStatus('scanning')
      setBioMessage('Posez votre doigt sur le capteur de la serre...')
      setError(null)

      const start = await authService.startFingerprint()
      if (!start.success) throw new Error(start.message)

      const timer = setInterval(async () => {
        const res = await authService.getFingerprintStatus().catch(() => null)
        if (res?.status === 'success') {
          clearInterval(timer)
          setBioStatus('success')
          setBioMessage(`Authentifié avec succès ! Bienvenue ${res.user?.name || ''}`)
          if (res.token) localStorage.setItem('token', res.token)
          setTimeout(() => navigate('/dashboard'), 1000)
        } else if (res?.status === 'failed') {
          clearInterval(timer)
          setBioStatus('failed')
          setBioMessage(res.message || 'Échec de la lecture biométrique')
        }
      }, 1000)
    } catch (err) {
      setBioStatus('failed')
      setBioMessage(err instanceof Error ? err.message : 'Erreur de communication')
    }
  }

  const cancelBiometricLogin = async () => {
    await authService.cancelFingerprint().catch(() => {})
    setBioStatus('idle')
    setBioMessage('')
  }

  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[2fr_3fr]">
      <div className="flex flex-col px-8 py-10 sm:px-14 lg:px-16">
        <Link to="/" className="w-fit">
          <img src={logo} alt="SeedLab" className="h-16 w-auto" />
        </Link>

        <div className="mt-12 flex-1">
          <span className="tag inline-flex items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-neon">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            Système opérationnel
          </span>

          <h1 className="mt-6 text-3xl font-bold text-ink sm:text-4xl">
            Bon retour dans <span className="neon-copy">votre serre</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Identifiez-vous pour piloter les bacs, les capteurs et le réseau d'irrigation de la
            serre.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
            {error && (
              <p
                role="alert"
                className="rounded-md border border-alert/50 bg-alert/10 px-4 py-3 font-mono text-sm text-alert"
              >
                {error}
              </p>
            )}

            <div>
              <label htmlFor="identifiant" className="lbl">
                Identifiant
              </label>
              <div className="relative">
                <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="identifiant"
                  type="text"
                  placeholder="user@seedlab.fr"
                  className="field pl-10"
                  {...register('identifiant', { required: 'Identifiant requis' })}
                />
              </div>
              {errors.identifiant && (
                <p className="mt-1 font-mono text-xs text-alert">
                  {errors.identifiant.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="lbl">
                Mot de passe
              </label>
              <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="field pl-10 pr-10"
                  {...register('password', { required: 'Mot de passe requis' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-cyber"
                  aria-label="Afficher le mot de passe"
                >
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 font-mono text-xs text-alert">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-muted">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="peer sr-only" {...register('remember')} />
                <span className="grid h-4 w-4 place-items-center rounded border border-line bg-abyss transition peer-checked:border-neon peer-checked:bg-neon">
                  <AiOutlineCheck className="text-[10px] text-[#04150c]" />
                </span>
                Rester connecté
              </label>
              <Link to="#" className="text-cyber transition hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-neon mt-1 w-full"
            >
              {isSubmitting ? 'Connexion...' : 'Ouvrir la session'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 font-mono text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            Ou continuer avec
            <span className="h-px flex-1 bg-line" />
          </div>

          {bioStatus === 'idle' ? (
            <button
              type="button"
              onClick={startBiometricLogin}
              className="btn-ghost w-full"
            >
              <LuFingerprint className="text-lg text-cyber" />
              Empreinte biométrique
            </button>
          ) : (
            <div className={`rounded-xl border p-4 text-center backdrop-blur-md ${
              bioStatus === 'failed'
                ? 'border-alert/50 bg-alert/15 text-alert'
                : bioStatus === 'success'
                ? 'border-neon/50 bg-neon/15 text-neon'
                : 'border-neon/40 bg-abyss/80 text-ink'
            }`}>
              {bioStatus === 'scanning' && (
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-neon/30 bg-neon/10 text-neon animate-pulse">
                  <LuFingerprint className="text-2xl animate-bounce" />
                </div>
              )}
              <p className="font-mono text-xs">{bioMessage}</p>
              {bioStatus === 'scanning' && (
                <button
                  type="button"
                  onClick={cancelBiometricLogin}
                  className="mt-2 font-mono text-xs text-alert hover:underline"
                >
                  Annuler
                </button>
              )}
              {bioStatus === 'failed' && (
                <button
                  type="button"
                  onClick={startBiometricLogin}
                  className="btn-neon mt-2 px-3 py-1 text-xs"
                >
                  Réessayer
                </button>
              )}
            </div>
          )}
        </div>

        <p className="mt-10 text-center font-mono text-xs text-muted/60">
          © 2080 SEEDLAB OS — Liaison chiffrée
        </p>
      </div>

      <div className="relative hidden overflow-hidden rounded-xl border border-line lg:block">
        <img src={hero} alt="Serre SeedLab" className="h-205 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f251e]/70 via-[#0f251e]/20 to-transparent" />
        <div className="absolute bottom-4 left-4 rounded-lg bg-[#0f251e]/75 px-3 py-2 font-mono text-xs text-[#8af0c6]">
          SeedLab — serre connectée, génération 2080
        </div>
      </div>
    </div>
  )
}