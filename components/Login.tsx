import React, { useState } from 'react';
import { LifeBuoy, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { User, AppConfig } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  appConfig: AppConfig;
}

export const Login: React.FC<LoginProps> = ({ users, onLogin, appConfig }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    
    // Simulate network delay for better UX
    setTimeout(() => {
      setIsLoading(false);
      
      // Look up user in the provided list (which comes from Supabase)
      const foundUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      
      if (foundUser) {
        // In a real app, this would use bcrypt compare. 
        // Here we compare plain text as per the prototype's current data structure.
        if (foundUser.password === password) {
             onLogin(foundUser);
        } else {
             setError('Invalid password. Please try again.');
        }
      } else {
        setError('Invalid credentials. User not found.');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 to-nova-teal flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        <div className="p-8 lg:p-10 flex flex-col justify-center">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-16 mb-4">
                     {appConfig.logoUrl ? (
                         <img src={appConfig.logoUrl} alt="App Logo" className="h-16 w-auto object-contain" />
                     ) : (
                         <div className="w-14 h-14 bg-nova-teal/10 rounded-xl flex items-center justify-center text-nova-teal">
                            <LifeBuoy size={32} className="text-nova-accent" />
                         </div>
                     )}
                </div>
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Welcome to {appConfig.appName}</h1>
                <p className="text-sm text-gray-500 mt-1">Please enter your credentials to sign in.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    {error}
                </div>
                )}

                <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Username</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-nova-teal transition-colors">
                    <UserIcon size={18} />
                    </div>
                    <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal transition-all"
                    placeholder="Enter your username"
                    />
                </div>
                </div>

                <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Password</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-nova-teal transition-colors">
                    <Lock size={18} />
                    </div>
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-nova-teal/20 focus:border-nova-teal transition-all"
                    placeholder="Enter your password"
                    />
                </div>
                </div>

                <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-nova-teal text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-700/20 hover:bg-teal-700 hover:shadow-teal-700/30 focus:ring-4 focus:ring-teal-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                {isLoading ? (
                    <>
                    <Loader2 size={20} className="animate-spin" />
                    Verifying...
                    </>
                ) : (
                    <>
                    Sign In
                    <ArrowRight size={20} />
                    </>
                )}
                </button>
            </form>
            
            <p className="text-center text-xs text-gray-400 mt-8">© 2024 Nova Maldives. Staff Portal.</p>
        </div>
      </div>
    </div>
  );
};