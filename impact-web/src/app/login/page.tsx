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
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push('/profile');
      router.refresh(); // Pour mettre à jour la barre de navigation
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-blue-600 mb-2">IMPACT.</h1>
          <p className="text-gray-500 font-medium">Heureux de vous revoir !</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm mb-6 font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email</label>
            <input 
              type="email" 
              className="w-full p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="votre@email.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Mot de passe</label>
            <input 
              type="password" 
              className="w-full p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:bg-gray-300"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}