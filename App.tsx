import React, { type FC } from 'react';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import ModelWarningModal from './components/modals/ModelWarningModal';
import OnboardingModal from './components/modals/OnboardingModal';
import HelpModal from './components/modals/HelpModal';
import AdSensePopup from './components/AdSensePopup';
import { useAppContext } from './contexts/AppContext';

void React;

const AppContent: FC = () => {
  const { state, actions } = useAppContext();

  return (
    <div className="app-container flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-inter antialiased">
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
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-top {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out;
        }
        .fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .slide-in-from-top-2 {
          animation: slide-in-from-top 0.3s ease-out;
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

const App: FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;