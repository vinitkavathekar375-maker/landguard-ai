import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CaseDetail from './components/CaseDetail';
import NewCaseModal from './components/NewCaseModal';
import LogActionModal from './components/LogActionModal';
import AdminPanel from './components/AdminPanel';
import { fetchDashboardStats, fetchCases, fetchCaseDetail } from './api';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'case_detail', 'admin'
  const [currentRole, setCurrentRole] = useState('SLAO_OFFICER');
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    project_type: 'All',
    risk_level: 'All',
    status: 'All',
    sort_by: 'priority',
    priority_only: false
  });

  // Modals
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isLogActionOpen, setIsLogActionOpen] = useState(false);
  const [caseForAction, setCaseForAction] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [sData, cData] = await Promise.all([
        fetchDashboardStats(),
        fetchCases(filters)
      ]);
      setStats(sData);
      setCases(cData.cases || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = async (landId) => {
    setSelectedCaseId(landId);
    setActiveView('case_detail');
    setLoadingDetail(true);
    try {
      const detail = await fetchCaseDetail(landId);
      setSelectedCaseDetail(detail);
    } catch (err) {
      alert(`Failed to load case detail: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRefreshCase = async (landId) => {
    try {
      const detail = await fetchCaseDetail(landId);
      setSelectedCaseDetail(detail);
      loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLogAction = (caseItem) => {
    setCaseForAction(caseItem);
    setIsLogActionOpen(true);
  };

  const handleActionSuccess = async (landId) => {
    await handleRefreshCase(landId);
  };

  const handleCaseCreated = async (landId) => {
    await loadDashboardData();
    await handleSelectCase(landId);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-amber-200">
      {/* Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        onNewCaseClick={() => setIsNewCaseOpen(true)}
        highRiskCount={stats?.high_risk_count ?? 0}
        onResetSeed={loadDashboardData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeView === 'dashboard' && (
          <Dashboard
            stats={stats}
            cases={cases}
            loading={loading}
            onSelectCase={handleSelectCase}
            filters={filters}
            setFilters={setFilters}
            onRefresh={loadDashboardData}
          />
        )}

        {activeView === 'case_detail' && (
          loadingDetail ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-3 border-gov-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold">Running ML Explainability & Document Verification...</p>
            </div>
          ) : (
            <CaseDetail
              caseData={selectedCaseDetail}
              onBack={() => setActiveView('dashboard')}
              onOpenLogAction={handleOpenLogAction}
              onRefreshCase={handleRefreshCase}
            />
          )
        )}

        {activeView === 'admin' && (
          <AdminPanel onDataReset={loadDashboardData} />
        )}
      </main>

      {/* Modals */}
      <NewCaseModal
        isOpen={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
        onCaseCreated={handleCaseCreated}
      />

      <LogActionModal
        isOpen={isLogActionOpen}
        onClose={() => setIsLogActionOpen(false)}
        caseItem={caseForAction}
        onActionSuccess={handleActionSuccess}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          LandGuard AI — Decision-Support Surveillance Prototype • Government of India & State Revenue Authorities Compliance
        </p>
      </footer>
    </div>
  );
}
