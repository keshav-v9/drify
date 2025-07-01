
import DOMPurify from 'dompurify';

// XSS Protection - Sanitize HTML content
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true // Keep text content
  });
};

// Sanitize text input for safe display
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potential XSS vectors
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 10000); // Limit length
};

// Sanitize financial amounts
export const sanitizeAmount = (amount: number | string): number => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || !isFinite(num)) return 0;
  
  // Round to 2 decimal places and ensure reasonable bounds
  const sanitized = Math.round(num * 100) / 100;
  return Math.max(0, Math.min(10000000, sanitized));
};

// Generate safe error messages that don't leak sensitive information
export const getSafeErrorMessage = (error: unknown): string => {
  // Don't expose internal error details to users
  if (error instanceof Error) {
    // Log the actual error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Detailed error:', error);
    }
    
    // Return generic messages for common error types
    if (error.message.includes('unique constraint')) {
      return 'This item already exists. Please try a different name.';
    }
    if (error.message.includes('foreign key')) {
      return 'Unable to complete this action due to related data.';
    }
    if (error.message.includes('not found')) {
      return 'The requested item was not found.';
    }
    if (error.message.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
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

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes
