import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@tablenet/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    let authChannel;
    let pollInterval;
    const setupAuthChannel = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      authChannel = supabase.channel('global-auth-events', {
        config: {
          broadcast: { ack: true }
        }
      })
        .on('broadcast', { event: 'force_logout' }, async (payload) => {
          if (payload.payload?.targetEmail === session.user.email) {
            await supabase.auth.signOut();
          }
        })
        .subscribe();
        
      // Bulletproof fallback: verify the session on the server every 3 seconds
      // If the password was changed, the RPC deletes the session, making this fail.
      pollInterval = setInterval(async () => {
        const { error } = await supabase.auth.getUser();
        if (error && (error.status === 401 || error.status === 403 || error.message?.toLowerCase().includes('invalid'))) {
          await supabase.auth.signOut();
        }
      }, 3000);
    };
    
    setupAuthChannel();

    return () => {
      subscription.unsubscribe();
      if (authChannel) supabase.removeChannel(authChannel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
