
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Session } from "@supabase/supabase-js";

interface CareRecipient {
  id: string;
  name: string;
  age: number | null;
  relationship: string | null;
}

interface FinancialPlan {
  id: string;
  emergency_fund_target: number | null;
  monthly_expense_estimate: number | null;
  current_emergency_fund: number | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [careRecipients, setCareRecipients] = useState<CareRecipient[]>([]);
  const [financialPlans, setFinancialPlans] = useState<FinancialPlan[]>([]);
  const navigate = useNavigate();

  const fetchData = async (userId: string) => {
    try {
      // Fetch care recipients
      const { data: recipients } = await supabase
        .from('care_recipients')
        .select('*')
        .eq('user_id', userId);

      if (recipients) {
        setCareRecipients(recipients);
      }

      // Fetch financial plans
      const { data: plans } = await supabase
        .from('financial_plans')
        .select('*')
        .eq('user_id', userId);

      if (plans) {
        setFinancialPlans(plans);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate('/sign-in');
      } else {
        fetchData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          navigate('/sign-in');
        } else {
          fetchData(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalEmergencyFundTarget = financialPlans.reduce((sum, plan) => 
    sum + (plan.emergency_fund_target || 0), 0
  );
  
  const totalCurrentEmergencyFund = financialPlans.reduce((sum, plan) => 
    sum + (plan.current_emergency_fund || 0), 0
  );
  
  const totalMonthlyExpenses = financialPlans.reduce((sum, plan) => 
    sum + (plan.monthly_expense_estimate || 0), 0
  );

  const hasData = careRecipients.length > 0 || financialPlans.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">FinSage</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user.email}</span>
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
            <p className="text-gray-600">Manage your care recipient's financial information</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Emergency Fund</CardTitle>
                <CardDescription>Current emergency fund status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 mb-2">
                  ${totalCurrentEmergencyFund.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">
                  Target: ${totalEmergencyFundTarget.toLocaleString()}
                </p>
                {totalEmergencyFundTarget > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min((totalCurrentEmergencyFund / totalEmergencyFundTarget) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round((totalCurrentEmergencyFund / totalEmergencyFundTarget) * 100)}% of target
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Monthly Expenses</CardTitle>
                <CardDescription>Estimated monthly costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  ${totalMonthlyExpenses.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">
                  {totalMonthlyExpenses > 0 ? "Monthly budget" : "Budget: Not set"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-600">Care Recipients</CardTitle>
                <CardDescription>People you're caring for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {careRecipients.length}
                </div>
                <p className="text-sm text-gray-500">
                  {careRecipients.length === 0 ? "No recipients added" : 
                   careRecipients.length === 1 ? "1 recipient" : 
                   `${careRecipients.length} recipients`}
                </p>
              </CardContent>
            </Card>
          </div>

          {careRecipients.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Your Care Recipients</CardTitle>
                <CardDescription>People you're currently caring for</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {careRecipients.map((recipient) => (
                    <div key={recipient.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">{recipient.name}</h3>
                        <p className="text-sm text-gray-600">
                          {recipient.relationship && `${recipient.relationship} • `}
                          {recipient.age && `Age ${recipient.age}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!hasData && (
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>Complete your setup to start managing finances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={() => navigate('/onboarding')}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Complete Onboarding
                  </Button>
                  <p className="text-sm text-gray-500 text-center">
                    Set up your care recipient information and financial goals
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
