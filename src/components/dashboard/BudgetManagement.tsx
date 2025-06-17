
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

const BudgetManagement = ({ user }: BudgetManagementProps) => {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
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
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // If no categories exist, create default ones
      if (!data || data.length === 0) {
        await createDefaultCategories();
      } else {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load budget categories');
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

      fetchCategories();
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
      fetchCategories();
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
    return <div className="text-center py-8">Loading budget categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budget Management</h2>
          <p className="text-gray-600">Plan and track your monthly care budget</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Budget Category' : 'Add Budget Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Care Facility"
                  required
                />
              </div>
              <div>
                <Label htmlFor="budget">Monthly Budget</Label>
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
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Update' : 'Add'} Category
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Budget Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Total Monthly Budget</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            ${totalBudget.toLocaleString()}
          </div>
          <p className="text-gray-600">Across {categories.length} categories</p>
        </CardContent>
      </Card>

      {/* Budget Categories */}
      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-600">
                      Monthly Budget: ${category.monthly_budget.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(category)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget Utilization</span>
                  <span>0% (Coming soon)</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <DollarSign className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Categories</h3>
              <p className="text-gray-600 mb-4">
                Create your first budget category to start planning your care expenses.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Category
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetManagement;
