
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Shield, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface CareCostPlanningProps {
  user: User | null;
}

interface CareLevel {
  id: string;
  level_name: string;
  multiplier: number;
  description: string;
  services: string[];
}

interface FinancialPlan {
  emergency_fund_target: number;
  current_emergency_fund: number;
  monthly_expense_estimate: number;
}

const CareCostPlanning = ({ user }: CareCostPlanningProps) => {
  const [careLevels, setCareLevels] = useState<CareLevel[]>([]);
  const [financialPlan, setFinancialPlan] = useState<FinancialPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch care levels
      const { data: careLevelData, error: careLevelError } = await supabase
        .from('care_levels')
        .select('*')
        .order('multiplier', { ascending: true });

      if (careLevelError) throw careLevelError;

      // Fetch financial plan
      const { data: planData, error: planError } = await supabase
        .from('financial_plans')
        .select('*')
        .single();

      if (planError && planError.code !== 'PGRST116') throw planError;

      // Create default care levels if none exist
      if (!careLevelData || careLevelData.length === 0) {
        await createDefaultCareLevels();
      } else {
        setCareLevels(careLevelData);
      }

      setFinancialPlan(planData);
    } catch (error) {
      console.error('Error fetching care cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCareLevels = async () => {
    const defaultLevels = [
      {
        level_name: 'Current Care',
        multiplier: 1.0,
        description: 'Based on your current budget and care needs',
        services: ['Basic daily assistance', 'Medication management', 'Regular check-ins'],
        user_id: user?.id
      },
      {
        level_name: 'Enhanced Care',
        multiplier: 1.5,
        description: 'Increased services and professional care support',
        services: ['Professional aide visits', 'Meal preparation', 'Transportation services', 'Medical coordination'],
        user_id: user?.id
      },
      {
        level_name: '24/7 Care',
        multiplier: 2.5,
        description: 'Round-the-clock professional care and medical support',
        services: ['24/7 professional care', 'Medical monitoring', 'Emergency response', 'Specialized Alzheimer\'s care'],
        user_id: user?.id
      }
    ];

    try {
      const { data, error } = await supabase
        .from('care_levels')
        .insert(defaultLevels)
        .select();

      if (error) throw error;
      setCareLevels(data || []);
    } catch (error) {
      console.error('Error creating default care levels:', error);
    }
  };

  const calculateCostProjection = (multiplier: number) => {
    const baseAmount = financialPlan?.monthly_expense_estimate || 3000;
    return baseAmount * multiplier;
  };

  const calculateEmergencyFundCoverage = (monthlyCost: number) => {
    const emergencyFund = financialPlan?.current_emergency_fund || 0;
    return emergencyFund > 0 ? emergencyFund / monthlyCost : 0;
  };

  const getReadinessStatus = (months: number) => {
    if (months >= 6) return { text: "Well Prepared", color: "bg-success", icon: CheckCircle };
    if (months >= 3) return { text: "Building Up", color: "bg-warning", icon: Clock };
    return { text: "Needs Attention", color: "bg-destructive", icon: AlertTriangle };
  };

  if (loading) {
    return <div className="text-center py-8">Loading care cost projections...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Care Cost Planning</h2>
        <p className="text-muted-foreground">Plan for different levels of care and assess financial readiness</p>
      </div>

      {/* Emergency Fund Overview */}
      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <span>Emergency Fund Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-primary-foreground/80">Current Fund</p>
              <p className="stat-number">
                ${financialPlan?.current_emergency_fund?.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/80">Target Fund</p>
              <p className="stat-number">
                ${financialPlan?.emergency_fund_target?.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-primary-foreground/80">Monthly Estimate</p>
              <p className="stat-number">
                ${financialPlan?.monthly_expense_estimate?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Care Level Projections */}
      <div className="grid gap-6">
        {careLevels.map((level, index) => {
          const monthlyCost = calculateCostProjection(level.multiplier);
          const coverageMonths = calculateEmergencyFundCoverage(monthlyCost);
          const status = getReadinessStatus(coverageMonths);
          const StatusIcon = status.icon;

          return (
            <Card key={level.id} className={index === 0 ? 'ring-2 ring-blue-200' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{level.level_name}</span>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">{level.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-semibold tracking-[-0.02em]">
                      ${monthlyCost.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Financial Readiness */}
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Financial Readiness</p>
                        <p className="text-sm text-muted-foreground">
                          {coverageMonths.toFixed(1)} months of coverage
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      coverageMonths >= 6 ? 'default' : 
                      coverageMonths >= 3 ? 'secondary' : 'destructive'
                    }>
                      {status.text}
                    </Badge>
                  </div>

                  {/* Coverage Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Emergency Fund Coverage</span>
                      <span>{Math.min((coverageMonths / 6) * 100, 100).toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={Math.min((coverageMonths / 6) * 100, 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 6+ months of coverage
                    </p>
                  </div>

                  {/* Services Included */}
                  <div>
                    <p className="font-medium mb-2">Services Included:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {level.services.map((service, serviceIndex) => (
                        <div key={serviceIndex} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-sm">{service}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {coverageMonths < 6 && (
                    <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                        <div>
                          <p className="font-medium text-warning">Recommendation</p>
                          <p className="text-sm text-warning">
                            Consider building your emergency fund to ${(monthlyCost * 6).toLocaleString()} 
                            for 6 months of coverage at this care level.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Recommendations */}
      <Card className="border-2 border-border bg-secondary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>AI Financial Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p className="text-muted-foreground">
                Based on current trends, consider gradually increasing your emergency fund 
                by $500-1000 per month to improve care readiness.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p className="text-muted-foreground">
                Review and update your care cost estimates every 6 months as needs change.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <p className="text-muted-foreground">
                Consider setting up automatic transfers to build your emergency fund consistently.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CareCostPlanning;
