
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = 'financial' } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Different system prompts based on the type of assistance needed
    const systemPrompts = {
      financial: 'You are a helpful financial assistant for a care management app called FinSage. Help users with budgeting, expense tracking, and financial planning for care-related expenses. Be supportive and provide practical advice.',
      alzheimer: `You are a compassionate and knowledgeable Alzheimer's care assistant. You specialize in:
      
      1. Symptom Management: Provide guidance on managing behavioral changes, memory loss, and daily challenges
      2. Product Recommendations: Suggest helpful products like memory aids, safety devices, communication tools, and adaptive equipment
      3. Daily Care Routines: Offer structured approaches to daily activities, medication management, and creating supportive environments
      4. Emotional Support: Provide comfort and understanding for both patients and caregivers
      5. Safety Measures: Recommend home modifications and safety protocols
      6. Communication Strategies: Help with effective ways to communicate with someone who has Alzheimer's
      
      Always be empathetic, practical, and focus on dignity and quality of life. When suggesting products, be specific about their benefits and how they can help with particular challenges.`
    };

    const systemPrompt = systemPrompts[type as keyof typeof systemPrompts] || systemPrompts.financial;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-gpt function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
