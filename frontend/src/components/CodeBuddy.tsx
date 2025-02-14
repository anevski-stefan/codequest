import { AxiosError } from 'axios';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Bot, Minimize2, User, StopCircle, History, X, TrashIcon } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { api } from '../services/github';
import ReactMarkdown from 'react-markdown';
import { useAIService } from '../hooks/useAIService';
import { decryptData } from '../utils/encryption';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { Components } from 'react-markdown';
import { toast } from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  experienceLevel?: string;
  interests?: string[];
  recentSearches?: string[];
  lastViewedIssues?: string[];
}

interface ChatHistory {
  id: string;
  user_id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

const markdownComponents: Components = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  )
};

const TypingMarkdown = ({ text, onComplete }: { text: string; onComplete: () => void }) => {
  const [currentText, setCurrentText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setCurrentText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <ReactMarkdown 
      className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-base prose-p:text-sm"
      components={markdownComponents}
    >
      {currentText}
    </ReactMarkdown>
  );
};

const ThinkingAnimation = () => (
  <div className="font-mono text-sm text-blue-500 dark:text-blue-400 animate-pulse flex items-center h-8">
    <span className="opacity-75">{'>'}</span> Processing
  </div>
);

const CodeBuddy = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [context] = useState<ChatContext>({});
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('codeBuddyExpanded');
    return saved ? JSON.parse(saved) : false;
  });
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingMessage, setCurrentTypingMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const selectedService = useAIService();
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const queryClient = useQueryClient();

  const { data: chatHistory } = useQuery<ChatHistory[]>(
    ['chatHistory', user?.id],
    async () => {
      const token = localStorage.getItem('token');
      if (!token || !user?.id) throw new Error('Not authenticated');
      
      try {
        const response = await api.get(`/api/chats/${user.id}`, {
          headers: {
            'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
          }
        });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          console.error('Chat history fetch error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            userId: user.id,
            headers: error.response?.headers
          });
        }
        throw error;
      }
    },
    {
      enabled: !!user?.id && isAuthenticated && showSidebar,
      staleTime: 1000 * 60 * 5,
      retry: false,
      onError: (error) => {
        toast.error('Failed to load chat history');
        console.error('Query error:', error);
      }
    }
  );

  const loadChat = (chat: ChatHistory) => {
    setMessages(chat.messages);
    setShowSidebar(false);
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const currentCursor = cursorPositionRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.focus();
      textarea.setSelectionRange(currentCursor, currentCursor);
    }
  }, [input]);

  const chatMutation = useMutation({
    mutationFn: async ({ message, context }: { message: string; context: ChatContext }) => {
      abortControllerRef.current = new AbortController();
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      let currentService = selectedService;
      const chatgptKey = decryptData(localStorage.getItem('chatgpt_api_key') || '');
      const geminiKey = decryptData(localStorage.getItem('gemini_api_key') || '');
      
      if (!chatgptKey && !geminiKey) {
        throw new Error('Please set up either ChatGPT or Gemini API key in settings');
      }

      if (currentService === 'chatgpt' && !chatgptKey && geminiKey) {
        currentService = 'gemini';
        localStorage.setItem('ai_service', 'gemini');
      } else if (currentService === 'gemini' && !geminiKey && chatgptKey) {
        currentService = 'chatgpt';
        localStorage.setItem('ai_service', 'chatgpt');
      }

      const apiKey = currentService === 'chatgpt' ? chatgptKey : geminiKey;
      if (!apiKey) {
        throw new Error(`Please set up your ${currentService.toUpperCase()} API key in settings`);
      }

      const formattedMessages = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      try {
        const response = await api.post('/api/code-buddy/chat', {
          message,
          context,
          messages: formattedMessages,
          service: currentService,
          apiKey
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: abortControllerRef.current.signal
        });
        
        if (!response.data?.message) {
          throw new Error('Invalid response from server');
        }
        
        return response.data;
      } catch (error: unknown) {
        if (error && typeof error === 'object' && (
          ('name' in error && error.name === 'AbortError') ||
          ('message' in error && typeof error.message === 'string' && 
           (error.message.includes('canceled') || error.message.includes('cancelled')))
        )) {
          throw new Error('Request cancelled');
        }
        if (error instanceof AxiosError) {
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
          if (error.response?.status === 401) {
            throw new Error(`Invalid ${currentService.toUpperCase()} API key. Please check your settings.`);
          } else if (error.response?.status === 500) {
            throw new Error(`${currentService.toUpperCase()} service error. Please try again or switch services.`);
          }
          throw new Error(errorMessage);
        }
        throw error instanceof Error ? error : new Error('An unexpected error occurred');
      }
    },
    onSuccess: (data) => {
      setIsThinking(false);
      setIsTyping(true);
      setCurrentTypingMessage(data.message);
      
      setMessages(prev => 
        prev.map((msg, i) => 
          i === prev.length - 1
            ? { ...msg, content: '' }
            : msg
        )
      );
    },
    onError: (error: Error) => {
      setIsThinking(false);
      setIsTyping(false);
      
      if (error.message === 'Request cancelled' || error.message.includes('cancel')) {
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      setMessages(prev => 
        prev.map((msg, i) => 
          i === prev.length - 1
            ? { ...msg, content: `Error: ${error.message}. Please try again.` }
            : msg
        )
      );

      if (error.message.includes('API key')) {
        const currentService = localStorage.getItem('ai_service') || 'chatgpt';
        const otherService = currentService === 'chatgpt' ? 'Gemini' : 'ChatGPT';
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Tip: You can switch to ${otherService} in settings if you have it configured.`,
          timestamp: new Date()
        }]);
      }
    }
  });

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);
    setIsThinking(true);
    
    setInput('');
    cursorPositionRef.current = 0;

    try {
      // First, get the chat response
      const chatResponse = await chatMutation.mutateAsync({
        message: input,
        context
      });

      // Create the complete messages array with both user message and AI response
      const updatedMessages = [
        ...messages,
        userMessage,
        {
          role: 'assistant',
          content: chatResponse.message,
          timestamp: new Date()
        }
      ];

      // Then save the chat history
      const token = localStorage.getItem('token');
      if (token && user?.id) {
        try {
          await api.post('/api/chats', {
            messages: updatedMessages,
            userId: user.id,
            title: messages.length === 0 ? input.substring(0, 50) + '...' : undefined
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          // Invalidate the chat history query to trigger a refresh
          queryClient.invalidateQueries(['chatHistory', user.id]);
        } catch (error) {
          console.error('Failed to save chat:', error);
          toast.error('Failed to save chat history');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'Request cancelled') {
        console.error('Chat error:', error);
      }
    }
  }, [input, context, chatMutation, isTyping, messages, user?.id, queryClient]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setIsTyping(false);
    setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
  }, []);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('codeBuddyExpanded', JSON.stringify(newState));
  };

  const deleteChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user?.id) {
        toast.error('You must be logged in to delete chats');
        return;
      }

      await api.delete(`/api/chats/${chatId}`, {
        headers: {
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'user-id': user.id
        }
      });

      // Optimistically update UI
      queryClient.setQueryData(['chatHistory', user.id], (oldData: ChatHistory[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(chat => chat.id !== chatId);
      });

      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
      // Refetch to ensure UI is in sync with server
      if (user?.id) {
        queryClient.invalidateQueries(['chatHistory', user.id]);
      }
    }
  };

  const renderMessage = (msg: Message, idx: number) => {
    const isLastMessage = idx === messages.length - 1;
    const showTypingAnimation = isLastMessage && isTyping && msg.role === 'assistant';
    const showThinkingAnimation = isLastMessage && isThinking && msg.role === 'assistant';
    const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });

    if (showThinkingAnimation) {
      return (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <ThinkingAnimation />
        </div>
      );
    }

    return (
      <div
        key={idx}
        className={`flex items-start gap-2 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        {msg.role === 'assistant' && (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}
        
        <div className="max-w-[85%]">
          <div
            className={`${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700'
            } p-3 rounded-lg break-words overflow-hidden`}
          >
            <div className="flex flex-col gap-2">
              {msg.role === 'assistant' && showTypingAnimation ? (
                <TypingMarkdown
                  text={currentTypingMessage}
                  onComplete={() => {
                    setIsTyping(false);
                    setMessages(prev => 
                      prev.map((m, i) => 
                        i === prev.length - 1 
                          ? { ...m, content: currentTypingMessage }
                          : m
                      )
                    );
                  }}
                />
              ) : (
                msg.role === 'assistant' ? (
                  <ReactMarkdown 
                    className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-base prose-p:text-sm"
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {timestamp}
          </div>
        </div>
        
        {msg.role === 'user' && (
          <div className="w-8 h-8 rounded-full flex-shrink-0">
            {isAuthenticated && user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="User avatar" 
                className="w-full h-full rounded-full"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isExpanded && showSidebar && (
        <div className="fixed bottom-4 right-[470px] w-72 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
          <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Chat History</h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {chatHistory?.length ? (
              <div className="space-y-2">
                {chatHistory.map((chat) => (
                  <div key={chat.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group">
                    <button
                      onClick={() => loadChat(chat)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    {user?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete chat"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No chat history found
              </p>
            )}
          </div>
        </div>
      )}

      <div 
        className={`fixed bottom-4 right-4 shadow-lg flex flex-col transition-all duration-300 ${
          isExpanded 
            ? 'w-[450px] h-[600px] rounded-lg bg-white dark:bg-gray-800' 
            : 'w-16 h-16 rounded-full border-2 border-blue-500 bg-gray-50 dark:bg-gray-700'
        }`}
      >
        <div 
          onClick={toggleExpanded}
          className={`flex items-center justify-between cursor-pointer transition-colors ${
            isExpanded 
              ? 'p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              : 'w-full h-full rounded-full hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold">Code Buddy</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    Powered by {selectedService}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSidebar(!showSidebar);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  title="Chat History"
                >
                  <History className="w-5 h-5" />
                </button>
                <div className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <Minimize2 className="w-5 h-5" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Bot className="w-8 h-8 text-blue-500" />
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => renderMessage(msg, idx))}
            </div>

            <div className="p-4 border-t dark:border-gray-700">
              <div className="relative flex items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    if (isTyping) return;
                    const selectionStart = e.target.selectionStart;
                    setInput(e.target.value);
                    cursorPositionRef.current = selectionStart;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isTyping}
                  placeholder="Ask me anything about coding..."
                  className="flex-1 max-h-32 p-2 pr-10 bg-gray-100 dark:bg-gray-700 rounded-lg resize-none overflow-y-auto"
                  rows={1}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  {isThinking && (
                    <button
                      onClick={handleStop}
                      className="p-1 text-red-500 hover:text-red-600"
                      title="Stop generating"
                    >
                      <StopCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="p-1 text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                    title="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CodeBuddy; 