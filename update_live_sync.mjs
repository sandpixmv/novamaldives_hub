import fs from 'fs';

let code = fs.readFileSync('/App.tsx', 'utf8');

// Find the RefreshCw button in the top bar
const target = `<button \n                                 onClick={() => fetchAllData(false)} \n                                 disabled={isSyncing}\n                                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-nova-teal hover:border-nova-teal active:bg-gray-200 transition-all duration-200 disabled:opacity-50"\n                                 title="Refresh/Sync Data"\n                              >\n                                  <RefreshCw size={14} className={\`\${isSyncing ? 'animate-spin' : ''}\`} />\n                                  <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>\n                              </button>`;

const replacement = `{/* Live Sync Mode Toggle & Status Indicator */}
                              <button
                                  onClick={toggleLiveSync}
                                  className={\`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-200 shadow-sm \${
                                      isLiveSyncEnabled 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' 
                                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                                  }\`}
                                  title={isLiveSyncEnabled ? 'Live Sync Active: Realtime updates enabled. Click to switch to Manual Sync Mode' : 'Manual Sync Mode: Updates on manual refresh. Click to enable Live Sync Mode'}
                              >
                                  <span className="relative flex h-2 w-2">
                                      {isLiveSyncEnabled && (
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      )}
                                      <span className={\`relative inline-flex rounded-full h-2 w-2 \${
                                          isSyncing ? 'bg-amber-500' : isLiveSyncEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                                      }\`}></span>
                                  </span>
                                  <span className="uppercase tracking-wider text-[11px] font-semibold hidden sm:inline">
                                      {isLiveSyncEnabled ? 'Live Sync' : 'Manual Sync'}
                                  </span>
                              </button>

                              <button 
                                 onClick={() => fetchAllData(false)} 
                                 disabled={isSyncing}
                                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-nova-teal hover:border-nova-teal active:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                                 title="Refresh/Sync Data Now"
                              >
                                  <RefreshCw size={14} className={\`\${isSyncing ? 'animate-spin' : ''}\`} />
                                  <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                              </button>`;

if (!code.includes(target)) {
  console.log('Target string not exact, trying regex replacement...');
  const btnRegex = /<button\s+onClick=\{\(\)\s*=>\s*fetchAllData\(false\)\}[\s\S]*?<\/button>/;
  if (!btnRegex.test(code)) {
    console.error('Could not find sync button in App.tsx');
    process.exit(1);
  }
  code = code.replace(btnRegex, replacement);
} else {
  code = code.replace(target, replacement);
}

// Update Dashboard props
code = code.replace(
  'isSyncing={isSyncing} lastUpdated={lastUpdated} onRefresh={fetchAllData}',
  'isSyncing={isSyncing} isLiveSync={isLiveSyncEnabled} onToggleLiveSync={toggleLiveSync} lastUpdated={lastUpdated} onRefresh={fetchAllData}'
);

code = code.replace(
  'default: return <Dashboard currentShift={currentShift} startNewShift={()=>{}} openChecklist={() => setCurrentView(\'checklist\')} users={users} currentUser={currentUser} availableShifts={shiftTypes} occupancyData={occupancyData} guestRequests={guestRequests} onShiftTypeChange={(t) => handleShiftTypeChange(t)} onOpenView={(view) => setCurrentView(view)} />;',
  'default: return <Dashboard currentShift={currentShift} startNewShift={()=>{}} openChecklist={() => setCurrentView(\'checklist\')} users={users} currentUser={currentUser} availableShifts={shiftTypes} occupancyData={occupancyData} guestRequests={guestRequests} onShiftTypeChange={(t) => handleShiftTypeChange(t)} onOpenView={(view) => setCurrentView(view)} isSyncing={isSyncing} isLiveSync={isLiveSyncEnabled} onToggleLiveSync={toggleLiveSync} lastUpdated={lastUpdated} onRefresh={fetchAllData} />;'
);

fs.writeFileSync('/App.tsx', code, 'utf8');
console.log('Successfully updated App.tsx with Live Sync controls and props');
