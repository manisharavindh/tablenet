import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import { Bell, EyeOff, Moon, Music } from 'lucide-react';
import { SOUND_PROFILES, playNotificationSound } from '../utils/soundProfiles';

export default function SettingsManager() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [themeDark, setThemeDark] = useState(false);
  const [soundProfile, setSoundProfile] = useState('classic');

  useEffect(() => {
    fetchSettings();
    const isSoundDisabled = localStorage.getItem('kitchen_sound_disabled') === 'true';
    setSoundEnabled(!isSoundDisabled);
    const isDark = localStorage.getItem('kitchen_theme') === 'dark';
    setThemeDark(isDark);
    const savedProfile = localStorage.getItem('kitchen_sound_profile');
    if (savedProfile) setSoundProfile(savedProfile);
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
    setRestaurant({ ...restaurant, hide_customer_total: newValue });

    const { error } = await supabase
      .from('restaurants')
      .update({ hide_customer_total: newValue })
      .eq('id', restaurant.id);

    if (error) {
      alert("Failed to update settings.");
      setRestaurant({ ...restaurant, hide_customer_total: !newValue });
    }
  };

  const handleToggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    if (!newValue) {
      localStorage.setItem('kitchen_sound_disabled', 'true');
    } else {
      localStorage.removeItem('kitchen_sound_disabled');
      // Play a test sound to confirm it's on
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {}
    }
  };

  const handleToggleTheme = () => {
    const newValue = !themeDark;
    setThemeDark(newValue);
    if (newValue) {
      localStorage.setItem('kitchen_theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      localStorage.setItem('kitchen_theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  };

  if (loading) return <div className="p-8 text-center text-theme-text-sec">Loading settings...</div>;
  if (!restaurant) return <div className="p-8 text-center text-red-500">Failed to load restaurant settings.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto pb-24 transition-colors duration-300">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-theme-text-main mb-1">Settings</h2>
        <p className="text-theme-text-sec text-sm font-medium">Manage preferences for this Kitchen Display System</p>
      </div>

      <div className="space-y-4">
        <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 transition-all duration-300 flex flex-col sm:flex-row gap-6 justify-between items-center hover:border-theme-text-sec cursor-pointer" onClick={handleToggleTheme}>
          <div className="flex gap-5 items-center">
            <div className="bg-theme-bg p-3.5 rounded-2xl border border-theme-border text-indigo-500">
              <Moon size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-theme-text-main">Dark Theme</h3>
              <p className="text-sm text-theme-text-sec">Switch between light and dark modes</p>
            </div>
          </div>
          <button
            className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 ${themeDark ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <div className={`absolute top-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${themeDark ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 transition-all duration-300 hover:border-theme-text-sec">
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-center cursor-pointer" onClick={handleToggleSound}>
            <div className="flex gap-5 items-center">
              <div className="bg-theme-bg p-3.5 rounded-2xl border border-theme-border text-theme-accent">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-theme-text-main">New Order Notifications</h3>
                <p className="text-sm text-theme-text-sec">Play a sound when a new ticket arrives</p>
              </div>
            </div>
            <button
              className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-theme-accent/20 ${soundEnabled ? 'bg-theme-accent' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${soundEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
          
          {soundEnabled && (
            <div className="mt-6 pt-6 border-t border-theme-border flex items-center justify-between gap-4">
              <div className="flex gap-3 items-center">
                <Music size={18} className="text-theme-text-sec" />
                <span className="font-bold text-sm text-theme-text-main">Alert Sound</span>
              </div>
              <select 
                value={soundProfile}
                onChange={(e) => {
                  setSoundProfile(e.target.value);
                  localStorage.setItem('kitchen_sound_profile', e.target.value);
                  playNotificationSound(e.target.value);
                }}
                className="bg-theme-bg border border-theme-border text-theme-text-main text-sm font-bold rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 cursor-pointer"
              >
                {SOUND_PROFILES.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 transition-all duration-300 flex flex-col sm:flex-row gap-6 justify-between items-center hover:border-theme-text-sec cursor-pointer" onClick={handleToggleHideTotal}>
          <div className="flex gap-5 items-center">
            <div className="bg-theme-bg p-3.5 rounded-2xl border border-theme-border text-amber-500">
              <EyeOff size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-theme-text-main">Hide Total Amount</h3>
              <p className="text-sm text-theme-text-sec">Hide total amount from customer view</p>
            </div>
          </div>
          <button
            className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-amber-500/20 ${restaurant.hide_customer_total ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <div className={`absolute top-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${restaurant.hide_customer_total ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
      </div>
    </div>
  );
}
