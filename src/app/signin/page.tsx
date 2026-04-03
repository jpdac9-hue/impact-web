'use client';

import { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setError(null);
        setLoading(false);
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Email ou mot de passe incorrect.');
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 relative overflow-hidden">

      {/* Blobs décoratifs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative">

        {/* Logo + titre */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-3 mb-6">
<img
  src="/logo.svg"
  alt="Remora"
  className="h-40 w-40 rounded-xl"
  style={{ mixBlendMode: 'screen' }}
/>
            <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              REMORA
            </span>
          </Link>
          <p className="text-white/50 font-medium">
            {isRegistering ? 'Créez votre compte gratuitement' : 'Connectez-vous pour voir votre impact'}
          </p>
        </div>

        {/* Carte formulaire */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">

          {/* Erreur */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl text-sm font-bold text-center mb-6">
              {error}
            </div>
          )}

          {/* Succès inscription */}
          {!error && isRegistering === false && loading === false && (
            <></>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-white/60 mb-2 ml-1">Email</label>
              <input
                type="email"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 outline-none focus:border-violet-500 focus:bg-white/10 transition-all text-sm"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white/60 mb-2 ml-1">Mot de passe</label>
              <input
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 outline-none focus:border-violet-500 focus:bg-white/10 transition-all text-sm"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white p-4 rounded-2xl font-bold transition-all active:scale-95 mt-2"
            >
              {loading ? 'Chargement...' : isRegistering ? "S'inscrire" : 'Se connecter'}
            </button>
          </form>

          {/* Switcher connexion/inscription */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="text-sm text-white/40 hover:text-violet-400 transition font-medium"
            >
              {isRegistering
                ? 'Déjà un compte ? Se connecter'
                : "Pas encore de compte ? S'inscrire"}
            </button>
          </div>
        </div>

        {/* Retour accueil */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-white/30 hover:text-white/60 transition">
            ← Retour aux boutiques
          </Link>
        </div>
      </div>
    </div>
  );
}