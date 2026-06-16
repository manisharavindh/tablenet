import { useState } from 'react';
import { supabase } from '@tablenet/supabase';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to="/w/1" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="card w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Waiter Portal</h1>
          <p className="text-secondary text-sm mt-1">Sign in to your account</p>
        </div>
        
        {error && <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm text-center">{error}</div>}
        
        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Email address" 
            className="w-full p-4 rounded-xl bg-surface shadow-inset outline-none focus:ring-2 focus:ring-accent/50 transition-all" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-4 rounded-xl bg-surface shadow-inset outline-none focus:ring-2 focus:ring-accent/50 transition-all" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>
        
        <button type="submit" className="btn btn-primary w-full py-4 text-lg">
          Sign In
        </button>
      </form>
    </div>
  );
}
