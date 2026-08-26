
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Plus, Edit2, Trash2, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ExpenseTrackingProps {
  user: User | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  color: string;
}

const ExpenseTracking = ({ user }: ExpenseTrackingProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category_id: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expenseError) throw expenseError;

      // Fetch categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('budget_categories')
        .select('id, name, color')
        .order('name');

      if (categoryError) throw categoryError;

      setExpenses(expenseData || []);
      setCategories(categoryData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const expenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        category_id: formData.category_id || null,
        user_id: user.id
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('Expense updated');
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;
        toast.success('Expense added');
      }

      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      category_id: ''
    });
    setEditingExpense(null);
    setIsAddDialogOpen(false);
  };

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: Math.abs(expense.amount).toString(),
      expense_date: expense.expense_date,
      category_id: expense.category_id || ''
    });
    setIsAddDialogOpen(true);
  };

  const getCategoryName = (categoryId: string | null) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const getCategoryColor = (categoryId: string | null) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#6B7280';
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Math.abs(exp.amount), 0);
  const thisMonthExpenses = expenses
    .filter(exp => new Date(exp.expense_date).getMonth() === new Date().getMonth())
    .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 className="text-base font-semibold leading-tight">Expenses</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {expenses.length} entries · ${thisMonthExpenses.toLocaleString()} this month ·
            ${totalExpenses.toLocaleString()} all time
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetForm()}>Add expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit expense' : 'Add expense'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. monthly care facility payment"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-[2px]"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {editingExpense ? 'Save changes' : 'Add expense'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {expenses.length === 0 ? (
        <div className="border-t border-border py-8">
          <p className="text-sm text-muted-foreground">
            No expenses recorded yet. Add one to see it against your budget.
          </p>
        </div>
      ) : (
        <div className="border-t border-border">
          <div className="hidden grid-cols-12 gap-4 border-b border-border py-2 sm:grid">
            <span className="field-label col-span-2">Date</span>
            <span className="field-label col-span-5">Description</span>
            <span className="field-label col-span-2">Category</span>
            <span className="field-label col-span-3 text-right">Amount</span>
          </div>
          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <div key={expense.id} className="grid grid-cols-12 items-center gap-4 py-2.5">
                <span className="col-span-4 text-xs tabular-nums text-muted-foreground sm:col-span-2">
                  {new Date(expense.expense_date).toLocaleDateString()}
                </span>
                <span className="col-span-8 truncate text-sm sm:col-span-5">{expense.description}</span>
                <span className="col-span-5 flex items-center gap-2 text-[13px] text-muted-foreground sm:col-span-2">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-[2px]"
                    style={{ backgroundColor: getCategoryColor(expense.category_id) }}
                  />
                  <span className="truncate">{getCategoryName(expense.category_id)}</span>
                </span>
                <div className="col-span-7 flex items-center justify-end gap-3 sm:col-span-3">
                  <span className="text-sm tabular-nums">
                    ${Math.abs(expense.amount).toLocaleString()}
                  </span>
                  <div className="flex">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startEdit(expense)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(expense.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export default ExpenseTracking;
