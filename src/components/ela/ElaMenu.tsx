// Ela Menu Dropdown Component
import { ElaMenuProps } from '../../types/ela';

export function ElaMenu({ onChatOpen, onClose }: ElaMenuProps) {

  return (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu dropdown */}
      <div className="absolute right-0 top-16 bg-white shadow-lg rounded-lg border border-gray-200 py-2 z-50 min-w-48">
        {/* Chat with Ela */}
        <button
          onClick={() => {
            onChatOpen();
            onClose();
          }}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-2"
        >
          <span className="text-xl">💬</span>
          <span className="font-medium text-gray-900">Chat with Ela</span>
        </button>
        
        {/* Divider */}
        <div className="border-t border-gray-100 my-1" />
        
        {/* Language switcher placeholder */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-2 text-gray-500"
        >
          <span className="text-xl">🌐</span>
          <span className="font-medium">Language</span>
          <span className="text-sm ml-auto">(Coming soon)</span>
        </button>
        
        {/* Divider */}
        <div className="border-t border-gray-100 my-1" />
        
        {/* Logout placeholder */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-2 text-gray-500"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Logout</span>
          <span className="text-sm ml-auto">(Coming soon)</span>
        </button>
      </div>
    </>
  );
}