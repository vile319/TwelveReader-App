import React from 'react';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import ModelWarningModal from './components/modals/ModelWarningModal';
import OnboardingModal from './components/modals/OnboardingModal';
import HelpModal from './components/modals/HelpModal';
import AdSensePopup from './components/AdSensePopup';
import { useAppContext } from './contexts/AppContext';

const AppContent: React.FC = () => {
  const { state, actions } = useAppContext();

  return (
    <div className="app-container flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-200 font-inter">
      {/* Global keyframes (other layout handled by Tailwind classes) */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Model Download Warning Modal */}
      <ModelWarningModal />

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={state.showOnboarding}
        onClose={actions.handleCloseOnboarding}
      />

      {/* Help Modal */}
      <HelpModal 
        isOpen={state.showHelp}
        onClose={actions.handleCloseHelp}
        onShowOnboarding={actions.handleShowOnboarding}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <MainContent />
      
      {/* Popup Ad */}
      <AdSensePopup 
        adSlot="1122334455"
        showInterval={10} // Show every 10 minutes
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;