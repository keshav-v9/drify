
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests: number = 20, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const key = `${identifier}_${Math.floor(now / windowMs)}`;
  
  const current = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  rateLimitMap.set(key, { ...current, count: current.count + 1 });
  return true;
};

const sanitizeMessage = (content: string): string => {
  if (!content || typeof content !== 'string') return '';
  
  return content
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 2000); // Limit message length
};

const validateMessages = (messages: any[]): boolean => {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  
  return messages.every(msg => 
    msg && 
    typeof msg === 'object' && 
    ['user', 'assistant'].includes(msg.role) &&
    typeof msg.content === 'string' &&
    msg.content.length > 0 &&
    msg.content.length <= 2000
  );
};

serve(async (req) => {
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Rate limiting
  if (!checkRateLimit(clientIP, 20, 60000)) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages, type = 'financial' } = requestBody;

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and sanitize messages
    if (!validateMessages(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid message format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sanitize message content
    const sanitizedMessages = messages.map(msg => ({
      role: msg.role,
      content: sanitizeMessage(msg.content)
    }));

    // Validate type parameter
    const allowedTypes = ['financial', 'alzheimer'];
    if (!allowedTypes.includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid assistance type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const systemPrompts = {
      financial: 'You are a helpful financial assistant for a care management app called FinSage. Help users with budgeting, expense tracking, and financial planning for care-related expenses. Be supportive and provide practical advice. Do not provide investment advice or make financial guarantees.',
      alzheimer: `You are a compassionate and knowledgeable Alzheimer's care assistant. You specialize in:
      
      1. Symptom Management: Provide guidance on managing behavioral changes, memory loss, and daily challenges
      2. Product Recommendations: Suggest helpful products like memory aids, safety devices, communication tools, and adaptive equipment
      3. Daily Care Routines: Offer structured approaches to daily activities, medication management, and creating supportive environments
      4. Emotional Support: Provide comfort and understanding for both patients and caregivers
      5. Safety Measures: Recommend home modifications and safety protocols
      6. Communication Strategies: Help with effective ways to communicate with someone who has Alzheimer's
      
      Always be empathetic, practical, and focus on dignity and quality of life. When suggesting products, be specific about their benefits and how they can help with particular challenges. Do not provide medical diagnoses or replace professional medical advice.`
    };

    const systemPrompt = systemPrompts[type as keyof typeof systemPrompts];

    console.log(`Chat request from IP: ${clientIP}, type: ${type}, messages: ${sanitizedMessages.length}`);

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
          ...sanitizedMessages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: 'Service authentication failed' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Service is currently busy. Please try again in a moment.' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from AI service');
    }

    const reply = sanitizeMessage(data.choices[0].message.content);

    console.log(`Chat response generated successfully for IP: ${clientIP}`);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-gpt function:', error);
    
    // Don't expose internal error details
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
