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
  
  // GESTION DES FAVORIS ET UTILISATEUR
  const [favorites, setFavorites] = useState<number[]>([]); // On stocke les IDs (number)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();

  const categories = [
    { label: 'Tout voir', value: 'All' },
    { label: 'Mode', value: 'Mode' },
    { label: 'Tech', value: 'High-Tech' },
    { label: 'Maison', value: 'Maison' },
    { label: 'Voyage', value: 'Voyage' },
  ];

  useEffect(() => {
    // 1. Charger les marchands
    fetchMerchants();
    
    // 2. Vérifier si l'utilisateur est connecté
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
    // Vérifie la session actuelle
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUser(session.user);
      // A. SI CONNECTÉ : Charger depuis Supabase
      const { data } = await supabase
        .from('favorites')
        .select('merchant_id')
        .eq('user_id', session.user.id);
      
      if (data) {
        // On transforme la liste d'objets en liste simple d'IDs
        setFavorites(data.map((fav: any) => fav.merchant_id));
      }
    } else {
      // B. SI NON CONNECTÉ : Charger depuis LocalStorage
      const savedFavorites = localStorage.getItem('impact_favorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    }
  };

  // LOGIQUE DU CŒUR (Hybride : Cloud + Local)
  const toggleFavorite = async (merchantId: number) => {
    const isFavorite = favorites.includes(merchantId);
    let newFavorites;

    // 1. Mise à jour visuelle immédiate (Optimistic UI)
    if (isFavorite) {
      newFavorites = favorites.filter(id => id !== merchantId);
    } else {
      newFavorites = [...favorites, merchantId];
    }
    setFavorites(newFavorites);

    // 2. Sauvegarde des données
    if (user) {
      // SI CONNECTÉ -> SUPABASE
      if (isFavorite) {
        // Retirer de la BDD
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('merchant_id', merchantId);
      } else {
        // Ajouter dans la BDD
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, merchant_id: merchantId });
      }
    } else {
      // SI NON CONNECTÉ -> LOCALSTORAGE
      localStorage.setItem('impact_favorites', JSON.stringify(newFavorites));
    }
  };

  // FILTRAGE
  useEffect(() => {
    let result = merchants;

    if (selectedCategory !== 'All') {
      result = result.filter(m => m.category === selectedCategory);
    }

    if (searchQuery) {
      result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (showFavoritesOnly) {
      result = result.filter(m => favorites.includes(m.id));
    }

    setFilteredMerchants(result);
  }, [searchQuery, selectedCategory, merchants, showFavoritesOnly, favorites]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-slate-900 text-white font-bold w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition">I</div>
            <span className="font-bold tracking-tight text-lg">IMPACT.</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hidden sm:block text-sm font-medium text-slate-500 hover:text-slate-900 transition">
              Mon Espace
            </Link>
            
            {user ? (
               // Si connecté, on affiche un petit avatar ou bouton déconnexion simple
               <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                 Connecté
               </span>
            ) : (
              <button 
                onClick={() => router.push('/signin')}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition active:scale-95"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-16 pb-12 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Shopping Solidaire.
        </h1>
        <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
          Activez une offre. Faites un don gratuit.
        </p>
        
        <div className="relative max-w-md mx-auto mb-8">
          <input 
            type="text" 
            placeholder="Rechercher (Nike, Apple...)" 
            className="w-full p-3 pl-10 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-slate-400">🔍</span>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
              showFavoritesOnly
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
              : 'bg-white text-rose-500 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            {showFavoritesOnly ? '❤️ Favoris affichés' : '🤍 Voir mes favoris'}
          </button>
          
          <div className="w-px h-6 bg-slate-300 mx-2 hidden sm:block"></div>

          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setSelectedCategory(cat.value);
                setShowFavoritesOnly(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                selectedCategory === cat.value && !showFavoritesOnly
                ? 'bg-slate-900 text-white' 
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* GRILLE MARCHANDS */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Chargement...</div>
        ) : (
          <>
            {showFavoritesOnly && (
               <p className="text-center mb-8 text-slate-500 font-medium">
                 Vous avez {filteredMerchants.length} favori(s).
               </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredMerchants.map((merchant) => (
                <div 
                  key={merchant.id} 
                  className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 flex flex-col justify-between relative"
                >
                  {/* BOUTON CŒUR */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(merchant.id);
                    }}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-50 transition"
                  >
                    {favorites.includes(merchant.id) ? (
                      <span className="text-xl">❤️</span>
                    ) : (
                      <span className="text-xl opacity-20 hover:opacity-100 transition-opacity">🖤</span>
                    )}
                  </button>

                  <div className="flex justify-between items-start mb-4 pr-10"> 
                    <div className="w-10 h-10 min-w-[2.5rem] rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5">
                      {merchant.logo_url ? (
                        <img 
                          src={merchant.logo_url} 
                          alt={merchant.name} 
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <span className="text-lg">⚡️</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 leading-tight">
                        {merchant.name}
                      </h3>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2 h-8">
                      {merchant.offer_text || "Offre partenaire disponible"}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded text-[10px] font-semibold text-slate-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${merchant.reward_type === 'Don' ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                        {merchant.reward_type === 'Don' ? 'Don Solidaire' : 'Cashback'}
                      </div>
                      
                      <a 
                        href={merchant.url || merchant.website} 
                        target="_blank"
                        className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md hover:bg-indigo-600 transition-colors"
                      >
                        Activer
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {showFavoritesOnly && filteredMerchants.length === 0 && (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400">
                  {user ? "Aucun favori enregistré." : "Aucun favori sur cet appareil. Connectez-vous pour synchroniser !"}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}