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
    <div className="min-h-[100dvh] bg-theme-bg flex flex-col p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-theme-primary text-white rounded-3xl mx-auto flex items-center justify-center text-4xl font-bold shadow-lg shadow-red-500/30 mb-6 transform -rotate-6">
            TN
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-theme-text-main">Staff Portal</h1>
          <p className="text-theme-text-sec text-sm mt-2">Sign in to access your tables</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          {error && <div className="bg-red-50 text-theme-primary p-4 rounded-2xl text-sm text-center font-medium border border-red-100">{error}</div>}
          
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="Email address" 
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all text-theme-text-main placeholder-slate-400" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full p-4 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all text-theme-text-main placeholder-slate-400" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          
          <button type="submit" className="btn btn-primary w-full py-4 text-lg mt-8">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
