
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { MessageCircle, Send, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import ChatSessions from "./ChatSessions";

interface ChatBotProps {
  user: User | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  session_id?: string;
}

const ChatBot = ({ user }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: 'Hello! I\'m your FinSage assistant. I can help you with budgeting, expense tracking, and financial planning for care-related expenses. How can I assist you today?',
    timestamp: new Date()
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      // Show welcome message for new chat
      setMessages([welcomeMessage]);
    }
  }, [activeSessionId]);

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages = data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        session_id: msg.session_id
      }));

      setMessages(loadedMessages.length > 0 ? loadedMessages : [welcomeMessage]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat messages');
      setMessages([welcomeMessage]);
    }
  };

  const saveMessage = async (message: Omit<Message, 'id' | 'timestamp'>, sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: message.role,
          content: message.content,
          user_id: user?.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const createNewSession = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...' 
        : firstMessage;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: title
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create chat session');
      return null;
    }
  };

  const updateSessionTimestamp = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating session timestamp:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    let sessionId = activeSessionId;
    
    // Create new session if this is the first message
    if (!sessionId) {
      sessionId = await createNewSession(input.trim());
      if (!sessionId) return;
      setActiveSessionId(sessionId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      session_id: sessionId
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message
    await saveMessage(userMessage, sessionId);

    try {
      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: {
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        session_id: sessionId
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message and update session timestamp
      await saveMessage(assistantMessage, sessionId);
      await updateSessionTimestamp(sessionId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([welcomeMessage]);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
        <p className="text-gray-600">Get personalized financial advice and support for your care planning</p>
      </div>

      <div className="flex-1 flex min-h-0">
        <ChatSessions
          user={user}
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
        />

        <Card className="flex-1 flex flex-col min-h-0 ml-4">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <span>FinSage Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 p-4 min-h-[400px]" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {message.role === 'user' ? (
                        <UserIcon className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block p-3 rounded-lg bg-gray-100">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about budgeting and care planning..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBot;
