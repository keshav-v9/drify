
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Plus, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSessionsProps {
  user: User | null;
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

const ChatSessions = ({ user, activeSessionId, onSessionSelect, onNewSession }: ChatSessionsProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast.error('Failed to load chat sessions');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering session selection
    
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (activeSessionId === sessionId) {
        onNewSession();
      }
      
      toast.success('Chat session deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleSessionClick = (sessionId: string) => {
    console.log('Session clicked:', sessionId);
    onSessionSelect(sessionId);
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="w-64 bg-secondary border-r h-full flex flex-col">
      <div className="p-4 border-b">
        <Button 
          onClick={onNewSession}
          className="w-full flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {sessions.map((session) => (
            <Card 
              key={session.id}
              className={`cursor-pointer transition-colors hover:bg-secondary ${
                activeSessionId === session.id ? 'bg-secondary border-border' : ''
              }`}
              onClick={() => handleSessionClick(session.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {session.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => deleteSession(session.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No chat sessions yet.<br />
              Click "New Chat" to start!
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatSessions;
