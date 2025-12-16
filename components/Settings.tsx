import React, { useState, useEffect, useRef } from 'react';
import { UserRole, AppConfig } from '../types';
import { Save, Layout, Image, ShieldAlert, Check, Upload, X, MessageSquare, Loader2 } from 'lucide-react';

interface SettingsProps {
  userRole?: UserRole;
  config: AppConfig;
  onSave: (newConfig: AppConfig) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ userRole, config, onSave }) => {
  const [appName, setAppName] = useState(config.appName);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [supportMessage, setSupportMessage] = useState(config.supportMessage || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state if props change
  useEffect(() => {
    setAppName(config.appName);
    setLogoUrl(config.logoUrl);
    setSupportMessage(config.supportMessage || '');
  }, [config]);

  const canEdit = userRole === 'Front Office Manager';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    
    setIsSaving(true);
    await onSave({
      appName,
      logoUrl,
      supportMessage
    });
    setIsSaving(false);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit size to 2MB to prevent state performance issues (and simple DB storage)
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
          <p className="text-gray-500">Configure application appearance and global preferences.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Layout size={20} className="text-gray-500" /> 
            Configuration
          </h3>
          {!canEdit && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-100">
              <ShieldAlert size={12} /> View Only (FOM Access Required)
            </span>
          )}
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Application Name</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    disabled={!canEdit}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nova-teal/50 transition-all disabled:bg-gray-50 disabled:text-gray-500 text-blue-600 font-medium"
                    placeholder="Enter application name..."
                  />
                  <p className="text-xs text-gray-400 mt-2">Displayed in the sidebar and login screen.</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Support Message</label>
                    <div className="relative">
                        <div className="absolute top-3 left-3 text-gray-400">
                           <MessageSquare size={18} />
                        </div>
                        <textarea
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            disabled={!canEdit}
                            rows={3}
                            className="w-full pl-10 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nova-teal/50 transition-all disabled:bg-gray-50 disabled:text-gray-500 resize-none text-sm text-blue-600"
                            placeholder="e.g. Contact FOM for system issues..."
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Visible at the bottom of the sidebar for all users.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Logo Configuration</label>
                  
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={!canEdit}
                  />

                  <div className="space-y-3">
                      {/* URL Input */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Image size={18} />
                        </div>
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          disabled={!canEdit}
                          className="w-full pl-10 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nova-teal/50 transition-all disabled:bg-gray-50 disabled:text-gray-500 text-sm truncate text-blue-600"
                          placeholder="https://example.com/logo.png or Base64..."
                        />
                        {logoUrl && canEdit && (
                            <button 
                                type="button"
                                onClick={clearLogo}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500"
                            >
                                <X size={16} />
                            </button>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="relative flex items-center py-2">
                          <div className="flex-grow border-t border-gray-100"></div>
                          <span className="flex-shrink-0 mx-4 text-xs text-gray-400 uppercase">OR</span>
                          <div className="flex-grow border-t border-gray-100"></div>
                      </div>

                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={!canEdit}
                        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-nova-teal hover:text-nova-teal hover:bg-teal-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                      >
                        <Upload size={18} />
                        Upload Image (Max 2MB)
                      </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Provide a direct URL or upload a local image file.</p>
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Sidebar Preview</span>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 w-full max-w-[240px] relative">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain max-w-[150px]" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-8 h-8 bg-nova-teal/10 rounded-lg flex items-center justify-center text-nova-teal">
                        <Layout size={18} />
                      </div>
                    )}
                    <span className="font-bold text-nova-teal text-lg truncate">{appName}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded full w-3/4 mx-auto mb-2"></div>
                  <div className="h-2 bg-gray-100 rounded full w-1/2 mx-auto"></div>
                  
                  <div className="mt-8 pt-4 border-t border-gray-100 text-left">
                     <div className="bg-nova-sand/30 p-2 rounded">
                        <div className="h-2 w-10 bg-gray-300 rounded mb-1"></div>
                        <p className="text-[10px] text-gray-500 break-words">{supportMessage || "Contact FOM for system issues."}</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="pt-6 border-t border-gray-100 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                    isSaved ? 'bg-green-500 shadow-green-200' : 'bg-nova-teal hover:bg-teal-700 shadow-teal-100'
                  } disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  {isSaving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Saving Changes...
                      </>
                  ) : isSaved ? (
                    <>
                      <Check size={18} /> Saved Successfully
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};