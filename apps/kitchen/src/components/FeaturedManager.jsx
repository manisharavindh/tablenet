import { useState, useEffect } from 'react';
import { Star, Clock, Search, Flame, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@tablenet/supabase';

const MEAL_PERIODS = [
  { value: '', label: 'Any Time' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'late_night', label: 'Late Night' },
];

export default function FeaturedManager() {
  const [menu, setMenu] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState('all'); // 'all', 'popular', 'special'
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase.channel(`featured-menu-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchMenu(restaurantId);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [restaurantId]);

  const fetchRestaurantAndMenu = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roleData } = await supabase.from('user_roles').select('restaurant_id').eq('user_id', user.id).single();
    if (roleData) {
      setRestaurantId(roleData.restaurant_id);
      fetchMenu(roleData.restaurant_id);
    }
  };

  const fetchMenu = async (rId) => {
    const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', rId).order('category').order('name');
    if (data) setMenu(data);
    setLoading(false);
  };

  const togglePopular = async (item) => {
    setSavingId(item.id);
    setMenu(prev => prev.map(m => m.id === item.id ? { ...m, is_popular: !m.is_popular } : m));
    await supabase.from('menu_items').update({ is_popular: !item.is_popular }).eq('id', item.id);
    setSavingId(null);
  };

  const toggleSpecial = async (item) => {
    setSavingId(item.id);
    setMenu(prev => prev.map(m => m.id === item.id ? { ...m, is_todays_special: !m.is_todays_special } : m));
    await supabase.from('menu_items').update({ is_todays_special: !item.is_todays_special }).eq('id', item.id);
    setSavingId(null);
  };

  const updateMealPeriod = async (item, mealPeriod) => {
    setSavingId(item.id);
    setMenu(prev => prev.map(m => m.id === item.id ? { ...m, meal_period: mealPeriod || null } : m));
    await supabase.from('menu_items').update({ meal_period: mealPeriod || null }).eq('id', item.id);
    setSavingId(null);
  };

  const filteredMenu = menu.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (filterView === 'popular') return matchesSearch && item.is_popular;
    if (filterView === 'special') return matchesSearch && item.is_todays_special;
    return matchesSearch;
  });

  const popularCount = menu.filter(m => m.is_popular).length;
  const specialCount = menu.filter(m => m.is_todays_special).length;

  const groupedByCategory = filteredMenu.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 pt-0 md:pt-0">
      {/* Stats cards */}
      {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 my-2 md:my-6">
        <div className="bg-surface rounded-2xl border border-slate-100 dark:border-slate-800 p-4 md:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Sparkles size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-theme-text-sec uppercase tracking-wider">Today's Special</p>
              <p className="text-2xl font-black text-theme-text-main">{specialCount}</p>
            </div>
          </div>
          <p className="text-[11px] text-theme-text-sec font-medium">Items shown in the "Today's Special" section on customer home</p>
        </div>
        <div className="bg-surface rounded-2xl border border-slate-100 dark:border-slate-800 p-4 md:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <Flame size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-theme-text-sec uppercase tracking-wider">Popular</p>
              <p className="text-2xl font-black text-theme-text-main">{popularCount}</p>
            </div>
          </div>
          <p className="text-[11px] text-theme-text-sec font-medium">Items shown in the "Popular Right Now" section on customer home</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-theme-primary/5 to-amber-500/5 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 md:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 flex items-center justify-center">
              <Clock size={20} className="text-theme-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-theme-text-sec uppercase tracking-wider">How it works</p>
            </div>
          </div>
          <p className="text-[11px] text-theme-text-sec font-medium leading-relaxed">
            Both <strong className="text-theme-text-main">✨ Special</strong> and <strong className="text-theme-text-main">🔥 Popular</strong> are separate flags.
            The <strong className="text-theme-text-main">Meal Period</strong> controls when each item appears based on time of day.
          </p>
        </div>
      </div> */}

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 my-2 md:my-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-sec" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 h-12 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 outline-none w-full focus:ring-2 focus:ring-theme-primary/20 transition-all font-medium text-sm text-theme-text-main"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-text-sec hover:text-theme-text-main rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
          {[
            { id: 'all', label: 'All Items', count: menu.length },
            { id: 'special', label: 'Specials', count: specialCount },
            { id: 'popular', label: 'Popular', count: popularCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterView(tab.id)}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${filterView === tab.id
                ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-primary'
                : 'text-theme-text-sec hover:text-theme-text-main'
                }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterView === tab.id ? 'bg-theme-primary/10 text-theme-primary' : 'bg-black/5 dark:bg-white/10'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu items grouped by category */}
      {Object.keys(groupedByCategory).length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center bg-surface/50">
          <Search size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-theme-text-main mb-2">No items found</h3>
          <p className="text-theme-text-sec text-sm max-w-sm">
            {filterView !== 'all'
              ? `No ${filterView === 'popular' ? 'popular' : 'special'} items yet. Toggle items below to feature them.`
              : 'No menu items match your search.'}
          </p>
        </div>
      ) : (
        Object.entries(groupedByCategory).map(([category, items]) => (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-theme-bg py-2 z-10">
              <h3 className="font-bold text-sm text-theme-text-main uppercase tracking-wider px-2">{category}</h3>
              <span className="text-[10px] font-bold text-theme-text-sec bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`bg-surface rounded-2xl border transition-all overflow-hidden ${item.is_popular || item.is_todays_special
                    ? 'border-theme-primary/20 dark:border-theme-primary/30 shadow-sm'
                    : 'border-slate-100 dark:border-slate-800'
                    }`}
                >
                  <div className="flex flex-col p-3 md:p-4 gap-3">
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-theme-bg relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-theme-text-sec">
                            <Star size={20} className="opacity-30" />
                          </div>
                        )}
                        {/* Veg indicator */}
                        <div className="absolute top-1 left-1 bg-white/90 dark:bg-slate-900/90 p-[2px] rounded">
                          <div className={`w-2.5 h-2.5 border flex items-center justify-center ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                            <div className={`w-1 h-1 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="font-bold text-sm md:text-base text-theme-text-main truncate">{item.name}</h4>
                        <p className="text-[12px] md:text-sm text-theme-text-sec font-medium mt-0.5">₹{item.price} · {item.category}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      {/* Today's Special toggle */}
                      <button
                        onClick={() => toggleSpecial(item)}
                        disabled={savingId === item.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border active:scale-95 ${item.is_todays_special
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-500/30 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-theme-text-sec border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:text-amber-600'
                          }`}
                      >
                        {savingId === item.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : item.is_todays_special ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        Special
                      </button>

                      {/* Popular toggle */}
                      <button
                        onClick={() => togglePopular(item)}
                        disabled={savingId === item.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border active:scale-95 ${item.is_popular
                          ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-500/30 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-theme-text-sec border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:text-orange-600'
                          }`}
                      >
                        {savingId === item.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : item.is_popular ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <Flame size={12} />
                        )}
                        Popular
                      </button>

                      {/* Meal period selector */}
                      <select
                        value={item.meal_period || ''}
                        onChange={(e) => updateMealPeriod(item, e.target.value)}
                        disabled={savingId === item.id}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border outline-none cursor-pointer ${item.meal_period
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 border-blue-200 dark:border-blue-500/30 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-theme-text-sec border-slate-200 dark:border-slate-700 hover:border-blue-300'
                          }`}
                      >
                        <option value="">Any Time</option>
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="late_night">Late Night</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
