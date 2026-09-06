
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { careRecipientSchema, financialPlanSchema } from "@/lib/validation";
import { sanitizeText, sanitizeAmount, getSafeErrorMessage } from "@/lib/security";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    // Validate care recipient data
    const careRecipientData = {
      name: formData.careRecipientName,
      age: formData.careRecipientAge ? parseInt(formData.careRecipientAge) : undefined,
      relationship: formData.relationship
    };
    
    const careRecipientValidation = careRecipientSchema.safeParse(careRecipientData);
    if (!careRecipientValidation.success) {
      errors.push(...careRecipientValidation.error.errors.map(err => err.message));
    }
    
    // Validate financial plan data
    const financialData = {
      monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : 0,
      emergencyFundTarget: formData.emergencyFundTarget ? parseFloat(formData.emergencyFundTarget) : undefined,
      monthlyExpenseEstimate: formData.monthlyExpenseEstimate ? parseFloat(formData.monthlyExpenseEstimate) : undefined
    };
    
    const financialValidation = financialPlanSchema.safeParse(financialData);
    if (!financialValidation.success) {
      errors.push(...financialValidation.error.errors.map(err => err.message));
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors below before saving.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    setValidationErrors([]);

    try {
      console.log('Saving profile for user:', user.id);

      // Sanitize all inputs before saving
      const sanitizedCareRecipient = {
        user_id: user.id,
        name: sanitizeText(formData.careRecipientName),
        age: formData.careRecipientAge ? parseInt(formData.careRecipientAge) : null,
        relationship: sanitizeText(formData.relationship)
      };

      const { data: careRecipient, error: upsertRecipientError } = await supabase
        .from('care_recipients')
        .upsert(sanitizedCareRecipient, { onConflict: 'user_id' })
        .select('id')
        .single();

      if (upsertRecipientError) throw upsertRecipientError;
      console.log('Upserted care recipient:', careRecipient);

      const sanitizedFinancialPlan = {
        user_id: user.id,
        care_recipient_id: careRecipient.id,
        monthly_income: sanitizeAmount(parseFloat(formData.monthlyIncome) || 0),
        emergency_fund_target: formData.emergencyFundTarget ? sanitizeAmount(parseFloat(formData.emergencyFundTarget)) : null,
        monthly_expense_estimate: formData.monthlyExpenseEstimate ? sanitizeAmount(parseFloat(formData.monthlyExpenseEstimate)) : null
      };

      const { error: upsertPlanError } = await supabase
        .from('financial_plans')
        .upsert(sanitizedFinancialPlan, { onConflict: 'user_id' });

      if (upsertPlanError) throw upsertPlanError;
      console.log('Upserted financial plan');

      toast({
        title: "Profile updated",
        description: "Your information has been successfully saved.",
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const safeError = getSafeErrorMessage(error);
      setValidationErrors([safeError]);
      toast({
        title: "Error",
        description: safeError,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[2px] bg-primary" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Drify</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="max-w-2xl">
          <div className="mb-8 border-b border-border pb-4">
            <h1 className="text-[22px] font-semibold leading-tight">Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Details about the person you care for and the numbers behind their budget.
            </p>
          </div>

          <div className="space-y-8">
            <section className="border-t border-border pt-4">
              <h2 className="text-sm font-semibold">Care recipient</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="careRecipientName">Name *</Label>
                  <Input
                    id="careRecipientName"
                    value={formData.careRecipientName}
                    onChange={(e) => handleInputChange("careRecipientName", e.target.value)}
                    placeholder="Full name"
                    maxLength={100}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="careRecipientAge">Age</Label>
                    <Input
                      id="careRecipientAge"
                      type="number"
                      value={formData.careRecipientAge}
                      onChange={(e) => handleInputChange("careRecipientAge", e.target.value)}
                      placeholder="e.g. 78"
                      min="0"
                      max="150"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="relationship">Your relationship</Label>
                    <Input
                      id="relationship"
                      value={formData.relationship}
                      onChange={(e) => handleInputChange("relationship", e.target.value)}
                      placeholder="e.g. daughter"
                      maxLength={50}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-4">
              <h2 className="text-sm font-semibold">Money</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyIncome">Monthly income ($) *</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    step="0.01"
                    value={formData.monthlyIncome}
                    onChange={(e) => handleInputChange("monthlyIncome", e.target.value)}
                    placeholder="e.g. 5000"
                    min="0"
                    max="1000000"
                  />
                  <p className="text-[13px] text-muted-foreground">Used as your total monthly budget.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyFundTarget">Emergency fund target ($)</Label>
                    <Input
                      id="emergencyFundTarget"
                      type="number"
                      step="0.01"
                      value={formData.emergencyFundTarget}
                      onChange={(e) => handleInputChange("emergencyFundTarget", e.target.value)}
                      placeholder="e.g. 10000"
                      min="0"
                      max="10000000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="monthlyExpenseEstimate">Monthly care estimate ($)</Label>
                    <Input
                      id="monthlyExpenseEstimate"
                      type="number"
                      step="0.01"
                      value={formData.monthlyExpenseEstimate}
                      onChange={(e) => handleInputChange("monthlyExpenseEstimate", e.target.value)}
                      placeholder="e.g. 3000"
                      min="0"
                      max="1000000"
                    />
                  </div>
                </div>
              </div>
            </section>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-inside list-disc space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end border-t border-border pt-4">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Profile;
