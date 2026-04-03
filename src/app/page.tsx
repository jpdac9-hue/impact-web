'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMerchants } from '@/src/lib/api';

export default function Home() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const categories = [
    { label: '✨ Tout', value: 'All' },
    { label: '👗 Mode', value: 'Mode' },
    { label: '💻 Tech', value: 'High-Tech' },
    { label: '🏠 Maison', value: 'Maison' },
    { label: '✈️ Voyage', value: 'Voyage' },
  ];

  useEffect(() => {
    fetchMerchants();
    checkUserAndFavorites();
  }, []);

  const fetchMerchants = async () => {
    try {
      const data = await getMerchants();
      setMerchants(data || []);
      setFilteredMerchants(data || []);
    } catch (error) {
      console.error('Erreur chargement marchands:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserAndFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data } = await supabase.from('favorites').select('merchant_id').eq('user_id', session.user.id);
      if (data) setFavorites(data.map((fav: any) => fav.merchant_id));
    } else {
      const saved = localStorage.getItem('impact_favorites');
      if (saved) setFavorites(JSON.parse(saved));
    }
  };

  const toggleFavorite = async (merchantId: string) => {
    const isFav = favorites.includes(merchantId);
    const next = isFav ? favorites.filter(id => id !== merchantId) : [...favorites, merchantId];
    setFavorites(next);
    if (user) {
      if (isFav) await supabase.from('favorites').delete().eq('user_id', user.id).eq('merchant_id', merchantId);
      else await supabase.from('favorites').insert({ user_id: user.id, merchant_id: merchantId });
    } else {
      localStorage.setItem('impact_favorites', JSON.stringify(next));
    }
  };

  useEffect(() => {
    let result = merchants;
    if (selectedCategory !== 'All') result = result.filter(m => m.category === selectedCategory);
    if (searchQuery) result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (showFavoritesOnly) result = result.filter(m => favorites.includes(m.id));
    setFilteredMerchants(result);
  }, [searchQuery, selectedCategory, merchants, showFavoritesOnly, favorites]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans pb-24 md:pb-0">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-violet-600 overflow-hidden flex items-center justify-center">
  <img
    src="/logo.svg"
    alt="Remora"
    className="w-full h-full object-cover"
    style={{ mixBlendMode: 'screen' }}
  />
</div>
            <span className="font-black tracking-tight text-lg bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              REMORA
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-white/50 hover:text-white transition">
              Mon Espace
            </Link>
            {user ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-xs">
                {user.email[0].toUpperCase()}
              </div>
            ) : (
              <button
                onClick={() => router.push('/signin')}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 right-0 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-violet-300 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Cashback + Charité • 100% gratuit
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 leading-none">
            Shop.{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Earn. Give.
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
            Chaque achat génère un cashback partagé entre vous et votre organisme de charité favori.
          </p>

          {/* Barre de recherche centrée */}
          <div className="max-w-lg mx-auto relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Rechercher un marchand..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 focus:bg-white/10 transition-all text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* FILTRES */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
              showFavoritesOnly
                ? 'bg-rose-500 border-rose-500 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:border-rose-500/50 hover:text-rose-400'
            }`}
          >
            ❤️ Favoris
          </button>
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => { setSelectedCategory(cat.value); setShowFavoritesOnly(false); }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === cat.value && !showFavoritesOnly
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-transparent text-white'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-violet-500/50 hover:text-violet-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE MARCHANDS */}
      <section className="max-w-7xl mx-auto px-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-3xl h-64 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-4">🔍</div>
            <p>Aucun marchand trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMerchants.map(merchant => {
              const isDon = merchant.rewardType === 'Don';
              const isFav = favorites.includes(merchant.id);
              return (
                <div
                  key={merchant.id}
                  className="group relative bg-white/5 hover:bg-white/8 border border-white/10 hover:border-violet-500/40 rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/10"
                >
                  <div className={`absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isDon
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isDon ? '🎁 Don' : '💰 Cashback'}
                  </div>

                  <button
                    onClick={e => { e.preventDefault(); toggleFavorite(merchant.id); }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90"
                  >
                    {isFav ? '❤️' : '🤍'}
                  </button>

                  <div className="mt-8 mb-4 w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center p-2 overflow-hidden">
                    {merchant.logoUrl ? (
                      <img src={merchant.logoUrl} alt={merchant.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl font-black text-white/50">{merchant.name[0]}</span>
                    )}
                  </div>

                  <h3 className="font-black text-white text-lg mb-1">{merchant.name}</h3>
                  <p className="text-white/40 text-xs mb-4 line-clamp-2 leading-relaxed min-h-[2rem]">
                    {merchant.offerText || 'Offre partenaire disponible'}
                  </p>

                  <a
                    href={merchant.url}
                    target="_blank"
                    className="block w-full text-center py-3 rounded-2xl font-bold text-sm transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white active:scale-95"
                  >
                    Activer l'offre →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BOTTOM TAB BAR MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 pb-safe pt-3 px-8 flex justify-between items-end z-50 h-[80px]">
        <button onClick={() => { setShowFavoritesOnly(false); window.scrollTo(0, 0); }} className="flex flex-col items-center gap-1">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold text-white/60">Accueil</span>
        </button>
        <button onClick={() => setShowFavoritesOnly(true)} className="flex flex-col items-center gap-1">
          <span className="text-xl">❤️</span>
          <span className="text-[10px] font-bold text-white/60">Favoris</span>
        </button>
        <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-1">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold text-white/60">Profil</span>
        </button>
      </div>
    </div>
  );
}