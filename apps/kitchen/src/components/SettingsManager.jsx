import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import { Bell, EyeOff, Moon, Music, Grid, Settings, ArrowUpDown, Shield } from 'lucide-react';
import { SOUND_PROFILES, playNotificationSound } from '../utils/soundProfiles';
import TableManager from './TableManager';

export default function SettingsManager({ ticketSortOrder, onSortOrderChange, soundEnabled, onSoundToggle }) {
  const [activeTab, setActiveTab] = useState('general');
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeDark, setThemeDark] = useState(false);
  const [soundProfile, setSoundProfile] = useState('classic');
  const [requestSoundProfile, setRequestSoundProfile] = useState('alert');
  const [tablesCount, setTablesCount] = useState(-1);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  const [waiterPassword, setWaiterPassword] = useState('');
  const [waiterConfirmPassword, setWaiterConfirmPassword] = useState('');
  const [waiterPasswordUpdating, setWaiterPasswordUpdating] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword) return alert("Please enter your current password");
    if (newPassword !== confirmPassword) return alert("New passwords don't match");
    if (newPassword === oldPassword) return alert("New password cannot be the same as your old password");
    if (newPassword.length < 6) return alert("Password must be at least 6 characters");

    setPasswordUpdating(true);

    // 1. Verify old password by attempting to sign in
    const { data: userAuth, error: authError } = await supabase.auth.signInWithPassword({
      email: 'kitchen@tablenet.app',
      password: oldPassword
    });

    if (authError) {
      setPasswordUpdating(false);
      return alert("Incorrect old password.");
    }

    // 2. Call the RPC to update the password and forcefully delete all sessions
    const { error: rpcError } = await supabase.rpc('force_reset_user_password', {
      target_email: 'kitchen@tablenet.app',
      new_password: newPassword
    });

    setPasswordUpdating(false);

    if (rpcError) {
      alert("Failed to update password. Did you run the SQL script? Error: " + rpcError.message);
    } else {
      alert("Password updated successfully! You will now be logged out of all devices.");
      // Broadcast instant logout to all clients using this email
      // Find the active channel already opened by AuthContext
      const activeChannel = supabase.getChannels().find(c => c.topic.includes('global-auth-events'));

      if (activeChannel) {
        let retries = 5;
        while (retries > 0) {
          try {
            const status = await activeChannel.send({
              type: 'broadcast',
              event: 'force_logout',
              payload: { targetEmail: 'kitchen@tablenet.app' }
            });
            if (status === 'ok') break;
          } catch (e) {
            console.error('Broadcast failed, retrying...', e);
          }
          retries--;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  const handleUpdateWaiterPassword = async (e) => {
    e.preventDefault();
    if (waiterPassword !== waiterConfirmPassword) return alert("Passwords don't match");
    if (waiterPassword.length < 6) return alert("Password must be at least 6 characters");

    setWaiterPasswordUpdating(true);

    const { error: rpcError } = await supabase.rpc('force_reset_user_password', {
      target_email: 'waiter@tablenet.app',
      new_password: waiterPassword
    });

    setWaiterPasswordUpdating(false);

    if (rpcError) {
      alert("Failed to update waiter password. Did you run the SQL script? Error: " + rpcError.message);
    } else {
      alert("Waiter password successfully updated! Any active waiter sessions have been instantly terminated.");
      // Broadcast instant logout to all clients using this email
      // Find the active channel already opened by AuthContext
      const activeChannel = supabase.getChannels().find(c => c.topic.includes('global-auth-events'));

      if (activeChannel) {
        let retries = 5;
        while (retries > 0) {
          try {
            const status = await activeChannel.send({
              type: 'broadcast',
              event: 'force_logout',
              payload: { targetEmail: 'waiter@tablenet.app' }
            });
            if (status === 'ok') break;
          } catch (e) {
            console.error('Broadcast failed, retrying...', e);
          }
          retries--;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setWaiterPassword('');
      setWaiterConfirmPassword('');
    }
  };

  useEffect(() => {
    fetchSettings();
    const isDark = localStorage.getItem('kitchen_theme') === 'dark';
    setThemeDark(isDark);
    const savedProfile = localStorage.getItem('kitchen_sound_profile');
    if (savedProfile) setSoundProfile(savedProfile);
    const savedRequestProfile = localStorage.getItem('kitchen_request_sound_profile');
    if (savedRequestProfile) setRequestSoundProfile(savedRequestProfile);
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

        const { count } = await supabase
          .from('tables')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', data.id);

        if (count !== null) setTablesCount(count);
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header & Desktop Toggle */}
      <div className="hidden md:block p-4 md:p-8 md:pb-0 pb-0 max-w-6xl mx-auto w-full flex-shrink-0">
        <div className="flex flex-row justify-between items-center gap-4 border-b border-theme-border pb-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-theme-text-main mb-1">Settings</h2>
            <p className="text-theme-text-sec text-sm font-medium">Manage preferences, tables, and rules.</p>
          </div>
          <div className="hidden md:flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl items-center">
            <button onClick={() => setActiveTab('general')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              <Settings size={16} />
              General
            </button>
            <button onClick={() => setActiveTab('tables')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'tables' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              <Grid size={16} />
              Tables
              {tablesCount > -1 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'tables' ? 'bg-theme-primary/10 text-theme-primary' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>{tablesCount}</span>
              )}
            </button>
            <button onClick={() => setActiveTab('security')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'security' ? 'bg-white dark:bg-slate-700 shadow-sm text-theme-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              <Shield size={16} />
              Security
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Toggle */}
      <div className="md:hidden flex-shrink-0 flex p-3 px-4 gap-2 bg-surface/95 backdrop-blur-md border-b border-theme-border overflow-x-auto hide-scrollbar sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 min-h-[36px] min-w-[80px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${activeTab === 'general'
            ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
            : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
            }`}
        >
          <Settings size={14} />
          <span>General</span>
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex-1 min-h-[36px] min-w-[80px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${activeTab === 'tables'
            ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
            : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
            }`}
        >
          <Grid size={14} />
          <span>Tables</span>
          {tablesCount > -1 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'tables' ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>
              {tablesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 min-h-[36px] min-w-[80px] py-2 text-xs font-bold rounded-xl duration-300 ease-in-out flex items-center justify-center gap-1.5 ${activeTab === 'security'
            ? 'bg-theme-primary text-white border border-theme-border shadow-md shadow-theme-primary/20'
            : 'bg-theme-bg text-theme-text-sec hover:bg-surface border border-theme-border'
            }`}
        >
          <Shield size={14} />
          <span>Security</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-2">
        <div className="p-4 md:p-8 pt-0 md:pt-4 max-w-4xl mx-auto pb-28 md:pb-24 transition-colors duration-300">
          <div className={activeTab === 'general' ? "space-y-4 w-full" : "hidden"}>


            <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-5 md:p-6 transition-all duration-300 hover:border-theme-text-sec">
              <div className="flex flex-row gap-4 sm:gap-6 justify-between items-center cursor-pointer" onClick={onSoundToggle}>
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
                  onClick={onSoundToggle}
                  className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-theme-accent/20 ${soundEnabled ? 'bg-theme-accent' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${soundEnabled ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              {soundEnabled && (
                <div className="mt-6 pt-6 border-t border-theme-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

              {soundEnabled && (
                <div className="mt-4 pt-4 border-t border-theme-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <Bell size={18} className="text-theme-text-sec" />
                    <span className="font-bold text-sm text-theme-text-main">Waiter Request Sound</span>
                  </div>
                  <select
                    value={requestSoundProfile}
                    onChange={(e) => {
                      setRequestSoundProfile(e.target.value);
                      localStorage.setItem('kitchen_request_sound_profile', e.target.value);
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

            <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 transition-all duration-300 hover:border-theme-text-sec">
              <div className="flex items-center gap-4 mb-5">
                <div className="bg-theme-bg p-3.5 rounded-2xl border border-theme-border text-theme-primary">
                  <ArrowUpDown size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-theme-text-main">Ticket Sorting</h3>
                  <p className="text-sm text-theme-text-sec">Control how tickets are ordered on the Live Board.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onSortOrderChange && onSortOrderChange('oldest')}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold border transition-colors ${ticketSortOrder === 'oldest' ? 'bg-theme-primary text-white shadow-md shadow-theme-primary/20 border-theme-primary' : 'bg-theme-bg border-theme-border text-theme-text-sec hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  Oldest First
                </button>
                <button
                  onClick={() => onSortOrderChange && onSortOrderChange('newest')}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold border transition-colors ${ticketSortOrder === 'newest' ? 'bg-theme-primary text-white shadow-md shadow-theme-primary/20 border-theme-primary' : 'bg-theme-bg border-theme-border text-theme-text-sec hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  Newest First
                </button>
              </div>
            </div>

            <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-5 md:p-6 transition-all duration-300 flex flex-row gap-4 sm:gap-6 justify-between items-center hover:border-theme-text-sec cursor-pointer" onClick={handleToggleHideTotal}>
              <div className="flex gap-5 items-center">
                <div className="bg-theme-bg p-3.5 rounded-2xl border border-theme-border text-rose-500">
                  <EyeOff size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-theme-text-main">Hide Customer Totals</h3>
                  <p className="text-sm text-theme-text-sec">Do not show billing totals on the customer portal</p>
                </div>
              </div>
              <button
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-rose-500/20 ${restaurant.hide_customer_total ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${restaurant.hide_customer_total ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 transition-all duration-300 hover:border-theme-text-sec">
              <div className="mb-6">
                <h3 className="font-bold text-lg text-theme-text-main">Session & Location Restrictions</h3>
                <p className="text-sm text-theme-text-sec mt-1">Control how long customers can access the table portal, and restrict access to the physical restaurant area.</p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start sm:items-center justify-between mb-4 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-theme-text-main">Enable Session Timers</label>
                    <p className="text-xs text-theme-text-sec mt-1">If disabled, table sessions are infinite.</p>
                  </div>
                  <button
                    className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-theme-primary/20 ${restaurant.session_duration_mins > 0 ? 'bg-theme-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={() => setRestaurant({ ...restaurant, session_duration_mins: restaurant.session_duration_mins > 0 ? 0 : 30 })}
                  >
                    <div className={`absolute top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${restaurant.session_duration_mins > 0 ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>

                {restaurant.session_duration_mins > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-theme-text-main mb-2">Session Duration (Minutes)</label>
                    <input
                      type="number"
                      value={restaurant.session_duration_mins || 30}
                      onChange={(e) => setRestaurant({ ...restaurant, session_duration_mins: Math.max(1, parseInt(e.target.value) || 30) })}
                      className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    />
                    <p className="text-xs text-theme-text-sec mt-2">After this time (starting from when they scan the QR), the portal turns into a review prompt.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-theme-text-main mb-2">Google Maps Review URL</label>
                  <input
                    type="text"
                    placeholder="https://g.page/r/..."
                    value={restaurant.google_maps_url || ''}
                    onChange={(e) => setRestaurant({ ...restaurant, google_maps_url: e.target.value })}
                    className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  />
                </div>

                <div className="pt-4 border-t border-theme-border">
                  <div className="flex items-start sm:items-center justify-between mb-4 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-theme-text-main">Geofencing (Location Restriction)</label>
                      <p className="text-xs text-theme-text-sec mt-1">Require customers to be physically at the restaurant.</p>
                    </div>
                    <button
                      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-theme-primary/20 ${restaurant.geofence_enabled !== false ? 'bg-theme-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                      onClick={() => setRestaurant({ ...restaurant, geofence_enabled: restaurant.geofence_enabled === false ? true : false })}
                    >
                      <div className={`absolute top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${restaurant.geofence_enabled !== false ? 'left-6' : 'left-1'}`}></div>
                    </button>
                  </div>

                  {restaurant.geofence_enabled !== false && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-theme-text-sec mb-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={restaurant.latitude || ''}
                            onChange={(e) => setRestaurant({ ...restaurant, latitude: parseFloat(e.target.value) })}
                            className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-theme-text-sec mb-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={restaurant.longitude || ''}
                            onChange={(e) => setRestaurant({ ...restaurant, longitude: parseFloat(e.target.value) })}
                            className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-theme-text-sec mb-1">Radius (Meters)</label>
                          <input
                            type="number"
                            value={restaurant.geofence_radius_meters || 100}
                            onChange={(e) => setRestaurant({ ...restaurant, geofence_radius_meters: parseInt(e.target.value) || 100 })}
                            className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  (pos) => setRestaurant({ ...restaurant, latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                                  () => alert('Could not get location. Check browser permissions.')
                                );
                              }
                            }}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-theme-text-main font-bold py-2.5 px-4 rounded-xl text-sm transition-colors h-[42px]"
                          >
                            Get Current
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={async () => {
                    const duration = restaurant.session_duration_mins ?? 30;
                    const { error } = await supabase.from('restaurants').update({
                      session_duration_mins: duration,
                      google_maps_url: restaurant.google_maps_url,
                      geofence_enabled: restaurant.geofence_enabled !== false,
                      latitude: restaurant.latitude,
                      longitude: restaurant.longitude,
                      geofence_radius_meters: restaurant.geofence_radius_meters || 100
                    }).eq('id', restaurant.id);

                    if (duration === 0) {
                      await supabase.from('tables')
                        .update({ session_ends_at: null })
                        .eq('restaurant_id', restaurant.id)
                        .not('active_session_id', 'is', null);
                    } else {
                      const newEndsAt = new Date(Date.now() + duration * 60000).toISOString();
                      await supabase.from('tables')
                        .update({ session_ends_at: newEndsAt })
                        .eq('restaurant_id', restaurant.id)
                        .not('active_session_id', 'is', null)
                        .is('session_ends_at', null);
                    }

                    if (error) alert("Failed to save."); else alert("Saved successfully!");
                  }}
                  className="w-full btn-primary py-3 rounded-xl font-bold mt-4"
                >
                  Save Settings
                </button>
              </div>
            </div>

          </div>

          <div className={activeTab === 'tables' ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
            <TableManager />
          </div>

          <div className={activeTab === 'security' ? "space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" : "hidden"}>
            <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 transition-all duration-300">
              <h3 className="font-bold text-lg text-theme-text-main mb-0 flex items-center gap-2">
                Manage Chef Access
              </h3>
              <p className="text-sm text-theme-text-sec mb-4">Update the password for <span className="font-bold">kitchen@tablenet.app</span>. This will immediately log out all active kitchen sessions.</p>

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-bold text-theme-text-main mb-2">Old Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-theme-text-main mb-2">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-theme-text-main mb-2">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="w-full btn-primary py-3 rounded-xl font-bold mt-2 disabled:opacity-70"
                >
                  {passwordUpdating ? 'Updating...' : 'Update Chef Password'}
                </button>
              </form>
            </div>

            <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 mt-6 transition-all duration-300">
              <h3 className="font-bold text-lg text-theme-text-main mb-0 flex items-center gap-2">
                Manage Waiter Access
              </h3>
              <p className="text-sm text-theme-text-sec mb-4">Update the password for <span className="font-bold">waiter@tablenet.app</span>. This will immediately log out all active waiter sessions.</p>

              <form onSubmit={handleUpdateWaiterPassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-bold text-theme-text-main mb-2">New Waiter Password</label>
                  <input
                    type="password"
                    placeholder="Enter new waiter password"
                    className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={waiterPassword}
                    onChange={(e) => setWaiterPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-theme-text-main mb-2">Confirm Waiter Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new waiter password"
                    className="w-full bg-theme-bg border border-theme-border text-theme-text-main rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    value={waiterConfirmPassword}
                    onChange={(e) => setWaiterConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={waiterPasswordUpdating}
                  className="w-full btn-primary py-3 rounded-xl font-bold mt-2 disabled:opacity-70"
                >
                  {waiterPasswordUpdating ? 'Updating...' : 'Update Waiter Password'}
                </button>
              </form>
            </div>

            <div className="bg-surface rounded-3xl shadow-sm border border-theme-border p-6 mt-6 transition-all duration-300">
              <h3 className="font-bold text-lg text-theme-text-main mb-0 flex items-center gap-2">
                Danger Zone
              </h3>
              <p className="text-sm text-theme-text-sec mb-4">Log out of the chef portal. You will need your credentials to access it again.</p>

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="bg-danger hover:bg-danger/90 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
