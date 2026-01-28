import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardPage } from './pages/DashboardPage';
import { MappingsPage } from './pages/MappingsPage';
import { MappingReviewPage } from './pages/MappingReviewPage';
import { ErrorDetailPage } from './pages/ErrorDetailPage';
import { FacilityPerformanceReport } from './pages/FacilityPerformanceReport';
import { FacilityUsagePage } from './pages/FacilityUsagePage';
import { MappingRulesConfig } from './pages/MappingRulesConfig';
import { DeveloperPortal } from './pages/DeveloperPortal';

// Legacy logic imports if needed later, kept for reference or re-integration
// import { normalizeCode, buildFHIRAndApplyRules } from './utils/middleware';
// import { callGemini } from './services/geminiService';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [pageTitle, setPageTitle] = useState('Active Integration Status');
  const [breadcrumbs, setBreadcrumbs] = useState(['Home', 'Data Ingestion & Normalization']);
  const [subtitle, setSubtitle] = useState('');

  // Update header based on view
  useEffect(() => {
    switch (currentView) {
        case 'dashboard':
            setPageTitle('Active Integration Status');
            setSubtitle('');
            setBreadcrumbs(['Home', 'Data Ingestion & Normalization']);
            break;
        case 'mappings':
            setPageTitle('Claims Mapping Analytics');
            setSubtitle('Real-time performance metrics for hospital integration gateway');
            setBreadcrumbs(['Home', 'Analytics']);
            break;
        case 'review':
            setPageTitle('Healthcare Integration Gateway');
            setSubtitle('');
            setBreadcrumbs(['Worklist', 'Review Ticket #8842']);
            break;
        case 'error':
            setPageTitle('Healthcare Integration Gateway'); // Header reused in layout
            setBreadcrumbs(['Claims', 'Queue', 'Review']);
            break;
        case 'facility_performance':
            setPageTitle('Facility Performance');
            setSubtitle('Network-wide operational metrics comparison');
            setBreadcrumbs(['Home', 'Facilities', 'Performance']);
            break;
        case 'facility_usage':
            setPageTitle('Usage & Quotas');
            setSubtitle('API limits and throughput management');
            setBreadcrumbs(['Home', 'Facilities', 'Usage']);
            break;
        case 'mapping_rules':
            setPageTitle('Configuration');
            setSubtitle('AI Normalization Logic & Thresholds');
            setBreadcrumbs(['Home', 'Configuration', 'Mapping Rules']);
            break;
        case 'developer':
            // Developer portal has its own internal header usually
            setPageTitle('Developer Portal');
            setBreadcrumbs(['Home', 'Developers']);
            break;
        default:
            setPageTitle('Dashboard');
    }
  }, [currentView]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
      {/* Sidebar */}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Helper function to determine if we show the standard TopHeader or if the page has its own headers */}
        {/* For now, we will use the standard TopHeader for most pages except DeveloperPortal which might look better full screen or handled differently */}
        {['dashboard', 'mappings'].includes(currentView) && (
            <TopHeader title={pageTitle} subtitle={subtitle} breadcrumbs={breadcrumbs} />
        )}
        
        {/* Some new pages like FacilityUsage have their own headers built-in, so we might want to hide TopHeader for them 
            or refactor them to remove their header. 
            The designs provided had headers in the HTML. 
            I'll hide the TopHeader for the new pages that have their own headers inside the component.
        */}

        <main className="flex-1 overflow-hidden relative flex flex-col">
            {currentView === 'dashboard' && <DashboardPage />}
            {currentView === 'mappings' && <MappingsPage />}
            {currentView === 'review' && <MappingReviewPage />}
            {currentView === 'error' && <ErrorDetailPage />}
            
            {currentView === 'facility_performance' && <FacilityPerformanceReport />}
            {currentView === 'facility_usage' && <FacilityUsagePage />}
            {currentView === 'mapping_rules' && <MappingRulesConfig />}
            {currentView === 'developer' && <DeveloperPortal />}
            
            {/* Fallbacks or "Under Construction" for other views */}
            {['claims', 'settings'].includes(currentView) && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">construction</span>
                    <p>Module Under Construction</p>
                    <button className="mt-4 text-primary hover:underline" onClick={() => setCurrentView('dashboard')}>Return to Dashboard</button>
                    
                    {/* Dev Links for Demo */}
                    <div className="mt-8 flex gap-4 text-xs">
                        <button className="text-secondary-text hover:text-white" onClick={() => setCurrentView('review')}>Demo: Review Page</button>
                        <button className="text-secondary-text hover:text-white" onClick={() => setCurrentView('error')}>Demo: Error Detail</button>
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
}

