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
  LogOut,
  Plus,
  Brain
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src="/lovable-uploads/c6dcf3e7-6145-4715-9664-ada864473643.png" alt="Drify Logo" className="h-8 w-8" />
              <h1 className="text-2xl font-bold text-blue-600">Drify</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/profile')}
                className="text-gray-600 hover:text-blue-600"
              >
                Profile
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
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Alzheimer's Care Support?</h3>
                  <p className="text-gray-600 mb-4">Get personalized guidance, product recommendations, and emotional support for Alzheimer's care.</p>
                  <Button 
                    onClick={() => navigate('/alzheimer-help')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Alzheimer Help
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6 h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm flex-shrink-0">
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

          <div className="flex-1 min-h-0">
            <TabsContent value="overview" className="h-full">
              <DashboardOverview user={user} />
            </TabsContent>

            <TabsContent value="budget" className="h-full">
              <BudgetManagement user={user} />
            </TabsContent>

            <TabsContent value="expenses" className="h-full">
              <ExpenseTracking user={user} />
            </TabsContent>

            <TabsContent value="ai-assistant" className="h-full">
              <ChatBot user={user} />
            </TabsContent>

            <TabsContent value="planning" className="h-full">
              <PlanningTools user={user} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
