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
import { SettingsPage } from './pages/SettingsPage';
import { ClaimsQueuePage } from './pages/ClaimsQueuePage';
import { EligibilityPage } from './pages/EligibilityPage';
import { PriorAuthPage } from './pages/PriorAuthPage';
import { ClaimBuilderPage } from './pages/ClaimBuilderPage';
import { SBSCodeBrowser } from './pages/SBSCodeBrowser';
import { UnifiedCodeBrowser } from './pages/UnifiedCodeBrowser';

// Legacy logic imports if needed later, kept for reference or re-integration
// import { normalizeCode, buildFHIRAndApplyRules } from './utils/middleware';
// import { callGemini } from './services/geminiService';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [pageTitle, setPageTitle] = useState('Active Integration Status');
  const [breadcrumbs, setBreadcrumbs] = useState(['Home', 'Data Ingestion & Normalization']);
  const [subtitle, setSubtitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        case 'settings':
            setPageTitle('Settings');
            setSubtitle('Manage application preferences');
            setBreadcrumbs(['Home', 'Settings']);
            break;
        case 'claims':
            setPageTitle('Claims Queue');
            setSubtitle('Manage incoming healthcare claims');
            setBreadcrumbs(['Home', 'Claims']);
            break;
        case 'eligibility':
            setPageTitle('Eligibility Verification');
            setSubtitle('Real-time coverage verification');
            setBreadcrumbs(['Home', 'Eligibility']);
            break;
        case 'prior-auth':
            setPageTitle('Prior Authorization');
            setSubtitle('Request and track pre-approvals');
            setBreadcrumbs(['Home', 'Prior Authorization']);
            break;
        case 'claim-builder':
            setPageTitle('Smart Claim Builder');
            setSubtitle('AI-powered claim creation');
            setBreadcrumbs(['Home', 'Claim Builder']);
            break;
        case 'code-browser':
            setPageTitle('SBS Code Catalogue');
            setSubtitle('Browse official CHI codes');
            setBreadcrumbs(['Home', 'Code Browser']);
            break;
        case 'unified-browser':
            setPageTitle('Unified Code Browser');
            setSubtitle('Search across all healthcare code systems');
            setBreadcrumbs(['Home', 'Unified Browser']);
            break;
        default:
            setPageTitle('Dashboard');
    }
  }, [currentView]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-background-light via-slate-50 to-background-light dark:from-background-dark dark:via-slate-950 dark:to-background-dark font-body text-slate-900 dark:text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={(view) => {
          setCurrentView(view);
          setSidebarOpen(false);
        }} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Helper function to determine if we show the standard TopHeader or if the page has its own headers */}
        {/* For now, we will use the standard TopHeader for most pages except DeveloperPortal which might look better full screen or handled differently */}
        {['dashboard', 'mappings'].includes(currentView) && (
            <TopHeader 
              title={pageTitle} 
              subtitle={subtitle} 
              breadcrumbs={breadcrumbs} 
              onMenuClick={() => setSidebarOpen(true)}
            />
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
            
            {currentView === 'claims' && <ClaimsQueuePage />}
            {currentView === 'settings' && <SettingsPage />}
            {currentView === 'eligibility' && <EligibilityPage />}
            {currentView === 'prior-auth' && <PriorAuthPage />}
            {currentView === 'claim-builder' && <ClaimBuilderPage />}
            {currentView === 'code-browser' && <SBSCodeBrowser />}
            {currentView === 'unified-browser' && <UnifiedCodeBrowser />}
        </main>
      </div>
    </div>
  );
}

