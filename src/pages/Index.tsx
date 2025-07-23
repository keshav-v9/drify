
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
            <span className="text-blue-600">Drify</span>: The Leading <span className="text-blue-600">AI-Powered Financial Planning Tool</span> for Caregivers
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
            <span className="font-semibold text-blue-700">Drify</span> is the premier AI-assisted financial planning platform specifically designed for caregivers managing finances 
            and care for their loved ones, especially those with Alzheimer's disease and dementia.
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Experience revolutionary financial planning with Drify's intelligent budgeting tools, personalized care guidance, and emotional support 
            powered by cutting-edge AI technology tailored for caregiver needs.
          </p>
          
          {/* Move CTA buttons here for better visibility */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              onClick={() => navigate('/sign-in')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              Start Your AI-Assisted Care Journey
            </Button>
            <Button 
              onClick={() => navigate('/about')}
              variant="outline"
              className="px-10 py-4 text-xl border-2 border-blue-300 text-blue-700 hover:bg-blue-50 transition-all duration-300"
              size="lg"
            >
              About the Creator
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-left border-blue-200 hover:border-blue-300 transition-colors">
              <CardHeader>
                <CardTitle className="text-blue-600">Drify's AI-Powered Financial Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Drify's smart budgeting and expense tracking features use advanced AI insights tailored specifically for caregiving scenarios. 
                  Get personalized Drify recommendations for managing care-related costs, medical expenses, and long-term financial planning.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-left border-purple-200 hover:border-purple-300 transition-colors">
              <CardHeader>
                <CardTitle className="text-purple-600">Drify's Alzheimer's Care Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Drify's specialized AI chatbot provides expert guidance on Alzheimer's symptom management, product recommendations, 
                  daily care routines, and emotional support. Drify understands the unique challenges faced by Alzheimer's caregivers.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-left border-green-200 hover:border-green-300 transition-colors">
              <CardHeader>
                <CardTitle className="text-green-600">Drify's Intelligent Care Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Drify's AI-driven tools help organize financial information, track care expenses, and plan for 
                  the future with intelligent insights designed specifically for caregiver needs. Let Drify simplify your care management.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Caregivers Choose Drify</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">🧠 Alzheimer's Expertise</h4>
                <p className="text-gray-600 text-sm">AI trained specifically on Alzheimer's care challenges, providing relevant and compassionate guidance.</p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">💡 Smart Recommendations</h4>
                <p className="text-gray-600 text-sm">Get personalized product suggestions and care strategies based on your specific situation.</p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">💰 Financial Intelligence</h4>
                <p className="text-gray-600 text-sm">AI-powered budgeting that understands the unique financial challenges of caregiving.</p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">🔒 Secure & Private</h4>
                <p className="text-gray-600 text-sm">Enterprise-grade security protecting your sensitive financial and care information.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
