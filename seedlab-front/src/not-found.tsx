import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-6 text-center">
      <div>
        <p className="text-6xl font-bold text-[#1b7a43]">404</p>
        <h1 className="mt-4 text-2xl font-bold text-[#14231a]">Page introuvable</h1>
        <p className="mt-2 text-sm text-[#6f8178]">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-[#1b7a43] px-5 py-3 text-white transition hover:bg-[#166534]"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
