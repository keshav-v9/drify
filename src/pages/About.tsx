
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              About the <span className="text-blue-600">Creator</span>
            </h1>
            <p className="text-xl text-gray-600">
              Meet the person behind FinSage
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">My Story</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  [Your personal story about why you created FinSage - e.g., your experience with caregiving, 
                  financial planning challenges you faced, what motivated you to build this solution]
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Background</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  [Your professional background - e.g., experience in finance, technology, healthcare, 
                  or other relevant fields that inform your approach to this problem]
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  [Your mission statement - what you hope to achieve with FinSage, 
                  how you want to help caregivers and families]
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  [Your vision for the future - where you see FinSage going, 
                  how you envision improving financial management for caregivers]
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center space-x-4">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="px-8 py-3"
            >
              Back to Home
            </Button>
            <Button 
              onClick={() => navigate('/sign-in')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
