// Ela Conversations Manager Section
import { useState, useEffect } from 'react';
import { elaService } from '../../services/elaService';
import { ElaConversation, ElaMessage } from '../../types/ela';
import { createModuleLogger } from '../../services/logger';

const logger = createModuleLogger('ElaSection');

interface ConversationWithSummary extends ElaConversation {
  summary?: string;
}

export function ElaSection() {
  const [conversations, setConversations] = useState<ConversationWithSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ElaMessage[]>([]);
  const [conversationSummary, setConversationSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const conversationsPerPage = 10;

  // Load all conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Loading Ela conversations for manager dashboard');
      
      // Load conversations - they already include summaries from Firestore
      const allConversations = await elaService.getAllConversations();
      setConversations(allConversations);
      
      logger.info('Loaded conversations with saved summaries', { count: allConversations.length });
      
    } catch (error) {
      logger.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const viewConversationDetails = async (conversationId: string) => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Loading conversation details', { conversationId });

      // Load messages
      const messages = await elaService.getConversationMessages(conversationId);
      setConversationMessages(messages);

      // Generate summary
      const summary = await elaService.generateConversationSummary(conversationId);
      setConversationSummary(summary);

      setSelectedConversation(conversationId);
      logger.info('Loaded conversation details', { conversationId, messageCount: messages.length });
    } catch (error) {
      logger.error('Failed to load conversation details:', error);
      setError('Failed to load conversation details');
    } finally {
      setLoading(false);
    }
  };

  const closeConversationDetails = () => {
    setSelectedConversation(null);
    setConversationMessages([]);
    setConversationSummary('');
  };

  const formatDate = (date: Date | any) => {
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(conversations.length / conversationsPerPage);
  const startIndex = (currentPage - 1) * conversationsPerPage;
  const endIndex = startIndex + conversationsPerPage;
  const currentConversations = conversations.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Ela conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <p className="font-semibold">Error Loading Conversations</p>
          <p>{error}</p>
          <button 
            onClick={loadConversations}
            className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">💬</span>
            Ela Conversations ({conversations.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            View worker feedback and conversations with Ela AI assistant
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Conversations Yet</h4>
            <p className="text-gray-600">
              Workers haven't started chatting with Ela yet. 
              Conversations will appear here once workers begin using the chat feature.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {currentConversations.map((conversation) => (
              <div key={conversation.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {conversation.userName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({conversation.userRole})
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        conversation.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {conversation.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Email: {conversation.userEmail}
                    </p>
                    {/* Summary Preview */}
                    <div className="bg-blue-50 p-2 rounded text-sm text-gray-700 mb-2">
                      {conversation.summary ? (
                        <span>📋 {conversation.summary}</span>
                      ) : (
                        <span className="text-gray-500 italic">No summary available</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Started: {formatDate(conversation.startTime)} • 
                      Last activity: {formatDate(conversation.lastMessageTime)} • 
                      {conversation.messageCount} messages
                    </p>
                  </div>
                  <button
                    onClick={() => viewConversationDetails(conversation.id)}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    disabled={loading}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, conversations.length)}</span> of{' '}
                    <span className="font-medium">{conversations.length}</span> conversations
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Previous
                    </button>
                    
                    <div className="flex space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-1 text-sm rounded ${
                            page === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Conversation Details Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Conversation Details
              </h3>
              <button
                onClick={closeConversationDetails}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex h-[70vh]">
              {/* Summary Panel */}
              <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
                <h4 className="font-medium text-gray-900 mb-3">📋 Conversation Summary</h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">{conversationSummary}</p>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2 mt-4">📊 Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Messages:</span>
                    <span className="font-medium">{conversationMessages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User Messages:</span>
                    <span className="font-medium">
                      {conversationMessages.filter(m => m.role === 'user').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ela Responses:</span>
                    <span className="font-medium">
                      {conversationMessages.filter(m => m.role === 'ela').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages Panel */}
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">💬 Full Conversation</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}