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

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/signin');
      return;
    }

    const token = session.access_token;

    try {
      // Synchronise le profil dans public.User si première connexion
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const [profile, clicksData, statsData] = await Promise.all([
        getMe(token),
        getMyClicks(token),
        getMyStats(token),
      ]);

      setUser(profile);
      setClicks(clicksData);
      setStats(statsData);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
      Chargement...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 text-black">
      <div className="max-w-5xl mx-auto">

        {/* Navigation Haute */}
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="group flex items-center text-blue-600 font-bold transition">
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            Retour aux boutiques
          </Link>
          <button
            onClick={handleLogout}
            className="bg-white px-4 py-2 rounded-xl text-gray-400 hover:text-red-500 font-bold border border-gray-100 shadow-sm transition"
          >
            Déconnexion
          </button>
        </div>

        {/* Header Profil */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Mon Impact</h1>
          <p className="text-gray-500 font-medium">
            Connecté en tant que : {user?.email}
          </p>
        </div>

        {/* CARTES DE STATISTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-blue-100 font-bold uppercase text-xs tracking-wider mb-2">Solde disponible</p>
              <h2 className="text-5xl font-black">{stats.balanceAvailable.toFixed(2)} $</h2>
            </div>
            <div className="absolute -right-4 -bottom-4 text-8xl opacity-10">💰</div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-2">Total cashback</p>
            <h2 className="text-5xl font-black text-gray-900">{stats.totalCashback.toFixed(2)} $</h2>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-2">Total donné</p>
            <h2 className="text-5xl font-black text-gray-900">{stats.totalDonated.toFixed(2)} $</h2>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-2">Boutiques visitées</p>
            <h2 className="text-5xl font-black text-gray-900">{merchantCount}</h2>
          </div>
        </div>

        {/* TABLEAU HISTORIQUE */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50">
            <h3 className="text-xl font-black text-gray-900">Historique d'activité</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {clicks.length > 0 ? (
              clicks.map((click) => (
                <div key={click.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-xl mr-4 text-blue-600 font-bold">
                      {click.merchantName?.[0] ?? '?'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{click.merchantName}</p>
                      {click.productTitle && (
                        <p className="text-sm text-gray-500">{click.productTitle}</p>
                      )}
                      <p className="text-sm text-gray-400">
                        {new Date(click.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      click.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : click.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {click.status === 'confirmed' ? 'Confirmé'
                        : click.status === 'cancelled' ? 'Annulé'
                        : 'En attente'}
                    </span>
                    {click.actualGain > 0 && (
                      <p className="text-sm font-bold text-green-600 mt-1">+{click.actualGain.toFixed(2)} $</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center text-gray-400 italic">
                Aucune activité pour le moment. Commencez à magasiner !
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}