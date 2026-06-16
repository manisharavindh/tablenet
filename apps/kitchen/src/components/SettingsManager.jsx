import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';

export default function SettingsManager() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setRestaurant(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHideTotal = async () => {
    if (!restaurant) return;

    const newValue = !restaurant.hide_customer_total;

    // Optimistic update
    setRestaurant({ ...restaurant, hide_customer_total: newValue });

    const { error } = await supabase
      .from('restaurants')
      .update({ hide_customer_total: newValue })
      .eq('id', restaurant.id);

    if (error) {
      alert("Failed to update settings. Please ensure you have run the schema migration.");
      console.error(error);
      // Revert optimistic update
      setRestaurant({ ...restaurant, hide_customer_total: !newValue });
    }
  };

  if (loading) return <div className="p-8 text-center text-secondary">Loading settings...</div>;
  if (!restaurant) return <div className="p-8 text-center text-red-500">Failed to load restaurant settings.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto pb-24">
      <div className="space-y-6">
        <div className="card p-6 flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex gap-4">
            <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
            </div>
            <div>
              <h3 className="font-bold text-lg">Hide Total Amount</h3>
            </div>
            <button
              onClick={handleToggleHideTotal}
              className={`relative w-16 h-8 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-primary/20 ${restaurant.hide_customer_total ? 'bg-primary' : 'bg-slate-200 shadow-inset'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${restaurant.hide_customer_total ? 'translate-x-8' : 'translate-x-0'}`}></div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
