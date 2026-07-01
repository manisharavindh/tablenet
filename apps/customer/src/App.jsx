import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ShoppingBag, Home, Menu as MenuIcon, FileText, Bell, Coffee, Search, Plus, Minus, Clock, X, Star } from 'lucide-react';
import MenuPage from './components/MenuPage';
import CartPage from './components/CartPage';
import OrderTrackingPage from './components/OrderTrackingPage';
import AssistanceModal from './components/AssistanceModal';
import ImageFallback from './components/ImageFallback';
import Logo from './components/Logo';
import { supabase } from '@tablenet/supabase';
import ExtendSessionModal from './components/ExtendSessionModal';
import ReviewModal from './components/ReviewModal';
import MenuOnlyModal from './components/MenuOnlyModal';

export const OFFER_BG_IMAGES = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=800&auto=format&fit=crop"
];

function CustomerView() {
  const { qrToken } = useParams();
  const [tableNumber, setTableNumber] = useState('');
  const [tableId, setTableId] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDurationMins, setSessionDurationMins] = useState(30);
  const [sessionRemainingMins, setSessionRemainingMins] = useState(null);
  const [sessionEndsAt, setSessionEndsAt] = useState(null);
  const [customerExtendedTime, setCustomerExtendedTime] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [isClosingExtend, setIsClosingExtend] = useState(false);
  const [extendingSession, setExtendingSession] = useState(false);
  const [sessionWarningShown, setSessionWarningShown] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasShownReviewModal, setHasShownReviewModal] = useState(false);
  const [showMenuOnlyModal, setShowMenuOnlyModal] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState('default');

  // Session secret from server — stored in sessionStorage (cleared on tab close)
  const getSessionSecret = () => sessionStorage.getItem('tablenet_session_secret');
  const setSessionSecret = (secret) => {
    if (secret) sessionStorage.setItem('tablenet_session_secret', secret);
    else sessionStorage.removeItem('tablenet_session_secret');
  };

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('tablenet_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('tablenet_cart', JSON.stringify(cart));
  }, [cart]);
  const [activeTab, setActiveTab] = useState('home');
  const [activeOrders, setActiveOrders] = useState([]);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [isAssistanceModalOpen, setIsAssistanceModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [popularItems, setPopularItems] = useState([]);
  const [todaysSpecialItems, setTodaysSpecialItems] = useState([]);
  const [offers, setOffers] = useState([]);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const lastOfferInteractionRef = useRef(0);
  const carouselRef = useRef(null);
  const [categories, setCategories] = useState(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [suggestedItems, setSuggestedItems] = useState([]);

  const handleCloseExtend = () => {
    setIsClosingExtend(true);
    setTimeout(() => {
      setIsClosingExtend(false);
      setShowExtendModal(false);
    }, 200);
  };

  const [hideTotal, setHideTotal] = useState(false);
  const [chefInstructions, setChefInstructions] = useState('');
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [showCartPage, setShowCartPage] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const resolveTable = async () => {
      if (!qrToken || qrToken === 'invalid-table') {
        fallbackReadOnly('invalid_qr');
        return;
      }

      try {
        // Server-side session claim via RPC
        const { data, error } = await supabase.rpc('claim_table_session', {
          p_qr_token: qrToken
        });

        if (error || !data) {
          console.error('Session claim error:', error);
          fallbackReadOnly('invalid_qr');
          return;
        }

        if (data.error === 'invalid_table') {
          fallbackReadOnly('invalid_qr');
          return;
        }

        if (data.error) {
          console.error('Session claim rejected:', data.message);
          fallbackReadOnly('invalid_qr');
          return;
        }

        // Session claimed or joined successfully
        setTableNumber(data.table_number);
        setTableId(data.table_id);
        setRestaurantId(data.restaurant_id);
        setSessionId(data.session_id || data.session_secret);
        setSessionDurationMins(data.session_duration_mins ?? 30);
        setSessionStartTime(data.session_start_time);
        setSessionEndsAt(data.session_ends_at);
        setCustomerExtendedTime(data.customer_extended_time);
        setGoogleMapsUrl(data.google_maps_url || '');
        setHideTotal(data.hide_customer_total || false);
        setSessionSecret(data.session_secret);

        // Geofence check (client-side for UX only — server validates session_secret for all writes)
        const geofenceEnabled = data.geofence_enabled !== false;

        if (geofenceEnabled && data.latitude && data.longitude && data.geofence_radius_meters) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const R = 6371e3;
                const lat1 = pos.coords.latitude * Math.PI / 180;
                const lat2 = data.latitude * Math.PI / 180;
                const dLat = (data.latitude - pos.coords.latitude) * Math.PI / 180;
                const dLon = (data.longitude - pos.coords.longitude) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                if (distance > data.geofence_radius_meters) {
                  setIsReadOnly(true);
                  setReadOnlyReason('geofence_out_of_bounds');
                  setActiveTab('home');
                }
                setLoading(false);
              },
              () => {
                // Geolocation denied — set read-only but session is still valid
                setIsReadOnly(true);
                setReadOnlyReason('geofence_denied');
                setActiveTab('home');
                setLoading(false);
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            return;
          } else {
            setIsReadOnly(true);
            setReadOnlyReason('geofence_unsupported');
            setActiveTab('home');
            setLoading(false);
            return;
          }
        }

        setLoading(false);
      } catch (e) {
        console.error('Session resolve error:', e);
        fallbackReadOnly();
      }
    };

    const fallbackReadOnly = async (reason = 'default') => {
      setIsReadOnly(true);
      setReadOnlyReason(reason);
      setActiveTab('home');
      setTableNumber('');
      const { data: restData } = await supabase.from('restaurants').select('id').limit(1).single();
      if (restData) setRestaurantId(restData.id);
      setLoading(false);
    };

    resolveTable();
  }, [qrToken]);

  // Session countdown timer — updates every 10 seconds
  useEffect(() => {
    if (!isReadOnly && sessionEndsAt && !isSessionExpired) {
      const updateRemaining = () => {
        const endsAt = new Date(sessionEndsAt).getTime();
        const now = new Date().getTime();
        const remainingMs = endsAt - now;
        const remainingMins = Math.ceil(remainingMs / 60000);

        if (remainingMs <= 0) {
          // Session expired — server will handle cleanup on next RPC call
          // Just update the UI gracefully
          setIsSessionExpired(true);
          setSessionRemainingMins(0);
          setSessionSecret(null);
          localStorage.removeItem('tablenet_cart');
          setCart([]);
          setShowExtendModal(false);
          return;
        }

        setSessionRemainingMins(remainingMins);

        // Show warning at 5 minutes
        if (remainingMins <= 5 && !sessionWarningShown) {
          setSessionWarningShown(true);
          showToast(`Session ends in ${remainingMins} min`);
        }
      };

      updateRemaining(); // Run immediately
      const interval = setInterval(updateRemaining, 10000);
      return () => clearInterval(interval);
    } else if (!sessionEndsAt) {
      setSessionRemainingMins(null);
    }
  }, [isReadOnly, sessionEndsAt, isSessionExpired, sessionWarningShown]);

  useEffect(() => {
    if (tableNumber) {
      document.title = `TableNet Table ${tableNumber}`;
    } else {
      document.title = 'TableNet Menu';
    }
  }, [tableNumber]);

  const handleExtendSession = async (minutes) => {
    const sessionSecret = getSessionSecret();
    setExtendingSession(true);
    try {
      const { data, error } = await supabase.rpc('extend_table_session', {
        p_table_id: tableId,
        p_session_secret: sessionSecret,
        p_additional_minutes: minutes,
        p_is_customer: true
      });

      if (error || data?.error) {
        showToast(data?.message || error?.message || 'Failed to extend session.', 'error');
      } else {
        showToast(`Session extended by ${minutes} minutes.`, 'success');
        handleCloseExtend();
      }
    } catch (err) {
      showToast('An error occurred while extending the session.');
    } finally {
      setExtendingSession(false);
      setShowExtendModal(false);
    }
  };

  useEffect(() => {
    const currentSessionSecret = getSessionSecret();
    if (!tableId || !currentSessionSecret || isSessionExpired) return;

    const pollSessionState = async () => {
      const { data, error } = await supabase.rpc('get_customer_session_state', {
        p_session_secret: currentSessionSecret
      });

      if (error) {
        console.error('Error polling session state:', error);
        return;
      }

      if (data) {
        if (!data.active) {
          setIsSessionExpired(true);
          setSessionSecret(null);
          setSessionRemainingMins(0);
          localStorage.removeItem('tablenet_cart');
          setCart([]);
          handleCloseExtend();
        } else {
          // Update session metadata
          if (data.session_ends_at) {
            setSessionEndsAt(data.session_ends_at);
          }
          if (data.customer_extended_time !== undefined) {
            setCustomerExtendedTime(data.customer_extended_time);
          }

          // Update orders
          if (data.orders && data.orders.length > 0) {
            setActiveOrders(data.orders);
            setHasOrdered(true);
          }
        }
      }
    };

    pollSessionState(); // Initial fetch
    const intervalId = setInterval(pollSessionState, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [tableId, isSessionExpired]);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchHomeData = async () => {
      // Fetch offers
      const { data: offersData } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (offersData) setOffers(offersData);

      // Fetch items based on time
      const getMealPeriod = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) return 'breakfast';
        if (hour >= 11 && hour < 16) return 'lunch';
        if (hour >= 16 && hour < 23) return 'dinner';
        return 'late_night';
      };

      const currentPeriod = getMealPeriod();

      // Fetch Today's Special — items marked as today's special, filtered by meal period
      const { data: todaysSpecialData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_todays_special', true)
        .eq('is_available', true)
        .or(`meal_period.eq.${currentPeriod},meal_period.is.null,meal_period.eq.`);

      if (todaysSpecialData && todaysSpecialData.length > 0) {
        setTodaysSpecialItems(todaysSpecialData);
      } else {
        // Fallback: show all today's special items regardless of meal period
        const { data: fallbackSpecials } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_todays_special', true)
          .eq('is_available', true)
          .limit(6);
        if (fallbackSpecials) setTodaysSpecialItems(fallbackSpecials);
      }

      // Fetch Popular Items — items marked as popular, filtered by meal period
      const { data: popularData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_popular', true)
        .eq('is_available', true)
        .or(`meal_period.eq.${currentPeriod},meal_period.is.null,meal_period.eq.`);

      if (popularData && popularData.length > 0) {
        setPopularItems(popularData);
      } else {
        // Fallback: show all popular items regardless of meal period
        const { data: fallbackData } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_popular', true)
          .eq('is_available', true)
          .limit(6);
        if (fallbackData) setPopularItems(fallbackData);
      }

      // Fetch categories
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('category')
        .eq('restaurant_id', restaurantId);

      if (menuData) {
        const cats = ['All', ...new Set(menuData.map(item => item.category || 'Uncategorized'))];
        setCategories(cats);
      }

      // Fetch suggested items for upselling (once)
      const { data: allMenuItems } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true);

      if (allMenuItems) {
        const targetKeywords = ['dessert', 'ice cream', 'juice', 'sweet', 'beverage', 'drink', 'shake'];
        let pool = allMenuItems.filter(item =>
          targetKeywords.some(keyword => (item.category || '').toLowerCase().includes(keyword))
        );

        if (pool.length === 0) pool = allMenuItems.filter(item => item.is_popular);
        if (pool.length === 0) pool = allMenuItems;

        // Only shuffle and set if not already set, or if we want to refresh on every realtime update. 
        // We'll just set it. It rarely updates.
        const shuffled = pool.sort(() => 0.5 - Math.random());
        setSuggestedItems(shuffled.slice(0, 6));
      }

      // Fetch settings
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('hide_customer_total')
        .eq('id', restaurantId)
        .single();
      if (restaurantData) {
        setHideTotal(restaurantData.hide_customer_total);
      }
      setDataLoading(false);
    };

    fetchHomeData();

    // Subscribe to restaurant settings changes
    const restChannel = supabase.channel(`public:restaurants:${restaurantId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${restaurantId}` }, (payload) => {
        if (payload.new && payload.new.hide_customer_total !== undefined) {
          setHideTotal(payload.new.hide_customer_total);
        }
      }).subscribe();

    // Subscribe to menu changes for live updating Popular Items and Out of Stock on the home screen
    const menuChannel = supabase.channel(`public:menu_items:${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchHomeData();
      }).subscribe();

    // Subscribe to offers changes
    const offersChannel = supabase.channel(`public:offers:${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        fetchHomeData();
      }).subscribe();

    return () => {
      supabase.removeChannel(restChannel);
      supabase.removeChannel(menuChannel);
      supabase.removeChannel(offersChannel);
    };
  }, [restaurantId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Deprecated realtime table subscription removed in favor of polling in the main effect


  useEffect(() => {
    if (isSessionExpired) {
      window.history.replaceState(null, '', '/invalid-table');
    }
  }, [isSessionExpired]);

  useEffect(() => {
    if (activeOrders.length > 0 && activeOrders.every(o => o.status === 'served') && !hasShownReviewModal && googleMapsUrl && !isSessionExpired) {
      const timer = setTimeout(() => {
        setShowReviewModal(true);
        setHasShownReviewModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeOrders, hasShownReviewModal, googleMapsUrl, isSessionExpired]);

  const handleAddToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handlePlaceOrder = async (instructions = '') => {
    const sessionSecret = getSessionSecret();
    if (!tableId || !sessionSecret) {
      showToast('Session expired. Please scan the QR code again.');
      return;
    }

    const orderItems = cart;
    setCart([]);
    setChefInstructions('');

    const { data, error } = await supabase.rpc('place_order_validated', {
      p_table_id: tableId,
      p_session_secret: sessionSecret,
      p_items: orderItems,
      p_chef_instructions: instructions || null
    });

    if (error) {
      console.error('Error placing order:', error);
      setCart(orderItems); // Restore cart on error
      showToast('Failed to place order. Please try again.');
      return;
    }

    if (data?.error === 'session_expired' || data?.error === 'invalid_session') {
      setIsSessionExpired(true);
      setSessionSecret(null);
      setCart(orderItems); // Restore cart so they know what was lost
      return;
    }

    if (data?.status === 'success') {
      setActiveTab('tracking');

      // Force an immediate update so the user doesn't wait for the next poll
      const { data: updateData } = await supabase.rpc('get_customer_session_state', {
        p_session_secret: sessionSecret
      });

      if (updateData?.active && updateData.orders) {
        setActiveOrders(updateData.orders);
        setHasOrdered(true);
      }
    }
  };

  const handleRequestAssistance = async (type) => {
    const sessionSecret = getSessionSecret();
    if (!tableId || !sessionSecret) {
      showToast('Session expired. Please scan the QR code again.');
      return;
    }

    const { data, error } = await supabase.rpc('request_assistance_validated', {
      p_table_id: tableId,
      p_session_secret: sessionSecret,
      p_request_type: type
    });

    if (error) {
      console.error('Error requesting assistance:', error);
      showToast('Failed to send request. Please try again.');
      return;
    }

    if (data?.error === 'session_expired' || data?.error === 'invalid_session') {
      setIsSessionExpired(true);
      setSessionSecret(null);
      return;
    }

    if (data?.status === 'success') {
      showToast(type === 'Waiter' ? 'Waiter called' : `${type} requested`);
    }
  };

  // Auto-scroll offers
  useEffect(() => {
    let interval;
    if (offers.length > 1) {
      interval = setInterval(() => {
        if (Date.now() - lastOfferInteractionRef.current < 6000) return;
        if (carouselRef.current) {
          const container = carouselRef.current;
          const currentScroll = container.scrollLeft;
          const children = Array.from(container.children);
          if (children.length === 0) return;

          let currentIndex = 0;
          for (let i = 0; i < children.length; i++) {
            if (children[i].offsetLeft - container.offsetLeft >= currentScroll - 20) {
              currentIndex = i;
              break;
            }
          }

          const nextIndex = (currentIndex + 1) >= children.length ? 0 : currentIndex + 1;
          const targetChild = children[nextIndex];

          container.scrollTo({
            left: targetChild.offsetLeft - container.offsetLeft - 16,
            behavior: 'smooth'
          });
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [offers.length]);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isOverlayActive = loading || dataLoading || isSessionExpired;

  const handleOfferScroll = (e) => {
    lastOfferInteractionRef.current = Date.now();
    if (!carouselRef.current) return;
    const scrollPosition = e.target.scrollLeft;
    const slideWidth = e.target.clientWidth;
    const newIndex = Math.round(scrollPosition / slideWidth);
    setCurrentOfferIndex(newIndex);
  };

  return (
    <div className={`relative font-sans bg-theme-bg ${isOverlayActive ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh] pb-24'}`}>
      {(loading || dataLoading) && !isSessionExpired && (
        <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[999] bg-theme-bg flex flex-col items-center justify-center font-sans h-[100dvh]">
          <Logo className="w-80 max-w-[85vw] h-auto" />
          <style>{`
            @keyframes dotPulse {
              0%, 100% { transform: scale(1); opacity: 0.4; }
              50% { transform: scale(1.4); opacity: 1; }
            }
          `}</style>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-[#E23744] rounded-full" style={{ animation: 'dotPulse 1.2s ease-in-out infinite', animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-[#E23744] rounded-full" style={{ animation: 'dotPulse 1.2s ease-in-out infinite', animationDelay: '200ms' }}></span>
            <span className="w-2 h-2 bg-[#E23744] rounded-full" style={{ animation: 'dotPulse 1.2s ease-in-out infinite', animationDelay: '400ms' }}></span>
          </div>
        </div>
      )}

      {isSessionExpired && (
        <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] flex flex-col items-center justify-center font-sans p-6 text-center bg-theme-surface pointer-events-auto animate-fadeIn overflow-hidden">

          {/* Aesthetic background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-bl-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-theme-primary/10 rounded-br-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-slate-500/5 rounded-t-full blur-3xl pointer-events-none"></div>

          <div className="w-full max-w-[280px] mx-auto flex flex-col items-center relative z-20">
            <Logo className="w-64 max-w-[80vw] h-auto mb-8" />

            <h2 className="text-[28px] font-black text-theme-text-main tracking-tight mb-3">Hope you enjoyed!</h2>
            <p className="text-theme-text-sec text-[15px] font-medium leading-relaxed mb-10">
              Thank you for dining with us. Your table session has now ended.
            </p>

            <div className="flex flex-col gap-4 w-full">
              {googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-theme-primary hover:bg-theme-primary-light text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-theme-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-2.5"
                >
                  Leave a Review on Google
                </a>
              ) : (
                <div className="w-full bg-theme-primary/10 text-theme-primary font-bold text-sm py-4 px-6 rounded-2xl border border-theme-primary/20">
                  Session Closed
                </div>
              )}

              <div className="pt-2 flex flex-col items-center w-full">
                <button
                  onClick={() => {
                    setIsSessionExpired(false);
                    setIsReadOnly(true);
                    setReadOnlyReason('session_ended');
                    setActiveTab('home');
                    window.history.replaceState(null, '', '/invalid-table');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-theme-text-main font-bold py-4 px-6 rounded-2xl shadow-sm active:scale-95 transition-transform border border-slate-200/50 mb-3"
                >
                  Open Menu
                </button>
                <p className="text-theme-text-sec text-xs font-medium text-center flex items-center justify-center gap-1.5 opacity-80">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  Scan the QR for table access
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Session Modal */}
      <ExtendSessionModal
        isOpen={showExtendModal}
        isClosing={isClosingExtend}
        onClose={handleCloseExtend}
        onExtend={handleExtendSession}
        extendingSession={extendingSession}
        sessionRemainingMins={sessionRemainingMins}
        customerExtendedTime={customerExtendedTime}
        isCustomer={true}
      />

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        googleMapsUrl={googleMapsUrl}
        onMenuOnly={() => {
          setShowReviewModal(false);
          setIsSessionExpired(false);
          setIsReadOnly(true);
          setReadOnlyReason('session_ended');
          setActiveTab('home');
          window.history.replaceState(null, '', '/invalid-table');
        }}
      />

      {/* Cart Page Overlay */}
      {showCartPage && !isSessionExpired && (
        <>
          <header className="sticky top-0 z-30 bg-theme-surface px-4 py-4 max-w-md mx-auto flex items-center justify-between border-b border-slate-100 shadow-sm">
            <div>
              <div className="text-[10px] font-bold text-theme-text-sec uppercase tracking-widest">tablenet • Table {tableNumber}</div>
              <div className="font-bold text-xl tracking-tight text-theme-text-main mt-0.5">
                {isReadOnly ? `${getGreeting()}!` : (
                  <>
                    {activeTab === 'home' && `${getGreeting()}!`}
                    {activeTab === 'menu' && 'Our Menu'}
                    {activeTab === 'tracking' && 'Live Orders'}
                    {activeTab === 'cart' && 'Your Cart'}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isReadOnly ? (
                <button
                  onClick={() => setShowMenuOnlyModal(true)}
                  className="px-3 py-1 rounded-xl border border-amber-100 bg-amber-50 text-amber-500 font-bold text-xs shadow-sm uppercase tracking-wider"
                >
                  {/* <Info size={14} strokeWidth={2.5} /> */}
                  Menu Only
                </button>
              ) : (
                <>
                  {sessionRemainingMins !== null && (
                    <button
                      onClick={() => setShowExtendModal(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm border transition-all active:scale-95 ${sessionRemainingMins <= 5
                        ? 'bg-red-50 text-red-600 border-red-200 animate-pulse shadow-red-500/20'
                        : sessionRemainingMins <= 10
                          ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-500/20'
                          : 'bg-white/80 backdrop-blur-md text-theme-text-main border-slate-200/50 shadow-black/5 hover:bg-white'
                        }`}
                    >
                      <Clock size={14} className={sessionRemainingMins <= 5 ? "animate-bounce" : ""} />
                      {sessionRemainingMins}m left
                    </button>
                  )}
                </>
              )}
            </div>
          </header>

          <main className="max-w-md mx-auto">
            <div className={activeTab === 'home' ? 'block' : 'hidden'}>
              <div className="space-y-5 mt-4 pb-20">

                {/* ─── Search Bar ─── */}
                <div className="px-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchInput.trim()) {
                        setSearchQuery(searchInput);
                        setActiveCategory('All');
                        setActiveTab('menu');
                      }
                    }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-theme-primary/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-white border border-slate-200/80 rounded-2xl flex items-center p-1 shadow-sm transition-all duration-300 group-focus-within:border-theme-primary/30 group-focus-within:shadow-md group-focus-within:shadow-theme-primary/5">
                      <div className="pl-4 pr-2">
                        <Search size={20} className="text-slate-400 group-focus-within:text-theme-primary transition-colors" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search your favorite food..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full py-3 pr-2 bg-transparent outline-none text-slate-700 font-bold placeholder:text-slate-400 placeholder:font-medium text-[15px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (searchInput.trim()) {
                            setSearchQuery(searchInput);
                          } else {
                            setSearchQuery('');
                          }
                          setActiveCategory('All');
                          setActiveTab('menu');
                        }}
                        className="flex-shrink-0 bg-theme-primary text-white text-[12px] font-bold px-4 py-2.5 rounded-xl mr-0.5 active:scale-95 transition-transform hover:bg-theme-primary-light shadow-sm"
                      >
                        {searchInput.trim() ? 'Search' : 'Menu'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* ─── Offers Carousel ─── */}
                {offers.length > 0 && (
                  <div className="relative">
                    <div
                      ref={carouselRef}
                      onScroll={handleOfferScroll}
                      className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 px-4"
                    >
                      {offers.map((offer) => (
                        <div key={offer.id} className="w-full snap-center relative aspect-[21/9] overflow-hidden shrink-0 bg-[#2A2D3E] rounded-2xl">
                          <div className="absolute right-0 top-0 bottom-0 w-[65%]">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#2A2D3E] via-[#2A2D3E]/80 to-transparent z-10" />
                            <img
                              src={OFFER_BG_IMAGES[(offer.bg_image_index || 1) - 1]}
                              alt="Offer"
                              className="w-full h-full object-cover opacity-90"
                            />
                          </div>
                          <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-center z-20 w-[80%]">
                            <span className="text-white/90 text-[13px] md:text-[14px] font-medium tracking-wide">{offer.title}</span>
                            <span className="text-white text-[28px] md:text-[32px] font-extrabold tracking-tight mt-0.5 mb-3 leading-none">{offer.subtitle}</span>
                            <button
                              onClick={() => {
                                if (offer.action_type === 'search') {
                                  setSearchQuery(offer.action_payload || '');
                                  setActiveCategory('All');
                                  setActiveTab('menu');
                                } else if (offer.action_type === 'category') {
                                  setActiveCategory(offer.action_payload || 'All');
                                  setSearchQuery('');
                                  setActiveTab('menu');
                                }
                              }}
                              className="bg-white text-slate-900 text-[12px] md:text-[13px] font-bold px-4 py-2 rounded-xl w-fit shadow-sm active:scale-95 transition-transform hover:bg-slate-50"
                            >
                              {offer.button_text || 'Order Now'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {offers.length > 1 && (
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-30">
                        {offers.map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${currentOfferIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Today's Special — Horizontal Scroll ─── */}
                {todaysSpecialItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-4 mb-3">
                      <div className="flex items-center gap-2">
                        {/* <div className="w-1 h-5 bg-theme-primary rounded-full"></div> */}
                        <h3 className="font-extrabold text-[17px] text-theme-text-main tracking-tight">Today's Special</h3>
                      </div>
                      <button
                        onClick={() => { setActiveCategory('All'); setSearchQuery(''); setActiveTab('menu'); }}
                        className="text-theme-primary text-[12px] font-bold px-3 py-1 rounded-lg bg-theme-primary/10 hover:bg-theme-primary/20 transition-colors"
                      >
                        See all
                      </button>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar gap-3 px-4 pb-1">
                      {todaysSpecialItems.map((item) => {
                        const cartItem = cart?.find(i => i.id === item.id);
                        return (
                          <div key={item.id} className="w-[180px] flex-shrink-0 bg-theme-surface rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden flex flex-col transition-all">
                            <div className="relative aspect-[3/2]">
                              <ImageFallback src={item.image_url} name={item.name} className="w-full h-full object-cover" />
                              {/* Gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                              {/* Veg/Non-Veg badge */}
                              <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm p-[3px] rounded-md shadow-sm">
                                <div className={`w-3 h-3 border-[1.5px] flex items-center justify-center rounded-sm ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                                </div>
                              </div>
                              {/* Today's special badge */}
                              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                <span>✨</span> Special
                              </div>
                            </div>
                            <div className="p-3 flex flex-col flex-grow">
                              <h4 className="font-bold text-[13px] leading-tight text-theme-text-main line-clamp-2 mb-1">{item.name}</h4>
                              {item.description && (
                                <p className="text-[10px] text-theme-text-sec font-medium line-clamp-1 mb-2">{item.description}</p>
                              )}
                              <div className="flex items-center justify-between mt-auto pt-1">
                                <div>
                                  <span className="font-extrabold text-[15px] text-theme-text-main">₹{Math.round(item.price)}</span>
                                  <span className="text-[8px] font-bold text-theme-text-sec block tracking-wider">+5% GST</span>
                                </div>
                                {isReadOnly ? (
                                  <div className="text-[9px] font-bold text-theme-text-sec uppercase tracking-wider">View</div>
                                ) : cartItem ? (
                                  <div className="flex items-center bg-theme-primary rounded-lg overflow-hidden">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                                      <Minus size={13} strokeWidth={3} />
                                    </button>
                                    <span className="text-white font-bold text-[12px] w-4 text-center">{cartItem.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                                      <Plus size={13} strokeWidth={3} />
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleAddToCart(item)} className="bg-theme-primary text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase active:scale-95 transition-transform shadow-sm">
                                    ADD
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── Popular Items — Horizontal Scroll ─── */}
                {popularItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-4 mb-3">
                      <div className="flex items-center gap-2">
                        {/* <div className="w-1 h-5 bg-orange-500 rounded-full"></div> */}
                        <h3 className="font-extrabold text-[17px] text-theme-text-main tracking-tight">Popular Right Now</h3>
                      </div>
                      <button
                        onClick={() => { setActiveCategory('All'); setSearchQuery(''); setActiveTab('menu'); }}
                        className="text-theme-primary text-[12px] font-bold px-3 py-1 rounded-lg bg-theme-primary/10 hover:bg-theme-primary/20 transition-colors"
                      >
                        See all
                      </button>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar gap-3 px-4 pb-1">
                      {popularItems.map((item) => {
                        const cartItem = cart?.find(i => i.id === item.id);
                        return (
                          <div key={item.id} className="w-[180px] flex-shrink-0 bg-theme-surface rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden flex flex-col transition-all hover:shadow-md">
                            <div className="relative aspect-[3/2]">
                              <ImageFallback src={item.image_url} name={item.name} className="w-full h-full object-cover" />
                              {/* Gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                              {/* Veg/Non-Veg badge */}
                              <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm p-[3px] rounded-md shadow-sm">
                                <div className={`w-3 h-3 border-[1.5px] flex items-center justify-center rounded-sm ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                                </div>
                              </div>
                              {/* Popular fire badge */}
                              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                <span className="text-orange-400">🔥</span> Popular
                              </div>
                            </div>
                            <div className="p-3 flex flex-col flex-grow">
                              <h4 className="font-bold text-[13px] leading-tight text-theme-text-main line-clamp-2 mb-1">{item.name}</h4>
                              {item.description && (
                                <p className="text-[10px] text-theme-text-sec font-medium line-clamp-1 mb-2">{item.description}</p>
                              )}
                              <div className="flex items-center justify-between mt-auto pt-1">
                                <div>
                                  <span className="font-extrabold text-[15px] text-theme-text-main">₹{Math.round(item.price)}</span>
                                  <span className="text-[8px] font-bold text-theme-text-sec block tracking-wider">+5% GST</span>
                                </div>
                                {isReadOnly ? (
                                  <div className="text-[9px] font-bold text-theme-text-sec uppercase tracking-wider">View</div>
                                ) : cartItem ? (
                                  <div className="flex items-center bg-theme-primary rounded-lg overflow-hidden">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                                      <Minus size={13} strokeWidth={3} />
                                    </button>
                                    <span className="text-white font-bold text-[12px] w-4 text-center">{cartItem.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                                      <Plus size={13} strokeWidth={3} />
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleAddToCart(item)} className="bg-theme-primary text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase active:scale-95 transition-transform shadow-sm">
                                    ADD
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── Explore Full Menu CTA ─── */}
                {/* <div className="px-4">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('All');
                      setActiveTab('menu');
                    }}
                    className="w-full bg-theme-primary text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-theme-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[15px]"
                  >
                    Explore Full Menu
                  </button>
                </div> */}

                {/* ─── Quick Category Chips ─── */}
                {categories.length > 1 && (
                  <div className="mt-2">
                    <h3 className="font-extrabold text-[17px] text-theme-text-main tracking-tight mb-3 px-4 flex items-center gap-2">
                      Browse by Category
                    </h3>
                    <div className="flex overflow-x-auto hide-scrollbar px-4 pb-2">
                      <div className="grid grid-rows-2 grid-flow-col gap-2.5">
                        {categories.filter(c => c !== 'All').map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              setActiveCategory(cat);
                              setSearchQuery('');
                              setActiveTab('menu');
                            }}
                            className="px-4 py-2.5 rounded-xl bg-theme-surface border border-slate-200/60 dark:border-slate-800 text-theme-text-main font-bold text-[13px] shadow-sm active:scale-95 transition-all whitespace-nowrap flex items-center justify-center text-center hover:border-theme-primary/30 hover:text-theme-primary"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Footer ─── */}
                <div className="flex justify-center pt-4 pb-4">
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium tracking-wider opacity-40 hover:opacity-100 hover:text-theme-primary transition-all duration-500 cursor-default flex items-center gap-1.5 select-none hover:scale-105">
                    Made with masala and a little bit of magic...
                  </p>
                </div>

              </div>
            </div>

            <div className={activeTab === 'menu' ? 'block' : 'hidden'}>
              <MenuPage
                onAddToCart={handleAddToCart}
                restaurantId={restaurantId}
                cart={cart}
                updateQuantity={updateQuantity}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                categories={categories}
                isReadOnly={isReadOnly}
              />
            </div>

            {activeTab === 'cart' && (
              <CartPage
                isOpen={true}
                onClose={() => setActiveTab('menu')}
                cart={cart}
                tableNumber={tableNumber}
                updateQuantity={updateQuantity}
                onPlaceOrder={handlePlaceOrder}
                hideTotal={hideTotal}
                instructions={chefInstructions}
                setInstructions={setChefInstructions}
                restaurantId={restaurantId}
                onAddToCart={handleAddToCart}
                isReadOnly={isReadOnly}
                suggestedItems={suggestedItems}
              />
            )}
            {activeTab === 'tracking' && activeOrders.length > 0 && (
              <OrderTrackingPage
                orders={activeOrders}
                onClose={() => setActiveTab('menu')}
                restaurantId={restaurantId}
                hideTotal={hideTotal}
                onAddToCart={handleAddToCart}
                cart={cart}
                isReadOnly={isReadOnly}
                suggestedItems={suggestedItems}
                updateQuantity={updateQuantity}
              />
            )}
            {activeTab === 'tracking' && activeOrders.length === 0 && (
              <div className="p-8 text-center mt-12">
                <h2 className="text-xl font-bold text-theme-text-main mb-2">No Active Orders</h2>
                <p className="text-theme-text-sec mb-6">You don't have any orders currently being prepared.</p>
                <button onClick={() => setActiveTab('menu')} className="bg-theme-primary text-white px-6 py-3 rounded-xl font-bold shadow-soft">Browse Menu</button>
              </div>
            )}
          </main>

          {/* Floating Cart Banner */}
          {!isReadOnly && cart.length > 0 && (activeTab === 'menu' || activeTab === 'home') && (
            <div className="fixed bottom-[5.5rem] left-1/2 -translate-x-1/2 w-[calc(100%-16px)] max-w-[calc(28rem-16px)] z-40 pointer-events-none">
              <div className="w-full bg-theme-primary text-theme-surface rounded-2xl shadow-xl p-3 flex justify-between items-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] animate-slideUp pointer-events-auto" onClick={() => setActiveTab('cart')}>
                <div className="flex items-center gap-3 flex-shrink min-w-0">
                  <div className="flex -space-x-2 sm:-space-x-3 flex-shrink-0">
                    {cart.slice(0, 2).map(item => (
                      <ImageFallback key={item.id} src={item.image_url} name={item.name} className="w-10 h-10 rounded-xl border-2 border-theme-primary object-cover bg-theme-surface shadow-sm" alt="" />
                    ))}
                    {cart.length > 2 && (
                      <div className="w-10 h-10 rounded-xl border-2 border-theme-primary bg-theme-surface text-theme-primary flex items-center justify-center font-bold text-sm z-10 shadow-sm">
                        +{cart.length - 2}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-base truncate">
                    {cartItemsCount} item{cartItemsCount !== 1 && 's'}
                    <span className="hidden sm:inline"> added</span>
                  </span>
                </div>
                <div className="flex items-center font-bold text-base flex-shrink-0 ml-2 bg-theme-surface text-theme-primary px-5 py-2.5 rounded-xl shadow-sm">
                  View cart
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-theme-surface rounded-t-3xl pb-safe border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-2.5">
            <div className={`px-1 py-2 ${isReadOnly ? 'flex justify-evenly' : 'grid grid-cols-5'} items-end`}>

              <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center py-1 transition-colors ${activeTab === 'home' ? 'text-theme-primary' : 'text-theme-text-sec'}`}>
                <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                <span className="text-[10px] font-bold mt-1">Home</span>
              </button>

              <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center justify-center py-1 transition-colors ${activeTab === 'menu' ? 'text-theme-primary' : 'text-theme-text-sec'}`}>
                <MenuIcon size={22} strokeWidth={activeTab === 'menu' ? 3 : 2} />
                <span className="text-[10px] font-bold mt-1">Menu</span>
              </button>

              {/* Center: Call Waiter */}
              {!isReadOnly && (
                <div className="flex flex-col items-center justify-center relative -mt-5 z-10">
                  <div className="relative p-[4px] rounded-full bg-gradient-to-b from-theme-primary-light to-theme-primary">
                    <button
                      onClick={() => setIsAssistanceModalOpen(true)}
                      className="relative w-14 h-14 rounded-full bg-gradient-to-b from-theme-primary-light to-theme-primary text-white flex items-center justify-center shadow-[0_8px_16px_rgba(226,55,68,0.4)] transition-transform active:scale-95"
                    >
                      <Bell size={25} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}

              {!isReadOnly && (
                <>
                  <button onClick={() => setActiveTab('tracking')} className={`flex flex-col items-center justify-center py-1 transition-colors ${activeTab === 'tracking' ? 'text-theme-primary' : 'text-theme-text-sec'} relative`}>
                    <div className="relative">
                      <FileText size={22} strokeWidth={activeTab === 'tracking' ? 2.5 : 2} />
                      {activeOrders.length > 0 && activeTab !== 'tracking' && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-theme-primary rounded-full border-2 border-white animate-pulse"></span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold mt-1">Orders</span>
                  </button>

                  <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center justify-center py-1 transition-colors ${activeTab === 'cart' ? 'text-theme-primary' : 'text-theme-text-sec'} relative`}>
                    <div className="relative">
                      <ShoppingBag size={22} strokeWidth={activeTab === 'cart' ? 2.5 : 2} />
                      {cartItemsCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 bg-theme-primary text-theme-surface text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white">
                          {cartItemsCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold mt-1">Cart</span>
                  </button>
                </>
              )}

            </div>
          </nav>

          {/* Assistance Modal */}
          <AssistanceModal
            isOpen={isAssistanceModalOpen}
            onClose={() => setIsAssistanceModalOpen(false)}
            onNotify={handleRequestAssistance}
          />

          {/* Menu Only Modal */}
          <MenuOnlyModal
            isOpen={showMenuOnlyModal}
            onClose={() => setShowMenuOnlyModal(false)}
            reason={readOnlyReason}
          />

          {/* Toast Notification */}
          {toast && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none w-full max-w-md px-4 flex justify-center">
              <div className="bg-theme-surface border border-slate-100 text-theme-text-main px-4 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></span>
                </div>
                <span className="font-bold text-[14px] tracking-tight pr-2">{toast}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:qrToken" element={<CustomerView />} />
        <Route path="/invalid-table" element={<CustomerView />} />
        <Route path="*" element={<Navigate to="/invalid-table" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
