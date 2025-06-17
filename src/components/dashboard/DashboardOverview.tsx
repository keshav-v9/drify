
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  DollarSign, 
  PiggyBank, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface DashboardOverviewProps {
  user: User | null;
}

interface BudgetCategory {
  id: string;
  name: string;
  monthly_budget: number;
  color: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_id: string;
}

interface FinancialPlan {
  emergency_fund_target: number;
  current_emergency_fund: number;
  monthly_expense_estimate: number;
}

interface CareRecipient {
  name: string;
}

const DashboardOverview = ({ user }: DashboardOverviewProps) => {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialPlan, setFinancialPlan] = useState<FinancialPlan | null>(null);
  const [careRecipient, setCareRecipient] = useState<CareRecipient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch budget categories
      const { data: categories } = await supabase
        .from('budget_categories')
        .select('*')
        .order('created_at', { ascending: true });

      // Fetch recent expenses
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .limit(5);

      // Fetch financial plan
      const { data: planData } = await supabase
        .from('financial_plans')
        .select('*')
        .single();

      // Fetch care recipient
      const { data: recipientData } = await supabase
        .from('care_recipients')
        .select('name')
        .single();

      setBudgetCategories(categories || []);
      setExpenses(expenseData || []);
      setFinancialPlan(planData);
      setCareRecipient(recipientData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalMonthlyBudget = budgetCategories.reduce((sum, cat) => sum + cat.monthly_budget, 0);
  const currentMonthExpenses = expenses
    .filter(exp => new Date(exp.expense_date).getMonth() === new Date().getMonth())
    .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

  const emergencyFundMonths = financialPlan?.current_emergency_fund && financialPlan?.monthly_expense_estimate 
    ? financialPlan.current_emergency_fund / financialPlan.monthly_expense_estimate 
    : 0;

  const getEmergencyFundStatus = () => {
    if (emergencyFundMonths >= 6) return { text: "Well Funded", color: "bg-green-500", variant: "default" as const };
    if (emergencyFundMonths >= 3) return { text: "Building Up", color: "bg-yellow-500", variant: "secondary" as const };
    return { text: "Needs Attention", color: "bg-red-500", variant: "destructive" as const };
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome back! {careRecipient ? `Managing care for ${careRecipient.name}` : 'Ready to manage your care finances'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-100">
            Your comprehensive financial care management dashboard is ready to help you plan and track expenses.
          </p>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyBudget.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ${(totalMonthlyBudget - currentMonthExpenses).toLocaleString()} remaining this month
            </div>
            <Progress 
              value={(currentMonthExpenses / totalMonthlyBudget) * 100} 
              className="mt-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentMonthExpenses.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {((currentMonthExpenses / totalMonthlyBudget) * 100).toFixed(1)}% of budget used
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Fund</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financialPlan?.current_emergency_fund?.toLocaleString() || '0'}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={getEmergencyFundStatus().variant}>
                {getEmergencyFundStatus().text}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {emergencyFundMonths.toFixed(1)} months of coverage
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Care Readiness</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {emergencyFundMonths >= 6 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <span className="text-sm font-medium">
                {emergencyFundMonths >= 6 ? 'Well Prepared' : 'Building Readiness'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Financial preparedness assessment
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Plus className="h-5 w-5" />
              <span className="text-sm">Add Expense</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm">Update Budget</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <PiggyBank className="h-5 w-5" />
              <span className="text-sm">Emergency Fund</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Care Planning</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Expenses</CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(expense.expense_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${Math.abs(expense.amount).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No expenses recorded yet</p>
              <p className="text-sm">Start tracking your care expenses</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
