'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavBar from '@/src/components/NavBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface PriceHistory {
  id: string;
  price: number;
  merchantName: string | null;
  recordedAt: string;
}

interface WatchlistItem {
  id: string;
  name: string;
  targetPrice: number | null;
  currentPrice: number | null;
  currentMerchant: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  status: string;
  createdAt: string;
  priceHistory: PriceHistory[];
}

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', targetPrice: '' });
  const [adding, setAdding] = useState(false);
  const [checkingPrices, setCheckingPrices] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const t = data.session?.access_token ?? null;
      setToken(t);
      if (!t) { router.push('/signin'); return; }
      await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      loadItems(t);
    });
  }, []);

  const loadItems = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/watchlist/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  };

  const addItem = async () => {
    if (!newItem.name.trim() || !token) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/watchlist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name.trim(),
          targetPrice: newItem.targetPrice ? parseFloat(newItem.targetPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setItems(prev => [{ ...data, priceHistory: [] }, ...prev]);
        setNewItem({ name: '', targetPrice: '' });
        setShowForm(false);
      }
    } catch {}
    finally { setAdding(false); }
  };

  const checkPrice = async (itemId: string, itemName: string) => {
    if (!token) return;
    setCheckingPrices(prev => new Set(prev).add(itemId));
    try {
      // Cherche le meilleur prix via SerpAPI
      const searchRes = await fetch(`${API_URL}/search/shopping?q=${encodeURIComponent(itemName)}&sort=price_asc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const searchData = await searchRes.json();
      const best = searchData.products?.[0];
      if (!best || !best.priceNum) return;

      // Enregistre le prix dans l'historique
      const res = await fetch(`${API_URL}/watchlist/${itemId}/price`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: best.priceNum,
          merchantName: best.merchant,
          productUrl: best.link,
          imageUrl: best.thumbnail,
        }),
      });
      const updated = await res.json();
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updated } : i));
    } catch {}
    finally { setCheckingPrices(prev => { const s = new Set(prev); s.delete(itemId); return s; }); }
  };

  const deleteItem = async (itemId: string) => {
    if (!token) return;
    await fetch(`${API_URL}/watchlist/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans pb-24 md:pb-0">
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* NAVBAR */}
     <NavBar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">👁 Watchlist</h1>
          <p className="text-white/40 text-sm">Surveillez les prix et soyez alerté quand ça baisse.</p>
        </div>

        {/* Formulaire ajout */}
        {showForm && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="font-black mb-4">Surveiller un produit</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nom du produit (ex: TV Samsung 55 pouces)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm"
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
              <input
                type="number"
                placeholder="Prix cible (optionnel) — ex: 399.99"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm"
                value={newItem.targetPrice}
                onChange={e => setNewItem(p => ({ ...p, targetPrice: e.target.value }))}
              />
              <div className="flex gap-3">
                <button
                  onClick={addItem}
                  disabled={adding || !newItem.name.trim()}
                  className="bg-gradient-to-r from-violet-600 to-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm"
                >
                  {adding ? 'Ajout...' : 'Surveiller'}
                </button>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white text-sm px-4">Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* Liste vide */}
        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">👁</div>
            <p className="text-white/30 mb-2">Aucun produit surveillé</p>
            <p className="text-white/20 text-sm mb-6">Ajoutez des produits pour suivre l'évolution des prix</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-sm"
            >
              + Surveiller un produit
            </button>
          </div>
        )}

        {/* Liste des items */}
        <div className="flex flex-col gap-4">
          {items.map(item => {
            const isChecking = checkingPrices.has(item.id);
            const hasTarget = item.targetPrice !== null;
            const belowTarget = hasTarget && item.currentPrice !== null && item.currentPrice <= item.targetPrice!;
            const priceDown = item.priceHistory.length >= 2 &&
              item.priceHistory[0].price < item.priceHistory[1].price;

            return (
              <div key={item.id} className={`bg-white/5 border rounded-3xl p-5 transition-all ${belowTarget ? 'border-green-500/40' : 'border-white/10 hover:border-violet-500/20'}`}>
                <div className="flex items-start gap-4">
                  {/* Image */}
                  {item.imageUrl ? (
                    <div className="w-16 h-16 rounded-xl bg-white overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                      <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center text-2xl">👁</div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-white truncate">{item.name}</p>
                      {belowTarget && (
                        <span className="text-xs font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full flex-shrink-0">🎯 Prix cible atteint !</span>
                      )}
                      {priceDown && !belowTarget && (
                        <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full flex-shrink-0">📉 En baisse</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1">
                      {item.currentPrice !== null ? (
                        <p className="text-xl font-black text-cyan-400">{Number(item.currentPrice).toFixed(2)} $</p>
                      ) : (
                        <p className="text-sm text-white/30">Prix non vérifié</p>
                      )}
                      {item.currentMerchant && (
                        <p className="text-xs text-white/40">🏪 {item.currentMerchant}</p>
                      )}
                      {hasTarget && (
                        <p className="text-xs text-white/40">🎯 Cible: {Number(item.targetPrice).toFixed(2)} $</p>
                      )}
                    </div>

                    {/* Historique des prix */}
                    {item.priceHistory.length > 1 && (
                      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                        <span className="text-xs text-white/30 flex-shrink-0">Historique:</span>
                        {item.priceHistory.slice(0, 6).reverse().map((h, i) => (
                          <div key={h.id} className="flex-shrink-0 text-center">
                            <p className="text-xs font-bold text-white/60">{Number(h.price).toFixed(0)} $</p>
                            <p className="text-[9px] text-white/20">{new Date(h.recordedAt).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {item.productUrl && (
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-green-400 px-3 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition text-center"
                      >
                        🛒 Acheter
                      </a>
                    )}
                    <button
                      onClick={() => checkPrice(item.id, item.name)}
                      disabled={isChecking}
                      className="text-xs font-bold text-cyan-400 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 transition text-center"
                    >
                      {isChecking ? '🔄 ...' : '🔍 Vérifier'}
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/20 flex items-center justify-center transition text-sm mx-auto"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM NAV MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0f]/95 border-t border-white/10 px-6 flex justify-around items-center z-50 h-16">
        <Link href="/" className="flex flex-col items-center gap-1"><span className="text-xl">🏠</span><span className="text-[10px] text-white/40">Accueil</span></Link>
        <Link href="/search" className="flex flex-col items-center gap-1"><span className="text-xl">🔍</span><span className="text-[10px] text-white/40">Chercher</span></Link>
        <Link href="/projects" className="flex flex-col items-center gap-1"><span className="text-xl">📋</span><span className="text-[10px] text-white/40">Projets</span></Link>
        <div className="flex flex-col items-center gap-1"><span className="text-xl">👁</span><span className="text-[10px] text-cyan-400">Watchlist</span></div>
      </div>
    </div>
  );
}