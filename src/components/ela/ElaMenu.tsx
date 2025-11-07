// Ela Menu - Full Page Menu Component
import { ElaMenuProps } from '../../types/ela';

export function ElaMenu({ onChatOpen, onTranslationChatOpen, onPersonalSettingsOpen, onClose }: ElaMenuProps) {

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">Menu</h1>
            <p className="text-sm text-white/80">Settings and Tools</p>
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-3">
          {/* Chat with Ela */}
          <button
            onClick={() => {
              onChatOpen();
              onClose();
            }}
            className="w-full p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all flex items-center space-x-4 group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              💬
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-900 text-lg">Chat with Ela</div>
              <div className="text-sm text-gray-500">AI assistant for WMS help</div>
            </div>
            <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Translation Chat */}
          <button
            onClick={() => {
              onTranslationChatOpen();
              onClose();
            }}
            className="w-full p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-green-400 hover:shadow-lg transition-all flex items-center space-x-4 group"
          >
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🌍
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-900 text-lg">Translation Chat</div>
              <div className="text-sm text-gray-500">Multi-language communication</div>
            </div>
            <svg className="w-6 h-6 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Personal Settings */}
          <button
            onClick={() => {
              onPersonalSettingsOpen();
              onClose();
            }}
            className="w-full p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition-all flex items-center space-x-4 group"
          >
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              ⚙️
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-900 text-lg">Personal Settings</div>
              <div className="text-sm text-gray-500">Customize your profile and preferences</div>
            </div>
            <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Divider */}
          <div className="border-t-2 border-gray-200 my-6" />

          {/* Logout placeholder */}
          <button
            onClick={onClose}
            className="w-full p-6 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-all flex items-center space-x-4 opacity-50 cursor-not-allowed"
            disabled
          >
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              🚪
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-600 text-lg">Logout</div>
              <div className="text-sm text-gray-400">Coming soon</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}