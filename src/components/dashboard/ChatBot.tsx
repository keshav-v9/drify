import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

import { toast } from "sonner";
import ChatSessions from "./ChatSessions";
import { chatMessageSchema } from "@/lib/validation";
import { sanitizeText, getSafeErrorMessage, checkRateLimit } from "@/lib/security";

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
  const [isNewSession, setIsNewSession] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: 'Hello! I\'m your Drify assistant. I can help you with budgeting, expense tracking, and financial planning for care-related expenses. How can I assist you today?',
    timestamp: new Date()
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    console.log('Active session changed to:', activeSessionId);
    if (activeSessionId) {
      loadMessages(activeSessionId);
      setIsNewSession(false);
    } else {
      // Show welcome message for new chat
      setMessages([welcomeMessage]);
      setIsNewSession(true);
    }
  }, [activeSessionId]);

  const loadMessages = async (sessionId: string) => {
    console.log('Loading messages for session:', sessionId);
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
        content: sanitizeText(msg.content), // Sanitize loaded messages
        timestamp: new Date(msg.created_at),
        session_id: msg.session_id
      }));

      console.log('Loaded messages:', loadedMessages);
      setMessages(loadedMessages.length > 0 ? loadedMessages : [welcomeMessage]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error(getSafeErrorMessage(error));
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
          content: sanitizeText(message.content), // Sanitize before saving
          user_id: user?.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error(getSafeErrorMessage(error));
    }
  };

  const createNewSession = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const sanitizedTitle = sanitizeText(firstMessage);
      const title = sanitizedTitle.length > 50 
        ? sanitizedTitle.substring(0, 50) + '...' 
        : sanitizedTitle;

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
      toast.error(getSafeErrorMessage(error));
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

    // Validate input
    const validation = chatMessageSchema.safeParse({ content: input.trim() });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Rate limiting check
    if (!checkRateLimit(user.id, 30, 60000)) {
      toast.error('Too many messages. Please wait a moment before sending another message.');
      return;
    }

    let sessionId = activeSessionId;
    
    // Create new session if this is a new chat (no active session)
    if (!sessionId || isNewSession) {
      sessionId = await createNewSession(input.trim());
      if (!sessionId) return;
      setActiveSessionId(sessionId);
      setIsNewSession(false);
    }

    const sanitizedContent = sanitizeText(input.trim());
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: sanitizedContent,
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
          })),
          type: 'financial'
        }
      });

      if (error) throw error;

      if (!data?.reply) {
        throw new Error('Invalid response from chat service');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: sanitizeText(data.reply),
        timestamp: new Date(),
        session_id: sessionId
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message and update session timestamp
      await saveMessage(assistantMessage, sessionId);
      await updateSessionTimestamp(sessionId);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(getSafeErrorMessage(error));
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = sanitizeText(e.target.value);
    setInput(sanitizedValue);
  };

  const handleSessionSelect = (sessionId: string) => {
    console.log('Selecting session:', sessionId);
    setActiveSessionId(sessionId);
  };

  const handleNewSession = () => {
    console.log('Creating new session');
    setActiveSessionId(null);
    setMessages([welcomeMessage]);
    setIsNewSession(true);
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-semibold leading-tight">Assistant</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Ask about care costs, benefits, or how to plan the next few months.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 border border-border">
        <ChatSessions
          user={user}
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-[400px] flex-1 px-4" ref={scrollAreaRef}>
            <div className="divide-y divide-border">
              {messages.map((message) => (
                <div key={message.id} className="grid gap-1 py-3 sm:grid-cols-12 sm:gap-4">
                  <div className="sm:col-span-2">
                    <span className="field-label">
                      {message.role === 'user' ? 'You' : 'Drify'}
                    </span>
                  </div>
                  <div className="sm:col-span-10">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="grid gap-1 py-3 sm:grid-cols-12 sm:gap-4">
                  <div className="sm:col-span-2">
                    <span className="field-label">Drify</span>
                  </div>
                  <p className="text-sm text-muted-foreground sm:col-span-10">Writing…</p>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex flex-shrink-0 gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Ask about care costs, benefits or planning…"
              disabled={isLoading}
              className="flex-1"
              maxLength={2000}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="sm">
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default ChatBot;
