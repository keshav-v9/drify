
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { 
  Heart, 
  LogOut, 
  MessageCircle, 
  Send, 
  Bot, 
  User as UserIcon,
  Brain,
  ArrowLeft
} from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AlzheimerHelp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: 'Hello! I\'m here to help you with Alzheimer\'s care. I can provide guidance on managing symptoms, suggest helpful products, daily care routines, and offer emotional support. How can I assist you today?',
    timestamp: new Date()
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setMessages([welcomeMessage]);
      } else {
        navigate('/sign-in');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          navigate('/sign-in');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      navigate('/');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: {
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          type: 'alzheimer' // Specify this is for Alzheimer's assistance
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface flex-shrink-0">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[2px] bg-primary" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Drify</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>Profile</Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-8">
        <div className="flex h-full flex-col">
          <div className="mb-6 border-b border-border pb-4">
            <h1 className="text-[22px] font-semibold leading-tight">Care questions</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Ask about symptom changes, daily routines, useful products, or how to handle a
              difficult day.
            </p>
          </div>

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              <ScrollArea className="flex-1 p-4 min-h-[500px]" ref={scrollAreaRef}>
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
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted-foreground/30 text-muted-foreground'
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
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted-foreground/30 text-muted-foreground flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="inline-block p-3 rounded-lg bg-secondary">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                    placeholder="Ask about Alzheimer's care, symptoms, products, or daily routines..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="bg-primary hover:bg-primary"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AlzheimerHelp;
