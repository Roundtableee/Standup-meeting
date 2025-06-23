import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationState {
  history: string[];
  currentPage: string;
}

interface NavigationContextType {
  navigationState: NavigationState;
  pushToHistory: (page: string) => void;
  goBack: () => string | null;
  clearHistory: () => void;
  getPreviousPage: () => string | null;
  getBackButtonText: () => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    history: [],
    currentPage: 'home'
  });

  const pushToHistory = (page: string) => {
    setNavigationState(prev => {
      // Don't add the same page twice in a row
      if (prev.currentPage === page) {
        return prev;
      }

      const newHistory = [...prev.history];
      
      // Add current page to history before navigating to new page
      if (prev.currentPage && prev.currentPage !== page) {
        newHistory.push(prev.currentPage);
      }

      // Keep history manageable (max 10 items)
      if (newHistory.length > 10) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        currentPage: page
      };
    });
  };

  const goBack = (): string | null => {
    if (navigationState.history.length === 0) {
      return 'home'; // Default fallback
    }

    const previousPage = navigationState.history[navigationState.history.length - 1];
    
    setNavigationState(prev => ({
      history: prev.history.slice(0, -1), // Remove last item
      currentPage: previousPage
    }));

    return previousPage;
  };

  const getPreviousPage = (): string | null => {
    if (navigationState.history.length === 0) {
      return null;
    }
    return navigationState.history[navigationState.history.length - 1];
  };

  const getBackButtonText = (): string => {
    const previousPage = getPreviousPage();
    if (!previousPage) return 'Back to Home';
    
    // Parse page identifiers and return user-friendly text
    if (previousPage === 'home') return 'Back to Home';
    if (previousPage === 'profile') return 'Back to Profile';
    if (previousPage === 'leave-management') return 'Back to Leave Management';
    if (previousPage === 'mentor-trainees') return 'Back to My Trainees';
    if (previousPage === 'create-standup') return 'Back to Standup';
    if (previousPage.startsWith('team-members-')) return 'Back to Team Members';
    if (previousPage.startsWith('member-detail-')) return 'Back to Member Details';
    if (previousPage.startsWith('team-')) return 'Back to Team';
    
    return 'Back';
  };

  const clearHistory = () => {
    setNavigationState({
      history: [],
      currentPage: 'home'
    });
  };

  return (
    <NavigationContext.Provider value={{
      navigationState,
      pushToHistory,
      goBack,
      clearHistory,
      getPreviousPage,
      getBackButtonText
    }}>
      {children}
    </NavigationContext.Provider>
  );
};