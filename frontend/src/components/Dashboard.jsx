import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Building2, 
  Calendar, 
  ArrowUpRight, 
  FileText, 
  ChevronRight,
  TrendingUp,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';

export default function Dashboard({ 
  stats, 
  cases, 
  loading, 
  onSelectCase, 
  filters, 
  setFilters,
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'priority'

  const getRiskBadge = (risk, prob) => {
    const probPct = Math.round((prob || 0) * 100);
    if (risk === 'High') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-pulse"></span>
          High Risk ({probPct}%)
        </span>
      );
    }
    if (risk === 'Medium') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
          Medium Risk ({probPct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
        Low Risk ({probPct}%)
      </span>
    );
  };

  const getDelayPill = (days) => {
    if (days > 90) {
      return <span className="text-rose-700 font-bold">+{days} days</span>;
    }
    if (days > 30) {
      return <span className="text-amber-700 font-semibold">+{days} days</span>;
    }
    return <span className="text-emerald-700 font-medium">{days > 0 ? `+${days} days` : 'On Schedule'}</span>;
  };

  // Priority queue items
  const priorityCases = cases.filter(c => c.priority_score >= 60 || c.risk_level === 'High');

  return (
    <div className="space-y-6">
      {/* Official Decision-Support Banner */}
      <div className="bg-gradient-to-r from-gov-900 via-gov-800 to-gov-900 text-white rounded-xl p-5 shadow-sm border border-gov-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-amber-500/20 rounded-lg border border-amber-500/30 text-amber-400 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Decision-Support Advisory & Delay Risk Surveillance
              <span className="bg-amber-400/20 text-amber-300 text-[11px] font-normal px-2 py-0.5 rounded border border-amber-400/30">
                Human-in-the-Loop Review
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              LandGuard AI analyzes documentary completeness, simulated court litigation registries, title conflicts, and statutory compensation formulas to provide advance early-warning of acquisition delays.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={onRefresh}
            className="text-xs bg-gov-700 hover:bg-gov-600 text-slate-200 px-3 py-1.5 rounded-lg border border-gov-600 flex items-center transition-colors"
          >
            Refresh Surveillance
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card border-l-4 border-l-gov-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Cases</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1.5">{stats?.total_cases ?? 0}</h3>
            </div>
            <div className="p-2.5 bg-gov-50 rounded-lg text-gov-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center">
            <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Across 6 Infrastructure Categories
          </p>
        </div>

        <div className="metric-card border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">High Delay Risk Cases</p>
              <div className="flex items-baseline space-x-2 mt-1.5">
                <h3 className="text-2xl font-black text-rose-600">{stats?.high_risk_count ?? 0}</h3>
                <span className="text-xs text-rose-700 font-medium">
                  ({stats?.total_cases ? Math.round((stats.high_risk_count / stats.total_cases) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-3 flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Immediate SLAO intervention required
          </p>
        </div>

        <div className="metric-card border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Expected Delay</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1.5">
                {stats?.avg_expected_delay_days ?? 0} <span className="text-sm font-semibold text-slate-600">Days</span>
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Based on Random Forest model output
          </p>
        </div>

        <div className="metric-card border-l-4 border-l-emerald-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Award Value</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1.5">
                ₹{((stats?.total_compensation_at_risk || 0) / 10000000).toFixed(1)} <span className="text-sm font-semibold text-slate-600">Cr</span>
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-3 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Statutory compensation monitored
          </p>
        </div>
      </div>

      {/* Priority Queue Ribbon */}
      {priorityCases.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Priority Early-Warning Queue ({priorityCases.length} Critical Cases)
              </h3>
            </div>
            <span className="text-xs text-slate-500">Sorted by urgency & expected delay timeline</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {priorityCases.slice(0, 3).map((item) => (
              <div 
                key={item.land_id}
                onClick={() => onSelectCase(item.land_id)}
                className="bg-white p-3.5 rounded-lg border border-amber-200/90 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-gov-800 bg-gov-50 px-2 py-0.5 rounded border border-gov-200">
                      {item.land_id}
                    </span>
                    {getRiskBadge(item.risk_level, item.delay_probability)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-2 line-clamp-1">{item.project_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Survey {item.survey_no} • {item.location_village}, {item.location_district}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
                  <div className="flex items-center text-rose-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    +{item.expected_delay_days} days est. delay
                  </div>
                  <span className="text-gov-700 font-medium flex items-center hover:text-gov-900">
                    Review <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by Land ID, Survey No, Project Name, or Village..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Type */}
            <select
              value={filters.project_type || 'All'}
              onChange={(e) => setFilters({ ...filters, project_type: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500 cursor-pointer"
            >
              <option value="All">All Projects</option>
              <option value="Highway">Highway</option>
              <option value="Railway">Railway</option>
              <option value="Metro">Metro</option>
              <option value="Airport">Airport</option>
              <option value="Hospital">Hospital</option>
              <option value="Other">Other</option>
            </select>

            {/* Risk Level */}
            <select
              value={filters.risk_level || 'All'}
              onChange={(e) => setFilters({ ...filters, risk_level: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500 cursor-pointer"
            >
              <option value="All">All Risk Tiers</option>
              <option value="High">High Risk Only</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>

            {/* Sort */}
            <select
              value={filters.sort_by || 'priority'}
              onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-500 cursor-pointer"
            >
              <option value="priority">Sort: Risk & Priority</option>
              <option value="delay_days">Sort: Expected Delay</option>
              <option value="area">Sort: Land Area</option>
              <option value="created_at">Sort: Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Land Acquisition Case Records</h3>
            <p className="text-xs text-slate-500 mt-0.5">Showing {cases.length} cases matching active filters</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-gov-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-medium">Loading acquisition cases and running predictive AI...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No matching acquisition cases found</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or create a new acquisition case.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Land ID / Survey</th>
                  <th className="py-3 px-4">Project & Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Area & Claimants</th>
                  <th className="py-3 px-4">Delay Risk Assessment</th>
                  <th className="py-3 px-4">Expected Delay</th>
                  <th className="py-3 px-4">Detected Factors</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cases.map((c) => (
                  <tr 
                    key={c.land_id}
                    onClick={() => onSelectCase(c.land_id)}
                    className="hover:bg-gov-50/60 cursor-pointer transition-colors group"
                  >
                    {/* Land ID & Survey */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-gov-800 text-xs">{c.land_id}</div>
                      <div className="text-[11px] text-slate-500">Survey No: {c.survey_no || 'N/A'}</div>
                    </td>

                    {/* Project */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.project_name}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {c.project_type}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <div>{c.location_village}</div>
                      <div className="text-[11px] text-slate-400">{c.location_district}</div>
                    </td>

                    {/* Area & Claimants */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium">{c.total_area_acres} Acres</div>
                      <div className="text-[11px] text-slate-400">{c.num_claimants} Claimant(s)</div>
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3.5 px-4">
                      {getRiskBadge(c.risk_level, c.delay_probability)}
                    </td>

                    {/* Expected Delay */}
                    <td className="py-3.5 px-4">
                      {getDelayPill(c.expected_delay_days)}
                    </td>

                    {/* Factors Tags */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.legal_dispute === 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium">
                            Court Dispute
                          </span>
                        )}
                        {c.ownership_conflict === 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                            Title Conflict
                          </span>
                        )}
                        {c.documents_complete === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-medium">
                            Doc Missing
                          </span>
                        )}
                        {c.compensation_verified === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-medium">
                            Award Mismatch
                          </span>
                        )}
                        {c.legal_dispute === 0 && c.ownership_conflict === 0 && c.documents_complete === 1 && c.compensation_verified === 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                            All Gates Clear
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c.land_id);
                        }}
                        className="px-3 py-1 bg-gov-50 text-gov-800 group-hover:bg-gov-700 group-hover:text-white font-medium rounded-lg border border-gov-200 group-hover:border-gov-700 text-xs transition-all inline-flex items-center"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
