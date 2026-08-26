import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Plus, Edit2, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface BudgetManagementProps {
  user: User | null;
}

interface BudgetCategory {
  id: string;
  name: string;
  monthly_budget: number;
  color: string;
  created_at: string;
  updated_at: string;
}

interface Expense {
  id: string;
  category_id: string | null;
  amount: number;
  expense_date: string;
}

const BudgetManagement = ({ user }: BudgetManagementProps) => {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    monthly_budget: '',
    color: '#3B82F6'
  });

  const defaultColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
    '#F97316', '#84CC16', '#EC4899', '#6366F1'
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoryData, error: categoryError } = await supabase
        .from('budget_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (categoryError) throw categoryError;

      // Get current month date range
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Fetch expenses for current month only
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('id, category_id, amount, expense_date')
        .gte('expense_date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('expense_date', lastDayOfMonth.toISOString().split('T')[0]);

      if (expenseError) throw expenseError;

      // If no categories exist, create default ones
      if (!categoryData || categoryData.length === 0) {
        await createDefaultCategories();
      } else {
        setCategories(categoryData);
        setExpenses(expenseData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCategories = async () => {
    const defaultCategories = [
      { name: 'Care Facility', monthly_budget: 0, color: '#3B82F6' },
      { name: 'Medications', monthly_budget: 0, color: '#10B981' },
      { name: 'Medical Appointments', monthly_budget: 0, color: '#F59E0B' },
      { name: 'Transportation', monthly_budget: 0, color: '#EF4444' },
      { name: 'Personal Care', monthly_budget: 0, color: '#8B5CF6' },
      { name: 'Insurance', monthly_budget: 0, color: '#06B6D4' }
    ];

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert(defaultCategories.map(cat => ({ ...cat, user_id: user?.id })))
        .select();

      if (error) throw error;
      setCategories(data || []);
      toast.success('Default budget categories created');
    } catch (error) {
      console.error('Error creating default categories:', error);
      toast.error('Failed to create default categories');
    }
  };

  const getCategorySpent = (categoryId: string): number => {
    // Only calculate spending from current month expenses (already filtered in fetchData)
    return expenses
      .filter(expense => expense.category_id === categoryId)
      .reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
  };

  const getCategoryUtilization = (categoryId: string, monthlyBudget: number): number => {
    if (monthlyBudget === 0) return 0;
    const spent = getCategorySpent(categoryId);
    return Math.min((spent / monthlyBudget) * 100, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const categoryData = {
        name: formData.name,
        monthly_budget: parseFloat(formData.monthly_budget) || 0,
        color: formData.color,
        user_id: user.id
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('budget_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Budget category updated');
      } else {
        const { error } = await supabase
          .from('budget_categories')
          .insert([categoryData]);

        if (error) throw error;
        toast.success('Budget category added');
      }

      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Budget category deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', monthly_budget: '', color: '#3B82F6' });
    setEditingCategory(null);
    setIsAddDialogOpen(false);
  };

  const startEdit = (category: BudgetCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      monthly_budget: category.monthly_budget.toString(),
      color: category.color
    });
    setIsAddDialogOpen(true);
  };

  const totalBudget = categories.reduce((sum, cat) => sum + cat.monthly_budget, 0);

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 className="text-base font-semibold leading-tight">Budget</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {categories.length} categories · ${totalBudget.toLocaleString()} planned this month
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetForm()}>Add category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit category' : 'Add category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Category name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. care facility"
                  required
                />
              </div>
              <div>
                <Label htmlFor="budget">Monthly budget</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_budget: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label>Colour marker</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select colour ${color}`}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`h-6 w-6 rounded-[3px] border ${
                        formData.color === color ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  {editingCategory ? 'Save changes' : 'Add category'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="border-t border-border py-8">
          <p className="text-sm text-muted-foreground">
            No categories yet. Add one to start planning care expenses.
          </p>
        </div>
      ) : (
        <div className="border-t border-border">
          <div className="hidden grid-cols-12 gap-4 border-b border-border py-2 sm:grid">
            <span className="field-label col-span-5">Category</span>
            <span className="field-label col-span-2 text-right">Budget</span>
            <span className="field-label col-span-2 text-right">Spent</span>
            <span className="field-label col-span-3 text-right">Used</span>
          </div>
          <div className="divide-y divide-border">
            {categories.map((category) => {
              const spent = getCategorySpent(category.id);
              const utilization = getCategoryUtilization(category.id, category.monthly_budget);
              const over = spent > category.monthly_budget && category.monthly_budget > 0;

              return (
                <div key={category.id} className="grid grid-cols-12 items-center gap-4 py-2.5">
                  <div className="col-span-12 flex items-center gap-2 sm:col-span-5">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-[2px]"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate text-sm">{category.name}</span>
                  </div>
                  <div className="col-span-4 text-right text-sm tabular-nums sm:col-span-2">
                    ${category.monthly_budget.toLocaleString()}
                  </div>
                  <div className={`col-span-4 text-right text-sm tabular-nums ${over ? 'text-destructive' : ''}`}>
                    ${spent.toLocaleString()}
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-3 sm:col-span-3">
                    <Progress value={utilization} className="hidden h-1 w-20 sm:block" />
                    <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                      {utilization.toFixed(0)}%
                    </span>
                    <div className="flex">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startEdit(category)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(category.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};


export default BudgetManagement;
