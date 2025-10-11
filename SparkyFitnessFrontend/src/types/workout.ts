export interface PresetExercise {
  id?: string; // Make id optional as it might not exist when creating a new entry
  exercise_id: string;
  sets: number;
  reps: number;
  weight: number;
  duration?: number; // Duration in minutes (optional)
  notes?: string; // (optional)
  image_url?: string;
  exercise_name: string;
}

export interface ExerciseInPreset {
  id?: string;
  exercise_id: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number; // Duration in minutes (optional)
  notes?: string; // (optional)
  image_url?: string;
  exercise_name?: string; // Populated from backend join
}

export interface WorkoutPresetExercise extends ExerciseInPreset {
  exercise: any; // Full exercise object
}

export interface WorkoutPreset {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
  exercises?: PresetExercise[]; // Changed to PresetExercise[]
}

export interface WorkoutPlanAssignment extends Partial<ExerciseInPreset> {
  id?: string;
  template_id: string;
  day_of_week: number;
  workout_preset_id?: string;
  workout_preset_name?: string; // Populated from backend join
  exercise_id?: string;
  exercise_name?: string; // Populated from backend join
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutPlanTemplate {
  id: string;
  user_id: string;
  plan_name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  assignments?: WorkoutPlanAssignment[];
}