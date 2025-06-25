
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

const Onboarding = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
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
    const checkUserAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/sign-in');
        return;
      }

      setUser(session.user);

      // Check if user already has a care recipient (existing user)
      const { data: existingRecipient } = await supabase
        .from('care_recipients')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existingRecipient) {
        // User already has data, redirect to dashboard
        navigate('/dashboard');
        return;
      }

      setLoading(false);
    };

    checkUserAndRedirect();

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

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);

    try {
      console.log('Starting onboarding completion for user:', user.id);

      // Create new care recipient (since we know they don't have one)
      const { data: newRecipient, error: createError } = await supabase
        .from('care_recipients')
        .insert({
          user_id: user.id,
          name: formData.careRecipientName,
          age: formData.careRecipientAge ? parseInt(formData.careRecipientAge) : null,
          relationship: formData.relationship
        })
        .select('id')
        .single();

      if (createError) throw createError;
      console.log('Created new care recipient:', newRecipient.id);

      // Create new financial plan
      const { error: createPlanError } = await supabase
        .from('financial_plans')
        .insert({
          user_id: user.id,
          care_recipient_id: newRecipient.id,
          monthly_income: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
          emergency_fund_target: formData.emergencyFundTarget ? parseFloat(formData.emergencyFundTarget) : null,
          monthly_expense_estimate: formData.monthlyExpenseEstimate ? parseFloat(formData.monthlyExpenseEstimate) : null
        });

      if (createPlanError) throw createPlanError;
      console.log('Created new financial plan');

      toast({
        title: "Setup Complete!",
        description: "Your care recipient information and financial plan have been saved.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving onboarding data:', error);
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

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to FinSage</h1>
            <p className="text-gray-600">Let's set up your account to get started</p>
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">Step {step} of 3</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 && "Care Recipient Information"}
                {step === 2 && "Relationship Details"}
                {step === 3 && "Financial Planning"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Tell us about the person you're caring for"}
                {step === 2 && "How are you related to your care recipient?"}
                {step === 3 && "Set up your monthly budget and financial goals"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="careRecipientName">Care Recipient's Name</Label>
                    <Input
                      id="careRecipientName"
                      value={formData.careRecipientName}
                      onChange={(e) => handleInputChange("careRecipientName", e.target.value)}
                      placeholder="Enter full name"
                      required
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
                </>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <Label htmlFor="relationship">Your Relationship</Label>
                  <Input
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => handleInputChange("relationship", e.target.value)}
                    placeholder="e.g., Son, Daughter, Spouse, etc."
                  />
                </div>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyIncome">Monthly Income ($)</Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      step="0.01"
                      value={formData.monthlyIncome}
                      onChange={(e) => handleInputChange("monthlyIncome", e.target.value)}
                      placeholder="e.g., 5000"
                      required
                    />
                    <p className="text-sm text-gray-500">This will be used as your total monthly budget</p>
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
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={step === 1}
                >
                  Back
                </Button>
                
                {step < 3 ? (
                  <Button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={step === 1 && !formData.careRecipientName}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={saving || !formData.monthlyIncome}
                  >
                    {saving ? "Saving..." : "Complete Setup"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
