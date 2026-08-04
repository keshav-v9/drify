
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
import { careRecipientSchema, financialPlanSchema } from "@/lib/validation";
import { sanitizeText, sanitizeAmount, getSafeErrorMessage } from "@/lib/security";

const Onboarding = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
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
    let sanitizedValue = value;
    
    // Sanitize based on field type
    if (field === 'careRecipientName' || field === 'relationship') {
      sanitizedValue = sanitizeText(value);
    } else if (field.includes('Age') && value) {
      const num = parseInt(value);
      sanitizedValue = isNaN(num) ? '' : Math.max(0, Math.min(150, num)).toString();
    } else if (field.includes('Income') || field.includes('Fund') || field.includes('Expense')) {
      if (value) {
        const num = parseFloat(value);
        sanitizedValue = isNaN(num) ? '' : sanitizeAmount(num).toString();
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const validateCurrentStep = (): boolean => {
    const errors: string[] = [];
    
    if (step === 1) {
      if (!formData.careRecipientName.trim()) {
        errors.push("Care recipient's name is required");
      } else {
        const careRecipientData = {
          name: formData.careRecipientName,
          age: formData.careRecipientAge ? parseInt(formData.careRecipientAge) : undefined,
          relationship: formData.relationship
        };
        
        const validation = careRecipientSchema.safeParse(careRecipientData);
        if (!validation.success) {
          errors.push(...validation.error.errors.map(err => err.message));
        }
      }
    } else if (step === 3) {
      if (!formData.monthlyIncome) {
        errors.push("Monthly income is required");
      } else {
        const financialData = {
          monthlyIncome: parseFloat(formData.monthlyIncome),
          emergencyFundTarget: formData.emergencyFundTarget ? parseFloat(formData.emergencyFundTarget) : undefined,
          monthlyExpenseEstimate: formData.monthlyExpenseEstimate ? parseFloat(formData.monthlyExpenseEstimate) : undefined
        };
        
        const validation = financialPlanSchema.safeParse(financialData);
        if (!validation.success) {
          errors.push(...validation.error.errors.map(err => err.message));
        }
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
      setValidationErrors([]);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setValidationErrors([]);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    if (!validateCurrentStep()) {
      return;
    }
    
    setSaving(true);
    setValidationErrors([]);

    try {
      console.log('Starting onboarding completion for user:', user.id);

      // Sanitize all inputs before saving
      const sanitizedCareRecipient = {
        user_id: user.id,
        name: sanitizeText(formData.careRecipientName),
        age: formData.careRecipientAge ? parseInt(formData.careRecipientAge) : null,
        relationship: sanitizeText(formData.relationship)
      };

      const { data: newRecipient, error: createError } = await supabase
        .from('care_recipients')
        .insert(sanitizedCareRecipient)
        .select('id')
        .single();

      if (createError) throw createError;
      console.log('Created new care recipient:', newRecipient.id);

      const sanitizedFinancialPlan = {
        user_id: user.id,
        care_recipient_id: newRecipient.id,
        monthly_income: sanitizeAmount(parseFloat(formData.monthlyIncome)),
        emergency_fund_target: formData.emergencyFundTarget ? sanitizeAmount(parseFloat(formData.emergencyFundTarget)) : null,
        monthly_expense_estimate: formData.monthlyExpenseEstimate ? sanitizeAmount(parseFloat(formData.monthlyExpenseEstimate)) : null
      };

      const { error: createPlanError } = await supabase
        .from('financial_plans')
        .insert(sanitizedFinancialPlan);

      if (createPlanError) throw createPlanError;
      console.log('Created new financial plan');

      toast({
        title: "Setup Complete!",
        description: "Your care recipient information and financial plan have been saved.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving onboarding data:', error);
      const safeError = getSafeErrorMessage(error);
      setValidationErrors([safeError]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-6">
          <span className="h-3 w-3 rounded-[2px] bg-primary" />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Drify</span>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="max-w-2xl">
          <div className="mb-8">
            <p className="field-label">Step {step} of 3</p>
            <h1 className="mt-2 text-[22px] font-semibold leading-tight">Set up your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Three short steps. You can change any of it later.</p>
            <Progress value={progress} className="mt-4 h-1" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 && "Care recipient"}
                {step === 2 && "Relationship"}
                {step === 3 && "Budget basics"}
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
                    <Label htmlFor="careRecipientName">Care recipient's name *</Label>
                    <Input
                      id="careRecipientName"
                      value={formData.careRecipientName}
                      onChange={(e) => handleInputChange("careRecipientName", e.target.value)}
                      placeholder="Enter full name"
                      required
                      maxLength={100}
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
                      min="0"
                      max="150"
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <Label htmlFor="relationship">Your relationship</Label>
                  <Input
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => handleInputChange("relationship", e.target.value)}
                    placeholder="e.g., Son, Daughter, Spouse, etc."
                    maxLength={50}
                  />
                </div>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyIncome">Monthly income ($) *</Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      step="0.01"
                      value={formData.monthlyIncome}
                      onChange={(e) => handleInputChange("monthlyIncome", e.target.value)}
                      placeholder="e.g., 5000"
                      required
                      min="0"
                      max="1000000"
                    />
                    <p className="text-sm text-muted-foreground">This will be used as your total monthly budget</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyFundTarget">Emergency fund target ($)</Label>
                    <Input
                      id="emergencyFundTarget"
                      type="number"
                      step="0.01"
                      value={formData.emergencyFundTarget}
                      onChange={(e) => handleInputChange("emergencyFundTarget", e.target.value)}
                      placeholder="e.g., 10000"
                      min="0"
                      max="10000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyExpenseEstimate">Monthly care expense estimate ($)</Label>
                    <Input
                      id="monthlyExpenseEstimate"
                      type="number"
                      step="0.01"
                      value={formData.monthlyExpenseEstimate}
                      onChange={(e) => handleInputChange("monthlyExpenseEstimate", e.target.value)}
                      placeholder="e.g., 3000"
                      min="0"
                      max="1000000"
                    />
                  </div>
                </>
              )}

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
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
                    className="bg-primary hover:bg-primary"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    className="bg-primary hover:bg-primary"
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
