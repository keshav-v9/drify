
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
    emergencyFundTarget: "",
    monthlyExpenseEstimate: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate('/sign-in');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
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
      // First, create the care recipient
      const { data: careRecipient, error: careRecipientError } = await supabase
        .from('care_recipients')
        .insert({
          user_id: user.id,
          name: formData.careRecipientName,
          age: formData.careRecipientAge ? parseInt(formData.careRecipientAge) : null,
          relationship: formData.relationship
        })
        .select()
        .single();

      if (careRecipientError) throw careRecipientError;

      // Then, create the financial plan
      const { error: financialPlanError } = await supabase
        .from('financial_plans')
        .insert({
          user_id: user.id,
          care_recipient_id: careRecipient.id,
          emergency_fund_target: formData.emergencyFundTarget ? parseFloat(formData.emergencyFundTarget) : null,
          monthly_expense_estimate: formData.monthlyExpenseEstimate ? parseFloat(formData.monthlyExpenseEstimate) : null
        });

      if (financialPlanError) throw financialPlanError;

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
                {step === 3 && "Set up your financial goals and estimates"}
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
                    <Label htmlFor="monthlyExpenseEstimate">Monthly Expense Estimate ($)</Label>
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
                    disabled={saving}
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
