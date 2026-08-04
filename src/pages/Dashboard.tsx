import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import BudgetManagement from "@/components/dashboard/BudgetManagement";
import ExpenseTracking from "@/components/dashboard/ExpenseTracking";
import ChatBot from "@/components/dashboard/ChatBot";
import PlanningTools from "@/components/dashboard/PlanningTools";
import FamilyCollaboration from "@/components/dashboard/FamilyCollaboration";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/alzheimer-help')}>
              Care questions
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8">
        <Tabs defaultValue="overview" className="flex h-full flex-col">
          <div className="mb-8 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-[22px] font-semibold leading-tight">This month</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Budget, expenses and care planning for the person you look after.
              </p>
            </div>
            <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto bg-secondary sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="family">Family</TabsTrigger>
              <TabsTrigger value="ai-assistant">Assistant</TabsTrigger>
              <TabsTrigger value="planning">Planning</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1">
            <TabsContent value="overview" className="mt-0 h-full">
              <DashboardOverview user={user} />
            </TabsContent>

            <TabsContent value="budget" className="mt-0 h-full">
              <BudgetManagement user={user} />
            </TabsContent>

            <TabsContent value="expenses" className="mt-0 h-full">
              <ExpenseTracking user={user} />
            </TabsContent>

            <TabsContent value="family" className="mt-0 h-full">
              <FamilyCollaboration user={user} />
            </TabsContent>

            <TabsContent value="ai-assistant" className="mt-0 h-full">
              <ChatBot user={user} />
            </TabsContent>

            <TabsContent value="planning" className="mt-0 h-full">
              <PlanningTools user={user} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
