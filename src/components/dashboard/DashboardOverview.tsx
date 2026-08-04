
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  AlertTriangle,
  CheckCircle,
  Plus,
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
      console.log('Fetching dashboard data for user:', user?.id);
      
      // Fetch budget categories
      const { data: categories, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }

      // Fetch recent expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user?.id)
        .order('expense_date', { ascending: false })
        .limit(5);

      if (expenseError) {
        console.error('Error fetching expenses:', expenseError);
      }

      // Fetch financial plan
      const { data: planData, error: planError } = await supabase
        .from('financial_plans')
        .select('monthly_income, emergency_fund_target, current_emergency_fund, monthly_expense_estimate')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (planError) {
        console.error('Error fetching financial plan:', planError);
      }

      // Fetch care recipient
      const { data: recipientData, error: recipientError } = await supabase
        .from('care_recipients')
        .select('name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (recipientError) {
        console.error('Error fetching care recipient:', recipientError);
      }

      console.log('Care recipient data:', recipientData);

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
    if (emergencyFundMonths >= 6) return { text: "Well Funded", color: "bg-success", variant: "default" as const };
    if (emergencyFundMonths >= 3) return { text: "Building Up", color: "bg-warning", variant: "secondary" as const };
    return { text: "Needs Attention", color: "bg-destructive", variant: "destructive" as const };
  };

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-10">
      {/* Snapshot */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {careRecipient ? `Care for ${careRecipient.name}` : 'Your care finances'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ${(totalMonthlyBudget - currentMonthExpenses).toLocaleString()} left of this month&rsquo;s budget.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowExpenseDialog(true)}>
              <Plus className="h-4 w-4" />
              Add expense
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowBudgetDialog(true)}>
              Add category
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIncomeForm({
                  monthly_income: financialPlan?.monthly_income?.toString() || '',
                  emergency_fund_target: financialPlan?.emergency_fund_target?.toString() || '',
                  monthly_expense_estimate: financialPlan?.monthly_expense_estimate?.toString() || ''
                });
                setShowIncomeDialog(true);
              }}
            >
              Update income
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card p-5">
            <p className="field-label">Monthly budget</p>
            <p className="stat-number mt-2">${totalMonthlyBudget.toLocaleString()}</p>
            <Progress
              value={totalMonthlyBudget > 0 ? (currentMonthExpenses / totalMonthlyBudget) * 100 : 0}
              className="mt-3 h-1"
            />
          </div>
          <div className="bg-card p-5">
            <p className="field-label">Spent this month</p>
            <p className="stat-number mt-2">${currentMonthExpenses.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {totalMonthlyBudget > 0 ? ((currentMonthExpenses / totalMonthlyBudget) * 100).toFixed(0) : 0}% of budget used
            </p>
          </div>
          <div className="bg-card p-5">
            <p className="field-label">Emergency fund</p>
            <p className="stat-number mt-2">
              ${financialPlan?.current_emergency_fund?.toLocaleString() || '0'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {emergencyFundMonths.toFixed(1)} months of coverage &middot; {getEmergencyFundStatus().text.toLowerCase()}
            </p>
          </div>
          <div className="bg-card p-5">
            <p className="field-label">Readiness</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium">
              {emergencyFundMonths >= 6 ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              {emergencyFundMonths >= 6 ? 'Well prepared' : 'Still building'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Based on six months of care costs
            </p>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-semibold">Recent expenses</h2>
        </div>
        {expenses.length > 0 ? (
          <ul className="divide-y divide-border">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  ${Math.abs(expense.amount).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8">
            <p className="text-sm font-medium">Nothing logged yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the first care expense to start seeing where the month goes.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShowExpenseDialog(true)}>
              Add expense
            </Button>
          </div>
        )}
      </section>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
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
              <Button type="submit">Add expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Budget Dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add budget category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div>
              <Label htmlFor="name">Category name</Label>
              <Input
                id="name"
                value={budgetForm.name}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Medical Care"
                required
              />
            </div>
            <div>
              <Label htmlFor="budget">Monthly budget</Label>
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
              <Label htmlFor="color">Category color</Label>
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
              <Button type="submit">Add category</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Income Dialog */}
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update income and budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateIncome} className="space-y-4">
            <div>
              <Label htmlFor="monthly_income">Monthly income</Label>
              <Input
                id="monthly_income"
                type="number"
                step="0.01"
                value={incomeForm.monthly_income}
                onChange={(e) => setIncomeForm(prev => ({ ...prev, monthly_income: e.target.value }))}
                placeholder="0.00"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">This will be your total monthly budget</p>
            </div>
            <div>
              <Label htmlFor="target">Target emergency fund</Label>
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
              <Label htmlFor="monthly">Monthly care expense estimate</Label>
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
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardOverview;
