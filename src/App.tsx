// Main App Component
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';

// Main app content (wrapped inside AuthProvider)
function AppContent() {
  const { user, loading } = useAuth();

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

  // Show login screen if user is not authenticated
  if (!user) {
    return <Login />;
  }

  // User is authenticated - show the main app
  // For now, just show a simple welcome screen
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Berjaya WMS
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  Logged in
                </p>
              </div>
              
              {/* User avatar */}
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User avatar"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 Login Successful!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Welcome to the new React-based Berjaya WMS! 
            This is just the beginning - more features will be added step by step.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-green-800 font-medium mb-2">✅ What's Working Now:</h3>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Google OAuth Authentication</li>
              <li>• React + TypeScript + Tailwind CSS setup</li>
              <li>• Firebase integration</li>
              <li>• Responsive mobile-first design</li>
              <li>• Error handling and loading states</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-blue-800 font-medium mb-2">🚧 Coming Next:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Role selection (Logistics, Production, Manager)</li>
              <li>• Inventory counting interface</li>
              <li>• Transaction management</li>
              <li>• Manager dashboard</li>
              <li>• BOM operations</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={async () => {
                const { logout } = useAuth();
                await logout();
              }}
              className="btn-secondary"
            >
              Logout
            </button>
            
            <button
              onClick={() => {
                console.log('Current user:', user);
                alert('Check the browser console for user details!');
              }}
              className="btn-primary"
            >
              View User Details
            </button>
          </div>
        </div>
      </main>
    </div>
  );
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