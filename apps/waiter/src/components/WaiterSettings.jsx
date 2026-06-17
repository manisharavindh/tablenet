import { useState, useEffect } from 'react';
import { X, Bell, Music } from 'lucide-react';
import { SOUND_PROFILES, playNotificationSound } from '../utils/soundProfiles';

export default function WaiterSettings({ onClose }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundProfile, setSoundProfile] = useState('classic');

  useEffect(() => {
    const isSoundDisabled = localStorage.getItem('waiter_sound_disabled') === 'true';
    setSoundEnabled(!isSoundDisabled);
    const savedProfile = localStorage.getItem('waiter_sound_profile');
    if (savedProfile) setSoundProfile(savedProfile);
  }, []);

  const handleToggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    if (!newValue) {
      localStorage.setItem('waiter_sound_disabled', 'true');
    } else {
      localStorage.removeItem('waiter_sound_disabled');
      playNotificationSound(soundProfile);
    }
  };

  const handleProfileChange = (e) => {
    const newProfile = e.target.value;
    setSoundProfile(newProfile);
    localStorage.setItem('waiter_sound_profile', newProfile);
    playNotificationSound(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in duration-300">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="bg-surface w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 sm:hidden"></div>
        
        <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-theme-text-main">Settings</h2>
            <p className="text-sm font-bold text-slate-400">Waiter Preferences</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
          >
            <X size={24} className="text-theme-text-main" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto pb-12 flex-1">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
            <div className="flex justify-between items-center cursor-pointer" onClick={handleToggleSound}>
              <div className="flex gap-4 items-center">
                <div className="bg-theme-bg p-3 rounded-2xl border border-slate-100 text-theme-accent">
                  <Bell size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-theme-text-main leading-tight">Order Alerts</h3>
                  <p className="text-xs text-slate-500 font-medium">Sound when order is ready</p>
                </div>
              </div>
              <button
                className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${soundEnabled ? 'bg-theme-accent' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${soundEnabled ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>
            
            {soundEnabled && (
              <div className="mt-5 pt-5 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <Music size={16} className="text-slate-400" />
                  <span className="font-bold text-sm text-theme-text-main">Sound</span>
                </div>
                <select 
                  value={soundProfile}
                  onChange={handleProfileChange}
                  className="bg-theme-bg border border-slate-200 text-theme-text-main text-sm font-bold rounded-xl px-3 py-2 outline-none focus:border-theme-primary cursor-pointer"
                >
                  {SOUND_PROFILES.map(profile => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
