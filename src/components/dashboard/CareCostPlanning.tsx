
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
    if (months >= 6) return "Well covered";
    if (months >= 3) return "Building up";
    return "Needs attention";
  };

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-semibold leading-tight">Care cost planning</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          What each level of care would cost per month, and how long your reserve would last.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-b border-border pb-4 sm:grid-cols-3">
        <div>
          <p className="field-label">Emergency fund</p>
          <p className="stat-number mt-1">
            ${financialPlan?.current_emergency_fund?.toLocaleString() || '0'}
          </p>
        </div>
        <div>
          <p className="field-label">Target</p>
          <p className="stat-number mt-1">
            ${financialPlan?.emergency_fund_target?.toLocaleString() || '0'}
          </p>
        </div>
        <div>
          <p className="field-label">Monthly estimate</p>
          <p className="stat-number mt-1">
            ${financialPlan?.monthly_expense_estimate?.toLocaleString() || '0'}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border">
        {careLevels.map((level, index) => {
          const monthlyCost = calculateCostProjection(level.multiplier);
          const coverageMonths = calculateEmergencyFundCoverage(monthlyCost);
          const status = getReadinessStatus(coverageMonths);

          return (
            <div key={level.id} className="grid gap-3 py-4 sm:grid-cols-12 sm:gap-6">
              <div className="sm:col-span-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{level.level_name}</h3>
                  {index === 0 && <span className="field-label">Current</span>}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {level.description}
                </p>
                <ul className="mt-2 space-y-0.5">
                  {level.services.map((service, i) => (
                    <li key={i} className="text-[13px] text-muted-foreground">
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="sm:col-span-3">
                <p className="field-label">Monthly cost</p>
                <p className="mt-1 text-sm tabular-nums">${monthlyCost.toLocaleString()}</p>
              </div>

              <div className="sm:col-span-5">
                <div className="flex items-baseline justify-between">
                  <span className="field-label">Reserve coverage</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {coverageMonths.toFixed(1)} of 6 months · {status}
                  </span>
                </div>
                <Progress value={Math.min((coverageMonths / 6) * 100, 100)} className="mt-2 h-1" />
                {coverageMonths < 6 && (
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    ${(monthlyCost * 6).toLocaleString()} would give six months at this level.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


export default CareCostPlanning;
