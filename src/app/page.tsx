'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    { label: 'Tout', value: 'All' }, // "Tout" est plus court pour mobile
    { label: 'Mode', value: 'Mode' },
    { label: 'Tech', value: 'High-Tech' },
    { label: 'Maison', value: 'Maison' },
    { label: 'Voyage', value: 'Voyage' },
  ];

  useEffect(() => {
    fetchMerchants();
    checkUserAndFavorites();
  }, []);

  const fetchMerchants = async () => {
    const { data, error } = await supabase.from('Merchant').select('*');
    if (!error) {
      setMerchants(data || []);
      setFilteredMerchants(data || []);
    }
    setLoading(false);
  };

  const checkUserAndFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUser(session.user);
      const { data } = await supabase
        .from('favorites')
        .select('merchant_id')
        .eq('user_id', session.user.id);
      
      if (data) {
        setFavorites(data.map((fav: any) => fav.merchant_id));
      }
    } else {
      const savedFavorites = localStorage.getItem('impact_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    }
  };

  const toggleFavorite = async (merchantId: string) => {
    const isFavorite = favorites.includes(merchantId);
    let newFavorites;

    if (isFavorite) {
      newFavorites = favorites.filter(id => id !== merchantId);
    } else {
      newFavorites = [...favorites, merchantId];
    }
    setFavorites(newFavorites);

    if (user) {
      if (isFavorite) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('merchant_id', merchantId);
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, merchant_id: merchantId });
      }
    } else {
      localStorage.setItem('impact_favorites', JSON.stringify(newFavorites));
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-0">
      
      {/* --- NAVBAR DESKTOP (Cachée sur Mobile) --- */}
      <nav className="hidden md:flex sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-slate-900 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center">I</div>
            <span className="font-bold tracking-tight text-lg">IMPACT.</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition">Mon Espace</Link>
            {user ? (
               <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">Connecté</span>
            ) : (
              <button onClick={() => router.push('/signin')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition">Connexion</button>
            )}
          </div>
        </div>
      </nav>

      {/* --- HEADER MOBILE (Visible uniquement sur Mobile) --- */}
      <div className="md:hidden bg-white px-6 pt-12 pb-4 border-b border-slate-100 sticky top-0 z-40">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black tracking-tighter">IMPACT.</h1>
          {user ? (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">
              {user.email[0].toUpperCase()}
            </div>
          ) : (
            <button onClick={() => router.push('/signin')} className="text-sm font-bold text-slate-900">Connexion</button>
          )}
        </div>
        
        {/* Barre de recherche Mobile */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="w-full bg-slate-100 p-3 pl-10 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900 transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3 top-3 text-slate-400">🔍</span>
        </div>
      </div>

      {/* --- CONTENU PRINCIPAL --- */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-12">
        
        {/* Filtres (Style App Mobile : Scroll Horizontal) */}
        <div className="flex overflow-x-auto pb-4 gap-2 mb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-2 ${
              showFavoritesOnly ? 'bg-rose-500 text-white' : 'bg-white text-rose-500 border border-rose-200'
            }`}
          >
            {showFavoritesOnly ? '❤️' : '🤍 Favoris'}
          </button>
          
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setSelectedCategory(cat.value); setShowFavoritesOnly(false); }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${
                selectedCategory === cat.value && !showFavoritesOnly
                ? 'bg-slate-900 text-white' 
                : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grille Marchands */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredMerchants.map((merchant) => (
              <div key={merchant.id} className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm md:hover:shadow-lg transition-all relative">
                {/* Bouton Cœur */}
                <button 
                  onClick={(e) => { e.preventDefault(); toggleFavorite(merchant.id); }}
                  className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 active:scale-90 transition"
                >
                  {favorites.includes(merchant.id) ? '❤️' : '🤍'}
                </button>

                <div className="flex items-center gap-4 mb-4"> 
                  <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2">
                    {merchant.logo_url ? (
                      <img src={merchant.logo_url} alt={merchant.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xl">⚡️</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{merchant.name}</h3>
                    <div className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 mt-1">
                      {merchant.reward_type === 'Don' ? '🎁 Don' : '💰 Cashback'}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-4 line-clamp-2 h-8 leading-relaxed">
                  {merchant.offer_text || "Offre partenaire disponible"}
                </p>

                <a 
                  href={merchant.url || merchant.website} 
                  target="_blank"
                  className="block w-full text-center bg-slate-900 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                >
                  Activer l'offre
                </a>
              </div>
            ))}
          </div>
        )}
        
        {/* Espace vide pour ne pas cacher le contenu derrière la barre du bas */}
        <div className="h-8 md:hidden"></div>
      </section>

      {/* --- BOTTOM TAB BAR (App Mobile Style) --- */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-end z-50 h-[80px]">
        
        <button onClick={() => { setShowFavoritesOnly(false); window.scrollTo(0,0); }} className="flex flex-col items-center gap-1 p-2 w-16">
          <span className={`text-2xl ${!showFavoritesOnly ? 'grayscale-0' : 'grayscale opacity-50'}`}>🏠</span>
          <span className={`text-[10px] font-bold ${!showFavoritesOnly ? 'text-slate-900' : 'text-slate-400'}`}>Accueil</span>
        </button>

        <button onClick={() => setShowFavoritesOnly(true)} className="flex flex-col items-center gap-1 p-2 w-16">
          <span className={`text-2xl ${showFavoritesOnly ? 'grayscale-0' : 'grayscale opacity-50'}`}>❤️</span>
          <span className={`text-[10px] font-bold ${showFavoritesOnly ? 'text-slate-900' : 'text-slate-400'}`}>Favoris</span>
        </button>

        <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-1 p-2 w-16">
          <span className="text-2xl grayscale opacity-50">👤</span>
          <span className="text-[10px] font-bold text-slate-400">Profil</span>
        </button>

      </div>
    </div>
  );
}