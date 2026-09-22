import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
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

type LoginFormValues = {
  identifiant: string
  password: string
  remember: boolean
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
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

  const onSubmit = (values: LoginFormValues) => {
    console.log(values)
  }

  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[2fr_3fr]">
      <div className="flex flex-col px-8 py-10 sm:px-14 lg:px-16">
        <Link to="/" className="w-fit">
          <img src={logo} alt="SeedLab" className="h-16 w-auto" />
        </Link>

        <div className="mt-12 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#dcead7] px-3 py-1 text-xs text-[#1b7a43] text-center">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2a834e]" />
            Système opérationnel
          </span>

          <h1 className="mt-6 text-3xl font-bold text-[#14231a] sm:text-4xl">
            Bon retour dans votre serre
          </h1>
          <p className="mt-3 max-w-sm text-sm text-[#6f8178]">
            Surveillez vos plantes, pilotez l'irrigation et laissez l'IA veiller sur chaque
            bac.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5">
            <div>
              <label
                htmlFor="identifiant"
                className="mb-2 block text-sm text-[#14231a]"
              >
                Identifiant
              </label>
              <div className="relative">
                <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f8178]" />
                <input
                  id="identifiant"
                  type="text"
                  placeholder="User@seedlab.fr"
                  className="w-full rounded-lg border border-[#d9e2d3] bg-white py-3 pl-10 pr-4 text-sm text-[#14231a] outline-none transition placeholder:text-[#9aa8a0] focus:border-[#1b7a43] focus:ring-2 focus:ring-[#1b7a43]/15"
                  {...register('identifiant', { required: 'Identifiant requis' })}
                />
              </div>
              {errors.identifiant && (
                <p className="mt-1 text-sm text-red-500">{errors.identifiant.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-[#14231a]"
              >
                Mot de passe
              </label>
              <div className="relative">
                <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f8178]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#d9e2d3] bg-white py-3 pl-10 pr-10 text-sm text-[#14231a] outline-none transition placeholder:text-[#9aa8a0] focus:border-[#1b7a43] focus:ring-2 focus:ring-[#1b7a43]/15"
                  {...register('password', { required: 'Mot de passe requis' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f8178]"
                  aria-label="Afficher le mot de passe"
                >
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-[#14231a]">
                <input type="checkbox" className="peer sr-only" {...register('remember')} />
                <span className="grid h-4 w-4 place-items-center rounded border border-[#d9e2d3] bg-white transition peer-checked:border-[#1b7a43] peer-checked:bg-[#1b7a43]">
                  <AiOutlineCheck className="text-[10px] text-white" />
                </span>
                Rester connecté
              </label>
              <Link to="#" className="text-[#1b7a43] transition hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-lg bg-[#1b7a43] py-3 text-white transition hover:bg-[#166534] disabled:opacity-60"
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-[#6f8178]">
            <span className="h-px flex-1 bg-[#e6ede2]" />
            Ou continuer avec
            <span className="h-px flex-1 bg-[#e6ede2]" />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#d9e2d3] py-3 text-sm text-[#14231a] transition hover:bg-[#f3f7f1]"
          >
            <LuFingerprint className="text-lg" />
            Connexion par empreinte digitale
          </button>
        </div>

        <p className="mt-10 text-xs text-[#6f8178] text-center">
          © 2026 SeedLab OS - Chiffré de bout en bout
        </p>
      </div>

      <div className="hidden lg:block p-4">
        <img src={hero} alt="Serre SeedLab" className="h-200 w-full object-cover rounded-2xl shadow-2xl" />
      </div>
    </div>
  )
}