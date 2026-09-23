import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-7xl font-bold tracking-tight">
          <span className="neon-copy">40</span>
          <span className="cyber-copy">4</span>
        </p>
        <h1 className="mt-4 text-2xl font-bold text-ink">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <Link to="/" className="btn-neon mt-8 inline-flex">
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}