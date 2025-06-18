
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { 
  DollarSign, 
  PiggyBank, 
  TrendingUp, 
  MessageCircle, 
  Users, 
  FileText,
  Heart,
  Phone,
  LogOut,
  Plus
} from "lucide-react";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import BudgetManagement from "@/components/dashboard/BudgetManagement";
import ExpenseTracking from "@/components/dashboard/ExpenseTracking";
import ChatBot from "@/components/dashboard/ChatBot";
import PlanningTools from "@/components/dashboard/PlanningTools";

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-blue-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-600">FinSage</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/onboarding')}
                className="text-gray-600 hover:text-blue-600"
              >
                Setup
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center space-x-2">
              <PiggyBank className="h-4 w-4" />
              <span>Budget</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>AI Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Planning</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview user={user} />
          </TabsContent>

          <TabsContent value="budget">
            <BudgetManagement user={user} />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseTracking user={user} />
          </TabsContent>

          <TabsContent value="ai-assistant">
            <ChatBot user={user} />
          </TabsContent>

          <TabsContent value="planning">
            <PlanningTools user={user} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Emergency Support Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg rounded-full h-14 w-14 p-0"
          onClick={() => toast.info("Emergency support feature coming soon")}
        >
          <Phone className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
