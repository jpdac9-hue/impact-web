'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getMyClicks, getMyStats } from '@/src/lib/api';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [clicks, setClicks] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalCashback: 0, totalDonated: 0, totalWithdrawn: 0, balanceAvailable: 0 });
  const router = useRouter();

  useEffect(() => { checkUser(); }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/signin'); return; }
    const token = session.access_token;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const [profile, clicksData, statsData] = await Promise.all([
        getMe(token), getMyClicks(token), getMyStats(token),
      ]);
      setUser(profile); setClicks(clicksData); setStats(statsData);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const merchantCount = new Set(clicks.map(c => c.merchantName)).size;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
        <p className="text-white/40 font-medium">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">

      {/* Blobs décoratifs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition font-bold text-sm">
            <span className="text-lg">←</span>
            Retour aux boutiques
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-black text-xs">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-bold text-white/40 hover:text-rose-400 transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 relative">

        {/* HEADER */}
        <div className="mb-10">
          <p className="text-white/40 text-sm font-medium mb-1">{user?.email}</p>
          <h1 className="text-5xl font-black tracking-tight">
            Mon{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Impact
            </span>
          </h1>
        </div>

        {/* CARTES STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">

          {/* Solde — carte principale */}
          <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-violet-600 to-fuchsia-600">
            <div className="absolute -right-6 -bottom-6 text-8xl opacity-10 select-none">💰</div>
            <p className="text-violet-200 font-bold uppercase text-xs tracking-widest mb-3">Solde disponible</p>
            <p className="text-4xl font-black">{stats.balanceAvailable.toFixed(2)} $</p>
          </div>

          {/* Cashback */}
          <div className="rounded-3xl p-6 bg-white/5 border border-white/10 hover:border-emerald-500/30 transition">
            <p className="text-white/40 font-bold uppercase text-xs tracking-widest mb-3">💰 Cashback</p>
            <p className="text-3xl font-black">{stats.totalCashback.toFixed(2)} $</p>
          </div>

          {/* Dons */}
          <div className="rounded-3xl p-6 bg-white/5 border border-white/10 hover:border-rose-500/30 transition">
            <p className="text-white/40 font-bold uppercase text-xs tracking-widest mb-3">❤️ Donné</p>
            <p className="text-3xl font-black">{stats.totalDonated.toFixed(2)} $</p>
          </div>

          {/* Boutiques */}
          <div className="rounded-3xl p-6 bg-white/5 border border-white/10 hover:border-violet-500/30 transition">
            <p className="text-white/40 font-bold uppercase text-xs tracking-widest mb-3">🏪 Boutiques</p>
            <p className="text-3xl font-black">{merchantCount}</p>
          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-black">Historique d'activité</h3>
            <span className="text-white/30 text-sm font-medium">{clicks.length} transaction{clicks.length !== 1 ? 's' : ''}</span>
          </div>

          {clicks.length > 0 ? (
            <div className="divide-y divide-white/5">
              {clicks.map((click) => (
                <div key={click.id} className="px-8 py-5 flex justify-between items-center hover:bg-white/3 transition group">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border border-violet-500/20 flex items-center justify-center font-black text-violet-300 text-sm flex-shrink-0">
                      {click.merchantName?.[0] ?? '?'}
                    </div>
                    <div>
                      <p className="font-bold text-white">{click.merchantName}</p>
                      {click.productTitle && (
                        <p className="text-sm text-white/40 max-w-xs truncate">{click.productTitle}</p>
                      )}
                      <p className="text-xs text-white/30 mt-0.5">
                        {new Date(click.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                      click.status === 'confirmed'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : click.status === 'cancelled'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {click.status === 'confirmed' ? '✓ Confirmé'
                        : click.status === 'cancelled' ? '✕ Annulé'
                        : '⏳ En attente'}
                    </span>
                    {click.actualGain > 0 && (
                      <p className="text-sm font-black text-emerald-400 mt-1.5">+{click.actualGain.toFixed(2)} $</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="text-5xl mb-4">🛍️</div>
              <p className="text-white/30 font-medium">Aucune activité pour le moment.</p>
              <Link href="/" className="inline-block mt-4 text-violet-400 font-bold hover:text-violet-300 transition text-sm">
                Commencer à magasiner →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}