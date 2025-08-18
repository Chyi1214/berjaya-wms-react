// Main App Component
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import RoleSelection from './components/RoleSelection';
import LogisticsView from './components/LogisticsView';
import ProductionView from './components/ProductionView';
import ManagerView from './components/ManagerView';
import { UserRole, AppSection, InventoryCountEntry } from './types';

// Main app content (wrapped inside AuthProvider)
function AppContent() {
  const { user, loading, logout } = useAuth();
  
  // Navigation state
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.LOGIN);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  // Shared inventory state (lifted up from LogisticsView)
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCountEntry[]>([]);

  // Handle role selection
  const handleRoleSelect = (role: UserRole) => {
    console.log('Role selected:', role);
    setSelectedRole(role);
    switch (role) {
      case UserRole.LOGISTICS:
        setCurrentSection(AppSection.LOGISTICS);
        break;
      case UserRole.PRODUCTION:
        setCurrentSection(AppSection.PRODUCTION);
        break;
      case UserRole.MANAGER:
        setCurrentSection(AppSection.MANAGER);
        break;
    }
  };

  // Handle back to role selection
  const handleBackToRoles = () => {
    console.log('Returning to role selection from:', selectedRole);
    setCurrentSection(AppSection.ROLE_SELECTION);
    setSelectedRole(null);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setCurrentSection(AppSection.LOGIN);
    setSelectedRole(null);
  };

  // Handle new inventory count (shared between roles)
  const handleInventoryCount = (entry: InventoryCountEntry) => {
    setInventoryCounts(prev => [entry, ...prev]);
    console.log('New inventory count added:', entry);
  };

  // Handle clearing all counts
  const handleClearCounts = () => {
    if (window.confirm('Clear all inventory counts? This cannot be undone.')) {
      setInventoryCounts([]);
    }
  };

  // Update section when authentication state changes
  if (user && currentSection === AppSection.LOGIN) {
    setCurrentSection(AppSection.ROLE_SELECTION);
  } else if (!user && currentSection !== AppSection.LOGIN) {
    setCurrentSection(AppSection.LOGIN);
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render based on current section
  switch (currentSection) {
    case AppSection.LOGIN:
      return <Login />;
      
    case AppSection.ROLE_SELECTION:
      return user ? (
        <RoleSelection 
          user={user} 
          onRoleSelect={handleRoleSelect} 
          onLogout={handleLogout} 
        />
      ) : <Login />;
      
    case AppSection.LOGISTICS:
      return user ? (
        <LogisticsView 
          user={user} 
          onBack={handleBackToRoles}
          onCountSubmit={handleInventoryCount}
          counts={inventoryCounts}
          onClearCounts={handleClearCounts}
        />
      ) : <Login />;
      
    case AppSection.PRODUCTION:
      return user ? (
        <ProductionView 
          user={user} 
          onBack={handleBackToRoles} 
        />
      ) : <Login />;
      
    case AppSection.MANAGER:
      return user ? (
        <ManagerView 
          user={user} 
          onBack={handleBackToRoles}
          inventoryCounts={inventoryCounts}
          onClearCounts={handleClearCounts}
        />
      ) : <Login />;
      
    default:
      return <Login />;
  }
}

// Main App component with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;