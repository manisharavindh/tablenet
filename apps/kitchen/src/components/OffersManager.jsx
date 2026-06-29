import React, { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import { Tag, Plus, Pencil, Trash2, Check, X, Image as ImageIcon } from 'lucide-react';

export const OFFER_BG_IMAGES = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop", // Food spread
  "https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=800&auto=format&fit=crop", // Pizza
  "https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=800&auto=format&fit=crop", // Breakfast
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop", // Burger
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=800&auto=format&fit=crop"  // Pasta
];

export default function OffersManager({ onCountUpdate }) {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    if (onCountUpdate) onCountUpdate(offers.length);
  }, [offers, onCountUpdate]);

  const [isLoading, setIsLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [itemNames, setItemNames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setIsClosingModal(false);
      setIsCreating(false);
      setEditingOffer(null);
      setFormData({ title: '', subtitle: '', button_text: 'Order Now', bg_image_index: 1, is_active: true, action_type: 'none', action_payload: '' });
    }, 300);
  };

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    button_text: 'Order Now',
    bg_image_index: 1,
    is_active: true,
    action_type: 'none',
    action_payload: ''
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: roleData } = await supabase.from('user_roles').select('restaurant_id').eq('user_id', user.id).single();
        if (roleData) {
          setRestaurantId(roleData.restaurant_id);
          fetchOffers(roleData.restaurant_id);
          fetchMenuData(roleData.restaurant_id);
        }
      } catch (err) {
        console.error('Error initializing OffersManager:', err);
      }
    };
    init();
  }, []);

  const fetchMenuData = async (rId) => {
    if (!rId) return;
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('name, category')
        .eq('restaurant_id', rId);
      if (error) throw error;
      if (data) {
        setItemNames([...new Set(data.map(item => item.name))].filter(Boolean));
        setCategories([...new Set(data.map(item => item.category))].filter(Boolean));
      }
    } catch (err) {
      console.error('Error fetching menu data:', err);
    }
  };

  const fetchOffers = async (rId) => {
    if (!rId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', rId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(formData)
          .eq('id', editingOffer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('offers')
          .insert([{ ...formData, restaurant_id: restaurantId }]);
        if (error) throw error;
      }
      setIsCreating(false);
      setEditingOffer(null);
      setFormData({ title: '', subtitle: '', button_text: 'Order Now', bg_image_index: 1, is_active: true, action_type: 'none', action_payload: '' });
      setIsClosingModal(false); // Make sure modal closes immediately on save
      if (restaurantId) fetchOffers(restaurantId);
    } catch (err) {
      console.error('Error saving offer:', err);
      alert('Failed to save offer.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      if (restaurantId) fetchOffers(restaurantId);
    } catch (err) {
      console.error('Error deleting offer:', err);
      alert('Failed to delete offer.');
    }
  };

  const toggleActive = (offer) => {
    // Optimistic UI update for instant feedback
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: !o.is_active } : o));

    // Fire network request in background
    supabase
      .from('offers')
      .update({ is_active: !offer.is_active })
      .eq('id', offer.id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update offer active status:', error);
          if (restaurantId) fetchOffers(restaurantId); // Revert on failure
        }
      });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full p-8"><div className="animate-spin w-8 h-8 border-4 border-theme-primary border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-4 md:p-8 pt-0 md:pt-0 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3 my-3 md:my-6">
        <button
          onClick={() => setIsCreating(true)}
          className="flex-1 md:flex-none justify-center bg-theme-primary text-white rounded-2xl font-bold px-4 md:px-5 h-12 transition-all flex items-center gap-2 py-3"
        >
          <span className="inline">Add Offer</span>
        </button>
      </div>

      {(isCreating || editingOffer || isClosingModal) && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none lg:items-center lg:justify-center">
          <div className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosingModal ? 'animate-fadeOut' : 'animate-fadeIn'}`} onClick={handleCloseModal}></div>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-xl mx-auto lg:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10 pointer-events-auto ${isClosingModal ? 'animate-slideDown lg:animate-fadeOut' : 'animate-slideUp lg:animate-fadeIn'}`}>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 shrink-0 rounded-t-[2.5rem] lg:rounded-t-3xl">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </h2>
              <button type="button" onClick={handleCloseModal} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto pb-28 lg:pb-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title (e.g. Get special discount)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-theme-primary outline-none transition-colors"
                  placeholder="Enter offer title"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Subtitle (e.g. up to 85%)</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-theme-primary outline-none transition-colors"
                  placeholder="Enter offer subtitle"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Button Text</label>
                <input
                  type="text"
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-theme-primary outline-none transition-colors"
                  placeholder="e.g. Order Now"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Button Action</label>
                  <select
                    value={formData.action_type}
                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value, action_payload: '' })}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-theme-primary outline-none transition-colors"
                  >
                    <option value="none">No Action</option>
                    <option value="search">Search for Item</option>
                    <option value="category">Filter by Category</option>
                  </select>
                </div>

                {formData.action_type !== 'none' && (
                  <div className="relative">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {formData.action_type === 'search' ? 'Search Query (e.g. 65 Biriyani)' : 'Category Name (e.g. Salads)'}
                    </label>
                    <input
                      type="text"
                      value={formData.action_payload}
                      onChange={(e) => {
                        setFormData({ ...formData, action_payload: e.target.value });
                        setShowActionDropdown(true);
                      }}
                      onFocus={() => setShowActionDropdown(true)}
                      onBlur={() => setTimeout(() => setShowActionDropdown(false), 200)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-theme-primary outline-none transition-colors"
                      placeholder={formData.action_type === 'search' ? "Item to search..." : "Category to filter..."}
                    />
                    {showActionDropdown && (formData.action_type === 'search' ? itemNames : categories).filter(opt => opt.toLowerCase().includes(formData.action_payload.toLowerCase())).length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {(formData.action_type === 'search' ? itemNames : categories)
                          .filter(opt => opt.toLowerCase().includes(formData.action_payload.toLowerCase()))
                          .map(opt => (
                            <div
                              key={opt}
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-900 font-medium"
                              onClick={() => {
                                setFormData({ ...formData, action_payload: opt });
                                setShowActionDropdown(false);
                              }}
                            >
                              {opt}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Background Image</label>
                <div className="grid grid-cols-5 gap-3">
                  {OFFER_BG_IMAGES.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setFormData({ ...formData, bg_image_index: i + 1 })}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${formData.bg_image_index === i + 1 ? 'border-theme-primary shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={url} alt={`Background ${i + 1}`} className="w-full h-full object-cover" />
                      {formData.bg_image_index === i + 1 && (
                        <div className="absolute inset-0 bg-theme-primary/20 flex items-center justify-center">
                          <Check className="text-white drop-shadow-md" size={24} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-theme-primary focus:ring-theme-primary accent-theme-primary"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active (Display on customer portal)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  onClick={handleSave}
                  disabled={!formData.title || !formData.subtitle}
                  className="flex-1 bg-theme-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-theme-primary-light disabled:opacity-50 transition-colors"
                >
                  Save Offer
                </button>
                <button
                  onClick={handleCloseModal}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map(offer => (
          <div key={offer.id} className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border ${offer.is_active ? 'border-theme-primary/30' : 'border-slate-200 dark:border-slate-800'} overflow-hidden transition-all hover:shadow-md`}>

            <div className="relative aspect-[2/1] overflow-hidden">
              <img
                src={OFFER_BG_IMAGES[(offer.bg_image_index || 1) - 1]}
                alt="Offer Background"
                className="w-full h-full object-cover transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent flex flex-col justify-center p-5">
                <span className="text-white/90 text-sm font-medium">{offer.title}</span>
                <span className="text-white text-2xl font-extrabold tracking-tight mt-0.5">{offer.subtitle}</span>
                <div className="mt-3 bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg w-fit shadow-sm">
                  {offer.button_text}
                </div>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between bg-white dark:bg-slate-900">
              <button
                onClick={() => toggleActive(offer)}
                className="flex items-center gap-2"
              >
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out ${offer.is_active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ease-in-out shadow-sm ${offer.is_active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
                <span className={`text-sm font-bold ${offer.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                  {offer.is_active ? 'Active' : 'Inactive'}
                </span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingOffer(offer);
                    setFormData({
                      title: offer.title,
                      subtitle: offer.subtitle,
                      button_text: offer.button_text || 'Order Now',
                      bg_image_index: offer.bg_image_index || 1,
                      is_active: offer.is_active,
                      action_type: offer.action_type || 'none',
                      action_payload: offer.action_payload || ''
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 text-slate-400 hover:text-theme-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {offers.length === 0 && !isLoading && !isCreating && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Tag size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No offers found.</p>
            <p className="text-sm mt-1">Create an offer to display it on the customer portal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
