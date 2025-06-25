import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  monthly_income: number;
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

  // Dialog states
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category_id: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    name: '',
    monthly_budget: '',
    color: '#3B82F6'
  });

  const [incomeForm, setIncomeForm] = useState({
    monthly_income: '',
    emergency_fund_target: '',
    monthly_expense_estimate: ''
  });

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

      // Fetch financial plan with monthly_income
      const { data: planData } = await supabase
        .from('financial_plans')
        .select('monthly_income, emergency_fund_target, current_emergency_fund, monthly_expense_estimate')
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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          expense_date: expenseForm.expense_date,
          category_id: expenseForm.category_id || null,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success('Expense added successfully');
      setShowExpenseDialog(false);
      setExpenseForm({
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        category_id: ''
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budget_categories')
        .insert([{
          name: budgetForm.name,
          monthly_budget: parseFloat(budgetForm.monthly_budget),
          color: budgetForm.color,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success('Budget category added successfully');
      setShowBudgetDialog(false);
      setBudgetForm({
        name: '',
        monthly_budget: '',
        color: '#3B82F6'
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding budget category:', error);
      toast.error('Failed to add budget category');
    }
  };

  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const planData = {
        monthly_income: parseFloat(incomeForm.monthly_income),
        emergency_fund_target: parseFloat(incomeForm.emergency_fund_target),
        monthly_expense_estimate: parseFloat(incomeForm.monthly_expense_estimate),
        user_id: user.id
      };

      if (financialPlan) {
        const { error } = await supabase
          .from('financial_plans')
          .update(planData)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('financial_plans')
          .insert([planData]);
        if (error) throw error;
      }

      toast.success('Monthly income updated successfully');
      setShowIncomeDialog(false);
      setIncomeForm({
        monthly_income: '',
        emergency_fund_target: '',
        monthly_expense_estimate: ''
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating monthly income:', error);
      toast.error('Failed to update monthly income');
    }
  };

  const totalMonthlyBudget = financialPlan?.monthly_income || 0;
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
            <CardTitle className="text-sm font-medium">Monthly Income Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyBudget.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ${(totalMonthlyBudget - currentMonthExpenses).toLocaleString()} remaining this month
            </div>
            <Progress 
              value={totalMonthlyBudget > 0 ? (currentMonthExpenses / totalMonthlyBudget) * 100 : 0} 
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
              {totalMonthlyBudget > 0 ? ((currentMonthExpenses / totalMonthlyBudget) * 100).toFixed(1) : 0}% of budget used
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
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => setShowExpenseDialog(true)}
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Add Expense</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => setShowBudgetDialog(true)}
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-sm">Update Budget</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => {
                setIncomeForm({
                  monthly_income: financialPlan?.monthly_income?.toString() || '',
                  emergency_fund_target: financialPlan?.emergency_fund_target?.toString() || '',
                  monthly_expense_estimate: financialPlan?.monthly_expense_estimate?.toString() || ''
                });
                setShowIncomeDialog(true);
              }}
            >
              <PiggyBank className="h-5 w-5" />
              <span className="text-sm">Update Income</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center space-y-2"
              onClick={() => toast.info("Care planning tools coming soon")}
            >
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

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Monthly care facility payment"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={expenseForm.category_id}
                onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {budgetCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowExpenseDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Budget Dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div>
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Medical Care"
                required
              />
            </div>
            <div>
              <Label htmlFor="budget">Monthly Budget</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={budgetForm.monthly_budget}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, monthly_budget: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="color">Category Color</Label>
              <Input
                id="color"
                type="color"
                value={budgetForm.color}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, color: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowBudgetDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Category</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Income Dialog */}
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Monthly Income & Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateIncome} className="space-y-4">
            <div>
              <Label htmlFor="monthly_income">Monthly Income</Label>
              <Input
                id="monthly_income"
                type="number"
                step="0.01"
                value={incomeForm.monthly_income}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, monthly_income: e.target.value }))}
                placeholder="0.00"
                required
              />
              <p className="text-sm text-gray-500 mt-1">This will be your total monthly budget</p>
            </div>
            <div>
              <Label htmlFor="target">Target Emergency Fund</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                value={incomeForm.emergency_fund_target}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, emergency_fund_target: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="monthly">Monthly Care Expense Estimate</Label>
              <Input
                id="monthly"
                type="number"
                step="0.01"
                value={incomeForm.monthly_expense_estimate}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, monthly_expense_estimate: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowIncomeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Income</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardOverview;
