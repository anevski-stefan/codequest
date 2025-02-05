import { AxiosError } from 'axios';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Bot, Minimize2, Maximize2 } from 'lucide-react';
import { useMutation } from 'react-query';
import { api } from '../services/github';
import ReactMarkdown from 'react-markdown';

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
    }, 30); // Same speed as before

    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <ReactMarkdown className="prose prose-xs dark:prose-invert max-w-none prose-headings:text-base prose-p:text-sm">
      {currentText}
    </ReactMarkdown>
  );
};

const CodeBuddy = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [context] = useState<ChatContext>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingMessage, setCurrentTypingMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

  // Handle textarea height adjustment
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const currentCursor = cursorPositionRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      // Ensure cursor position is maintained after height adjustment
      textarea.focus();
      textarea.setSelectionRange(currentCursor, currentCursor);
    }
  }, [input]);

  const chatMutation = useMutation({
    mutationFn: async ({ message, context }: { message: string; context: ChatContext }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      try {
        const response = await api.post('/api/code-buddy/chat', {
          message,
          context,
          messages: messages.slice(-5)
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.data?.message) {
          throw new Error('Invalid response from server');
        }
        
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
          throw new Error(errorMessage);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      setIsTyping(true);
      setCurrentTypingMessage(data.message);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);
    },
    onError: (error: Error) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }]);
    }
  });

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    cursorPositionRef.current = 0;

    await chatMutation.mutateAsync({
      message: input,
      context
    });
  }, [input, context, chatMutation]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const renderMessage = (msg: Message, idx: number) => {
    const isLastMessage = idx === messages.length - 1;
    const showTypingAnimation = isLastMessage && isTyping && msg.role === 'assistant';

    return (
      <div
        key={idx}
        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[80%] p-3 rounded-lg ${
            msg.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          {msg.role === 'assistant' ? (
            showTypingAnimation ? (
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
              <ReactMarkdown className="prose dark:prose-invert prose-sm max-w-none">
                {msg.content}
              </ReactMarkdown>
            )
          ) : (
            msg.content
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-[450px] h-[600px]' : 'w-72 h-16'
      }`}
    >
      <div 
        onClick={toggleExpanded}
        className="p-4 border-b dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center">
          <Bot className="w-6 h-6 mr-2 text-blue-500" />
          <h3 className="text-lg font-semibold">Code Buddy</h3>
        </div>
        <div className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
          {isExpanded ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </div>
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
                  if (isTyping) return; // Prevent input changes during typing animation
                  const selectionStart = e.target.selectionStart;
                  setInput(e.target.value);
                  cursorPositionRef.current = selectionStart;
                  requestAnimationFrame(() => {
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                      textareaRef.current.setSelectionRange(selectionStart, selectionStart);
                    }
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping} // Disable textarea during typing animation
                placeholder="Ask about beginner-friendly issues..."
                className="flex-1 max-h-32 p-2 pr-10 bg-gray-100 dark:bg-gray-700 rounded-lg resize-none overflow-y-auto"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="absolute right-2 bottom-2 p-1 text-blue-500 hover:text-blue-600 disabled:text-gray-400"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CodeBuddy; 