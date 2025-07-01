
import { z } from "zod";

// Care Recipient Validation
export const careRecipientSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Name contains invalid characters"),
  age: z.number()
    .int("Age must be a whole number")
    .min(0, "Age must be positive")
    .max(150, "Please enter a valid age")
    .optional(),
  relationship: z.string()
    .max(50, "Relationship must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-]+$/, "Relationship contains invalid characters")
    .optional()
});

// Financial Plan Validation
export const financialPlanSchema = z.object({
  monthlyIncome: z.number()
    .min(0, "Monthly income must be positive")
    .max(1000000, "Please enter a reasonable income amount"),
  emergencyFundTarget: z.number()
    .min(0, "Emergency fund target must be positive")
    .max(10000000, "Please enter a reasonable target amount")
    .optional(),
  monthlyExpenseEstimate: z.number()
    .min(0, "Monthly expense estimate must be positive")
    .max(1000000, "Please enter a reasonable expense amount")
    .optional()
});

// Budget Category Validation
export const budgetCategorySchema = z.object({
  name: z.string()
    .min(1, "Category name is required")
    .max(50, "Category name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-&]+$/, "Category name contains invalid characters"),
  monthlyBudget: z.number()
    .min(0, "Budget must be positive")
    .max(100000, "Please enter a reasonable budget amount"),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional()
});

// Expense Validation
export const expenseSchema = z.object({
  description: z.string()
    .min(1, "Description is required")
    .max(200, "Description must be less than 200 characters"),
  amount: z.number()
    .min(0.01, "Amount must be greater than 0")
    .max(100000, "Please enter a reasonable amount"),
  expenseDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
});

// Chat Message Validation
export const chatMessageSchema = z.object({
  content: z.string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be less than 2000 characters")
});

// Generic form validation helper
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(err => err.message) 
      };
    }
    return { success: false, errors: ["Validation failed"] };
  }
};
