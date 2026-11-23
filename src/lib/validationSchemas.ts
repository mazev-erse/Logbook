import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address (e.g. name@domain.com)'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password cannot exceed 72 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s'.-]+$/, 'Name contains invalid special characters'),
  bio: z
    .string()
    .max(160, 'Bio cannot exceed 160 characters')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Profile Picture File Validation (used before upload to Supabase storage)
export const avatarFileSchema = z
  .instanceof(File)
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Only JPEG, PNG, and WebP images are allowed'
  )
  .refine(
    (file) => file.size <= 8 * 1024 * 1024,
    'Image size must be 8MB or less'
  );

// ============================================================================
// DIET & FOOD LOGGING SCHEMAS
// ============================================================================

export const foodLogSchema = z.object({
  food_name: z
    .string()
    .trim()
    .min(1, 'Food name cannot be empty')
    .max(80, 'Food name cannot exceed 80 characters'),
  meal_type: z
    .string()
    .trim()
    .min(1, 'Meal category is required')
    .max(60, 'Meal category cannot exceed 60 characters'),
  category_id: z.string().optional().nullable(),
  calories: z
    .number()
    .min(0, 'Calories cannot be negative')
    .max(10000, 'Calories cannot exceed 10,000 kcal'),
  protein: z
    .number()
    .min(0, 'Protein cannot be negative')
    .max(1000, 'Protein cannot exceed 1,000g'),
  carbs: z
    .number()
    .min(0, 'Carbs cannot be negative')
    .max(1000, 'Carbs cannot exceed 1,000g'),
  fats: z
    .number()
    .min(0, 'Fats cannot be negative')
    .max(1000, 'Fats cannot exceed 1,000g'),
});

export type FoodLogFormData = z.infer<typeof foodLogSchema>;

export const mealCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(40, 'Category name cannot exceed 40 characters'),
  icon: z.string().optional().default('Utensils'),
  sequence_order: z.number().int().min(1).default(1),
});

export type MealCategoryFormData = z.infer<typeof mealCategorySchema>;

// ============================================================================
// SUPPLEMENT LOGGING SCHEMA
// ============================================================================

export const supplementSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Supplement name cannot be empty')
    .max(60, 'Supplement name cannot exceed 60 characters'),
  dosage: z
    .string()
    .trim()
    .min(1, 'Dosage cannot be empty (e.g., 5g, 1 scoop)')
    .max(40, 'Dosage cannot exceed 40 characters'),
});

export type SupplementFormData = z.infer<typeof supplementSchema>;

// ============================================================================
// WORKOUT SET & METRIC SCHEMAS (Enforcing positive numbers)
// ============================================================================

export const workoutSetSchema = z.object({
  weight: z
    .number()
    .min(0, 'Weight cannot be negative')
    .max(1000, 'Weight cannot exceed 1,000 kg'),
  reps: z
    .number()
    .int('Reps must be a whole number')
    .min(1, 'Reps must be at least 1')
    .max(500, 'Reps cannot exceed 500'),
  rpe: z
    .number()
    .min(1, 'RPE minimum is 1')
    .max(10, 'RPE maximum is 10')
    .nullable()
    .optional(),
});

export type WorkoutSetFormData = z.infer<typeof workoutSetSchema>;

// ============================================================================
// FITNESS GOAL & BMR / TDEE SCHEMAS
// ============================================================================

export const fitnessGoalSchema = z.object({
  goal_type: z.enum(['Bulking', 'Cutting', 'Maintaining']),
  target_weight: z
    .number()
    .min(20, 'Target weight must be at least 20 kg')
    .max(350, 'Target weight cannot exceed 350 kg'),
  target_date: z
    .string()
    .min(1, 'Target date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format'),
  age: z
    .number()
    .int('Age must be an integer')
    .min(10, 'Age must be at least 10 years')
    .max(120, 'Age cannot exceed 120 years'),
  biological_sex: z.enum(['male', 'female']),
  height: z
    .number()
    .min(80, 'Height must be at least 80 cm')
    .max(260, 'Height cannot exceed 260 cm'),
  activity_level: z
    .number()
    .min(1.0, 'Activity level minimum is 1.0')
    .max(2.5, 'Activity level maximum is 2.5'),
  bmr: z.number().min(500).max(6000),
  tdee: z.number().min(500).max(10000),
  daily_calorie_goal: z
    .number()
    .min(800, 'Daily calories cannot be below 800 kcal')
    .max(10000, 'Daily calories cannot exceed 10,000 kcal'),
  protein_goal: z
    .number()
    .min(10, 'Protein target must be at least 10g')
    .max(600, 'Protein target cannot exceed 600g'),
  carbs_goal: z
    .number()
    .min(0, 'Carbs target cannot be negative')
    .max(1200, 'Carbs target cannot exceed 1,200g'),
  fats_goal: z
    .number()
    .min(5, 'Fats target must be at least 5g')
    .max(400, 'Fats target cannot exceed 400g'),
});

export type FitnessGoalFormData = z.infer<typeof fitnessGoalSchema>;

