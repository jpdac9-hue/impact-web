'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setHasSearched(true);
    setResults([]);
    try {
      const res = await fetch(`/api/compare?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.products) setResults(data.products);
    } catch (error) {
      console.error('Erreur de recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans pb-24 md:pb-0">

      {/* Blobs décoratifs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Remora"
              className="h-18 w-18 rounded-xl"
              style={{ mixBlendMode: 'screen' }}
            />
            <span className="font-black tracking-tight text-lg bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              REMORA
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-white/50 hover:text-white transition">
            Mon Espace
          </Link>
        </div>
      </nav>

      {/* HERO SEARCH */}
      <section className="relative">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-violet-300 mb-6">
            🇨🇦 Comparateur de prix Canada
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Trouvez le{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              meilleur prix
            </span>
          </h1>
          <p className="text-white/40 mb-8">
            Comparez les prix sur Amazon, Best Buy, Walmart et plus encore.
          </p>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">🔍</span>
            <input
              type="text"
              placeholder="iPhone 15, Lego Star Wars, TV Samsung..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-32 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 focus:bg-white/10 transition-all text-sm"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white px-5 rounded-xl font-bold text-sm transition-all"
            >
              {loading ? '...' : 'Rechercher'}
            </button>
          </form>
        </div>
      </section>

      {/* RÉSULTATS */}
      <div className="max-w-6xl mx-auto px-6 relative">

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white/40 font-medium">Recherche des meilleurs prix...</p>
          </div>
        )}

        {/* Aucun résultat */}
        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-white/30">Aucun résultat pour "{query}"</p>
          </div>
        )}

        {/* État initial */}
        {!hasSearched && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-20">🛍️</div>
            <p className="text-white/20">Entrez un produit pour comparer les prix</p>
          </div>
        )}

        {/* Grille résultats */}
        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/40 text-sm">
                <span className="text-white font-bold">{results.length}</span> résultats pour "{query}"
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((product, index) => (
                <div
                  key={index}
                  className="group bg-white/5 border border-white/10 hover:border-violet-500/40 rounded-3xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/10 flex flex-col"
                >
                  {/* Image */}
                  <div className="w-full aspect-square bg-white rounded-2xl mb-4 overflow-hidden flex items-center justify-center p-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-4xl">📦</span>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 flex flex-col">
                    {/* Source + rating */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase truncate max-w-[100px]">
                        {product.source || 'Autre'}
                      </span>
                      {product.rating && (
                        <span className="text-[10px] text-amber-400 font-bold">⭐ {product.rating}</span>
                      )}
                    </div>

                    {/* Titre */}
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-3 flex-1">
                      {product.title}
                    </h3>

                    {/* Livraison */}
                    {product.shipping_display && (
                      <p className="text-xs text-white/30 mb-2">{product.shipping_display}</p>
                    )}

                    {/* Prix + CTA */}
                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-xl font-black text-white">{product.price_display}</p>
                        {product.total_price_value > 0 && (
                          <p className="text-[10px] text-emerald-400 font-bold">
                            Total: {product.total_price_value.toFixed(2)}$
                          </p>
                        )}
                      </div>
                      <a
                        href={product.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
                      >
                        Voir →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* BOTTOM TAB BAR MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 pb-safe pt-3 px-8 flex justify-between items-end z-50 h-[80px]">
        <Link href="/" className="flex flex-col items-center gap-1">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold text-white/60">Accueil</span>
        </Link>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl">🔍</span>
          <span className="text-[10px] font-bold text-violet-400">Chercher</span>
        </div>
        <Link href="/dashboard" className="flex flex-col items-center gap-1">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold text-white/60">Profil</span>
        </Link>
      </div>
    </div>
  );
}