import React, { useState } from 'react';
import { LifeBuoy, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User, AppConfig } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  appConfig: AppConfig;
}

export const Login: React.FC<LoginProps> = ({ users, onLogin, appConfig }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      
      const foundUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      
      if (foundUser) {
        if (foundUser.isActive === false) {
          setError('This account has been disabled. Please contact the Front Office Manager.');
          return;
        }

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

  const getFontClass = (font: string) => {
    switch (font) {
      case 'Space Grotesk': return 'font-display';
      case 'Righteous': return 'font-unique';
      case 'Playfair Display': return 'font-serif';
      case 'Montserrat': return 'font-montserrat';
      default: return 'font-sans';
    }
  };

  const get3DStyle = (font: string) => {
    if (font === 'Righteous') {
      return {
        textShadow: `
          0 1px 0 #ccc,
          0 2px 0 #c9c9c9,
          0 3px 0 #bbb,
          0 4px 0 #b9b9b9,
          0 5px 0 #aaa,
          0 6px 1px rgba(0,0,0,.1),
          0 0 5px rgba(0,0,0,.1),
          0 1px 3px rgba(0,0,0,.3),
          0 3px 5px rgba(0,0,0,.2),
          0 5px 10px rgba(0,0,0,.25),
          0 10px 10px rgba(0,0,0,.2),
          0 20px 20px rgba(0,0,0,.15)
        `
      };
    }
    return {};
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#40E0D0]">
      {/* Background Image with Overlay */}
      {appConfig.loginBgUrl && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ 
            backgroundImage: `url("${appConfig.loginBgUrl}")`,
            filter: 'brightness(0.7)'
          }}
        />
      )}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-teal-900/40 to-black/60" />

      {/* Animated Shapes for visual interest */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-24 -left-24 w-96 h-96 bg-nova-teal/20 rounded-full blur-3xl z-0"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-nova-accent/10 rounded-full blur-3xl z-0"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md group"
      >
        {/* Animated Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-nova-teal via-nova-accent to-teal-400 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
        
        <div className="relative bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20">
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <div className="text-center mb-10">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center justify-center h-28 mb-8"
              >
                {appConfig.logoUrl ? (
                  <img src={appConfig.logoUrl} alt="App Logo" className="h-28 w-auto object-contain drop-shadow-md" />
                ) : (
                  <div className="w-24 h-24 bg-nova-teal/10 rounded-3xl flex items-center justify-center text-nova-teal shadow-inner">
                    <LifeBuoy size={56} className="text-nova-accent" />
                  </div>
                )}
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                className={`text-5xl ${getFontClass(appConfig.loginFont)} text-nova-teal tracking-normal mb-2`}
                style={get3DStyle(appConfig.loginFont)}
              >
                {appConfig.appName}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm font-medium text-nova-teal/80 mt-1 uppercase tracking-widest"
              >
                Nova Maldives | Soulmate Portal
              </motion.p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-start gap-3"
                  >
                    <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-nova-teal transition-colors">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 border border-gray-100 rounded-2xl text-sm text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-nova-teal/10 focus:border-nova-teal transition-all placeholder:text-gray-300"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-nova-teal transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3.5 border border-gray-100 rounded-2xl text-sm text-gray-800 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-nova-teal/10 focus:border-nova-teal transition-all placeholder:text-gray-300"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-nova-teal transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-nova-teal text-white py-4 rounded-2xl font-bold shadow-xl shadow-teal-900/20 hover:bg-teal-700 hover:shadow-teal-900/30 focus:ring-4 focus:ring-teal-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="tracking-wide">Verifying...</span>
                  </>
                ) : (
                  <>
                    <span className="tracking-wide">Sign In</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>
            </form>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center mt-10"
            >
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                © {new Date().getFullYear()} Nova Maldives
              </p>
              <div className="w-8 h-0.5 bg-nova-teal/20 mx-auto mt-2 rounded-full" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};