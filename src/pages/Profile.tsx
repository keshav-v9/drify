import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { Heart, ArrowLeft } from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    careRecipientName: "",
    careRecipientAge: "",
    relationship: "",
    monthlyIncome: "",
    emergencyFundTarget: "",
    monthlyExpenseEstimate: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/sign-in');
        return;
      }

      setUser(session.user);

      try {
        // Load care recipient data
        const { data: careRecipient } = await supabase
          .from('care_recipients')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // Load financial plan data
        const { data: financialPlan } = await supabase
          .from('financial_plans')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (careRecipient) {
          setFormData(prev => ({
            ...prev,
            careRecipientName: careRecipient.name || "",
            careRecipientAge: careRecipient.age?.toString() || "",
            relationship: careRecipient.relationship || ""
          }));
        }

        if (financialPlan) {
          setFormData(prev => ({
            ...prev,
            monthlyIncome: financialPlan.monthly_income?.toString() || "",
            emergencyFundTarget: financialPlan.emergency_fund_target?.toString() || "",
            monthlyExpenseEstimate: financialPlan.monthly_expense_estimate?.toString() || ""
          }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }

      setLoading(false);
    };

    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate('/sign-in');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);

    try {
      console.log('Saving profile for user:', user.id);

      // Upsert care recipient (insert or update)
      const { data: careRecipient, error: upsertRecipientError } = await supabase
        .from('care_recipients')
        .upsert({
          user_id: user.id,
          name: formData.careRecipientName,
          age: formData.careRecipientAge ? parseInt(formData.careRecipientAge) : null,
          relationship: formData.relationship
        }, {
          onConflict: 'user_id'
        })
        .select('id')
        .single();

      if (upsertRecipientError) throw upsertRecipientError;
      console.log('Upserted care recipient:', careRecipient);

      // Upsert financial plan (insert or update)
      const { error: upsertPlanError } = await supabase
        .from('financial_plans')
        .upsert({
          user_id: user.id,
          care_recipient_id: careRecipient.id,
          monthly_income: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : 0,
          emergency_fund_target: formData.emergencyFundTarget ? parseFloat(formData.emergencyFundTarget) : null,
          monthly_expense_estimate: formData.monthlyExpenseEstimate ? parseFloat(formData.monthlyExpenseEstimate) : null
        }, {
          onConflict: 'user_id'
        });

      if (upsertPlanError) throw upsertPlanError;
      console.log('Upserted financial plan');

      toast({
        title: "Profile Updated!",
        description: "Your information has been successfully saved.",
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(error.message || 'An error occurred while saving your information.');
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-600">FinSage</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Update your care recipient information and financial details</p>
          </div>

          <div className="space-y-6">
            {/* Care Recipient Information */}
            <Card>
              <CardHeader>
                <CardTitle>Care Recipient Information</CardTitle>
                <CardDescription>Update details about the person you're caring for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="careRecipientName">Care Recipient's Name</Label>
                  <Input
                    id="careRecipientName"
                    value={formData.careRecipientName}
                    onChange={(e) => handleInputChange("careRecipientName", e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="careRecipientAge">Age</Label>
                  <Input
                    id="careRecipientAge"
                    type="number"
                    value={formData.careRecipientAge}
                    onChange={(e) => handleInputChange("careRecipientAge", e.target.value)}
                    placeholder="Enter age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Your Relationship</Label>
                  <Input
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => handleInputChange("relationship", e.target.value)}
                    placeholder="e.g., Son, Daughter, Spouse, etc."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>Update your budget and financial planning details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Monthly Income ($)</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    step="0.01"
                    value={formData.monthlyIncome}
                    onChange={(e) => handleInputChange("monthlyIncome", e.target.value)}
                    placeholder="e.g., 5000"
                  />
                  <p className="text-sm text-gray-500">This is used as your total monthly budget</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyFundTarget">Emergency Fund Target ($)</Label>
                  <Input
                    id="emergencyFundTarget"
                    type="number"
                    step="0.01"
                    value={formData.emergencyFundTarget}
                    onChange={(e) => handleInputChange("emergencyFundTarget", e.target.value)}
                    placeholder="e.g., 10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenseEstimate">Monthly Care Expense Estimate ($)</Label>
                  <Input
                    id="monthlyExpenseEstimate"
                    type="number"
                    step="0.01"
                    value={formData.monthlyExpenseEstimate}
                    onChange={(e) => handleInputChange("monthlyExpenseEstimate", e.target.value)}
                    placeholder="e.g., 3000"
                  />
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
