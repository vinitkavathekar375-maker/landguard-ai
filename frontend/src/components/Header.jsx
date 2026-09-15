import React from 'react';
import { 
  ShieldAlert, 
  Landmark, 
  Bell, 
  UserCheck, 
  Sliders, 
  FilePlus, 
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  activeView, 
  setActiveView, 
  currentRole, 
  setCurrentRole, 
  onNewCaseClick,
  highRiskCount = 0,
  onResetSeed
}) {
  return (
    <header className="sticky top-0 z-40 bg-gov-900 text-white border-b border-gov-700 shadow-md">
      {/* Top Gov Info Bar */}
      <div className="bg-gov-950 px-6 py-1.5 text-xs text-slate-400 flex flex-wrap justify-between items-center border-b border-gov-800">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-300">LAND REVENUE & INFRASTRUCTURE ACQUISITION PORTAL</span>
          <span className="text-gov-400">•</span>
          <span>Decision-Support System (RFCTLARR Act Compliant)</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="flex items-center text-slate-300">
            <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Live IST: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-800 flex items-center">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
            ML Model Online (RF-v1.0)
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
        {/* Logo & Title */}
        <div 
          onClick={() => setActiveView('dashboard')}
          className="flex items-center space-x-3.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
            <Landmark className="w-5 h-5 text-gov-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                LandGuard <span className="text-amber-400">AI</span>
              </span>
              <span className="bg-gov-800 text-gov-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-gov-600">
                PROTOTYPE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Early-Warning System for Land Acquisition Delays
            </p>
          </div>
        </div>

        {/* View Switchers & Actions */}
        <div className="flex items-center space-x-3">
          {/* Nav Tabs */}
          <div className="bg-gov-950/80 p-1 rounded-lg border border-gov-800 flex space-x-1">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === 'dashboard'
                  ? 'bg-gov-700 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-gov-800/60'
              }`}
            >
              Cases Dashboard
            </button>
            <button
              onClick={() => setActiveView('admin')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center transition-all ${
                activeView === 'admin'
                  ? 'bg-gov-700 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-gov-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Model & Admin
            </button>
          </div>

          {/* New Case Button */}
          <button
            onClick={onNewCaseClick}
            className="bg-amber-500 hover:bg-amber-400 text-gov-950 font-semibold px-3.5 py-1.5 rounded-lg text-xs flex items-center shadow-md hover:shadow-amber-500/20 transition-all"
          >
            <FilePlus className="w-4 h-4 mr-1.5" />
            New Acquisition Case
          </button>

          {/* High Risk Alert Badge */}
          {highRiskCount > 0 && (
            <div 
              title={`${highRiskCount} cases require priority review`}
              className="bg-rose-900/60 border border-rose-700/80 text-rose-300 px-3 py-1 rounded-lg text-xs font-medium flex items-center"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-rose-400 animate-bounce" />
              <span>{highRiskCount} High Risk</span>
            </div>
          )}

          {/* Role Switcher */}
          <div className="border-l border-gov-800 pl-3 flex items-center space-x-2">
            <div className="flex items-center bg-gov-800/80 px-2.5 py-1 rounded-md border border-gov-700 text-xs">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="SLAO_OFFICER" className="bg-gov-900 text-white">SLAO Officer (Reviewer)</option>
                <option value="ADMIN_OFFICER" className="bg-gov-900 text-white">Collector / Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
