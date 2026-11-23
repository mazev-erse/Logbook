// ============================================================================
// STRICT RELATIONAL DATABASE TYPES FOR GYM TRACKER PWA
// Maps directly to Supabase PostgreSQL schema
// ============================================================================

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'olympic'
  | 'cardio'
  | 'other';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'smith_machine'
  | 'band'
  | 'other';

export interface Exercise {
  id: string;
  user_id: string | null; // null represents default global exercise
  name: string;
  category: ExerciseCategory;
  equipment: EquipmentType;
  notes?: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  workout_id: string;
  user_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  user_id: string;
  order_index: number;
  notes?: string | null;
  created_at: string;
  // Relational joins
  exercise?: Exercise;
  sets?: WorkoutSet[];
}

export type WorkoutMood = 'beast' | 'strong' | 'solid' | 'tired' | 'crushed';

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  started_at: string;
  completed_at?: string | null;
  notes?: string | null;
  mood?: WorkoutMood | null;
  session_rpe?: number | null;
  rating?: number | null;
  created_at: string;
  // Relational joins
  workout_exercises?: WorkoutExercise[];
}

// Composite relational type returned by deep queries
export interface WorkoutWithExercises extends Workout {
  workout_exercises: (WorkoutExercise & {
    exercise: Exercise;
    sets: WorkoutSet[];
  })[];
}

// ============================================================================
// CLIENT-SIDE ACTIVE WORKOUT STATE (LOCAL-FIRST, ZERO LATENCY)
// ============================================================================

export interface ActiveSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  isCompleted: boolean;
  previousWeight?: number;
  previousReps?: number;
}

export interface ActiveExercise {
  workoutExerciseId: string;
  exercise: Exercise;
  sets: ActiveSet[];
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: string;
  exercises: ActiveExercise[];
  notes?: string | null;
  mood?: WorkoutMood | null;
  sessionRpe?: number | null;
}

// ============================================================================
// PROGRESS & RECHARTS DATA TYPES
// ============================================================================

export interface ExerciseProgressPoint {
  date: string;
  displayDate: string;
  weight: number;
  reps: number;
  volume: number; // weight * reps
  estimated1RM: number; // Epley: weight * (1 + reps / 30)
}

export interface WeeklyVolumePoint {
  day: string;
  volume: number;
  workoutCount: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxRepsAtMaxWeight: number;
  achievedAt: string;
  estimated1RM: number;
}

// ============================================================================
// USER PROFILE DATA TYPE
// ============================================================================

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  height?: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BODY METRICS DATA TYPE
// ============================================================================

export interface BodyMetric {
  id: string;
  user_id: string;
  weight: number;
  logged_at: string;
  created_at: string;
}

// ============================================================================
// DIET & MACRONUTRIENT LOG DATA TYPES
// ============================================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealCategory {
  id: string;
  user_id: string;
  name: string;
  icon?: string;
  sequence_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface DietLog {
  id: string;
  user_id: string;
  food_name: string;
  meal_type: MealType | string;
  category_id?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  logged_at: string;
  created_at: string;
}

export interface MacroSummary {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatsGoal: number;
}

// ============================================================================
// SUPPLEMENT TRACKER DATA TYPES
// ============================================================================

export interface SupplementLog {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  taken: boolean;
  logged_at: string;
  created_at: string;
}

// ============================================================================
// FITNESS GOAL TRACKER DATA TYPES
// ============================================================================

export type GoalType = 'Bulking' | 'Cutting' | 'Maintaining';
export type BiologicalSex = 'male' | 'female';

export interface FitnessGoal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  start_weight: number;
  target_weight: number;
  target_date: string;
  created_at: string;
  // Dynamic BMR & TDEE fields
  age?: number;
  biological_sex?: BiologicalSex;
  height?: number; // cm
  activity_level?: number; // multiplier e.g. 1.2, 1.375, 1.55, 1.725, 1.9
  bmr?: number;
  tdee?: number;
  // Custom Macro Targets
  daily_calorie_goal?: number;
  protein_goal?: number;
  carbs_goal?: number;
  fats_goal?: number;
}

// ============================================================================
// WORKOUT ROUTINES & TEMPLATES DATA TYPES
// ============================================================================

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  sequence_order: number;
  target_sets: number;
  target_reps: number;
  created_at?: string;
  exercise?: Exercise;
}

export interface Routine {
  id: string;
  user_id: string | null;
  name: string;
  description?: string | null;
  is_system_template: boolean;
  created_at: string;
  exercises: RoutineExercise[];
}

// ============================================================================
// SPORTS & ACTIVE RECOVERY DATA TYPES
// ============================================================================

export type ActivityType =
  | 'Cricket'
  | 'Football'
  | 'Walking'
  | 'Running'
  | 'Swimming'
  | 'Cycling'
  | 'Other';

export type ActivityIntensity = 'Low' | 'Medium' | 'High';

export interface ActiveRecoveryLog {
  id: string;
  user_id: string;
  activity_type: ActivityType | string;
  duration_minutes: number;
  intensity: ActivityIntensity;
  calories_burned: number;
  distance_km?: number | null;
  average_speed_kmh?: number | null;
  calculated_steps?: number | null;
  logged_at: string;
  created_at: string;
}

// ============================================================================
// GAMIFICATION & MILESTONE ENGINE DATA TYPES
// ============================================================================

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeCategory = 'streak' | 'strength' | 'milestone' | 'volume';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  category: BadgeCategory;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  metadata?: Record<string, any>;
  badge?: Badge;
}

export interface ExerciseRanking {
  set_id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  workout_id: string;
  workout_name: string;
  performed_at: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  performance_rank: number;
}

// ============================================================================
// SLEEP TRACKING & RECOVERY DATA TYPES
// ============================================================================

export type SleepQuality = 'Poor' | 'Fair' | 'Good' | 'Excellent';

export interface SleepLog {
  id: string;
  user_id: string;
  bedtime: string; // ISO 8601 string
  wake_time: string; // ISO 8601 string
  duration_minutes: number;
  quality: SleepQuality;
  notes?: string | null;
  created_at: string;
}

export interface UserPreferences {
  id?: string;
  user_id: string;
  target_bedtime: string; // e.g. "22:30"
  sleep_reminder_enabled: boolean;
  updated_at?: string;
  created_at?: string;
}

