
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          navigate('/dashboard');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">FinSage</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            A modern financial management and planning tool designed specifically for caregivers 
            managing finances for their care recipients.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="text-blue-600">Financial Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track emergency funds, monitor monthly expenses, and plan for the future
                  with tools designed for caregiving scenarios.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="text-blue-600">Care Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Organize and manage financial information for your care recipients
                  with a user-friendly interface.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="text-blue-600">Secure & Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your sensitive financial data is protected with enterprise-grade
                  security and authentication.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          
          <Button 
            onClick={() => navigate('/sign-in')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
