
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
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              About the <span className="text-blue-600">Creator</span>
            </h1>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-6">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-blue-700 mb-2">Keshav Varma</h2>
                <p className="text-xl text-gray-600 font-medium">
                  From Aurora, Illinois
                </p>
              </div>
              <div>
                <img 
                  src="/lovable-uploads/36ec9c01-d135-4aad-8dbc-6b53d55ada17.png" 
                  alt="Keshav Varma" 
                  className="w-48 h-48 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                />
              </div>
            </div>
            
            <p className="text-lg text-gray-600">
              The person behind FinSage
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">My Story</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  When my grandpa was diagnosed with Alzheimer's, it turned our whole world upside down. Watching someone you love start to forget the people and moments that shaped their life is heartbreaking. But beyond the emotional toll, something we did not expect was how hard it would be to manage his finances.
                  <br /><br />
                  From medical bills to everyday expenses, everything became more complicated. My family was already doing everything we could to take care of him physically and emotionally, but keeping track of money, paying bills on time, and making sure nothing slipped through the cracks was overwhelming.
                  <br /><br />
                  That is when I started thinking. What if there was a way to make this part easier? Not just for us, but for other families going through the same thing.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Background</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  I'm <span className="font-bold text-blue-700 text-lg">Keshav Varma</span>, based in <span className="font-semibold text-blue-600">Aurora, Illinois</span>. As someone who experienced firsthand the challenges of managing finances while caregiving, I understand the unique pressures families face. The intersection of emotional stress and financial complexity creates a burden that many aren't prepared for. My experience taught me that practical tools can make a real difference in reducing stress during already difficult times.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  That is how FinSage started. I wanted to build a simple tool to help caretakers stay on top of finances, track spending, get suggestions, and avoid the stress of doing it all alone. It is meant to be something practical and helpful, especially for those who are already carrying a heavy load.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  FinSage came from a very personal place, and my hope is that it can help others feel a little more supported during tough times. I envision a future where financial management doesn't add to the burden of caregiving, but instead provides clarity and peace of mind when families need it most.
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
