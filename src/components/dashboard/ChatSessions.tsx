
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
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
    <div className="flex h-full w-56 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border p-2">
        <Button size="sm" onClick={onNewSession} className="w-full">
          New chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {sessions.map((session) => (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSessionClick(session.id)}
              onClick={() => handleSessionClick(session.id)}
              className={`group flex cursor-pointer items-start justify-between gap-2 px-3 py-2 transition-colors hover:bg-accent ${
                activeSessionId === session.id ? 'bg-accent' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] leading-tight">{session.title}</p>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {new Date(session.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                onClick={(e) => deleteSession(session.id, e)}
              >
                Delete
              </Button>
            </div>
          ))}

          {sessions.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground">No saved chats yet.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};


export default ChatSessions;
