import { apiCall } from './api';

export interface Exercise {
  id: string;
  source?: string; // e.g., 'manual', 'wger', 'free-exercise-db'
  source_id?: string; // ID from the external source
  name: string;
  force?: string; // e.g., 'static', 'pull', 'push'
  level?: string; // e.g., 'beginner', 'intermediate', 'expert'
  mechanic?: string; // e.g., 'isolation', 'compound'
  equipment?: string[]; // Stored as JSON array of strings
  primary_muscles?: string[]; // Stored as JSON array of strings
  secondary_muscles?: string[]; // Stored as JSON array of strings
  instructions?: string[]; // Stored as JSON array of strings
  category: string; // e.g., 'strength', 'cardio'
  images?: string[]; // Stored as JSON array of URLs (local paths after download)
  calories_per_hour: number;
  description?: string;
  duration_min?: number; // Added duration_min
  user_id?: string;
  is_custom?: boolean;
  shared_with_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const searchExercises = async (query: string): Promise<Exercise[]> => {
  return apiCall(`/exercises/search/${encodeURIComponent(query)}`, {
    method: 'GET',
  });
};

export const searchExternalExercises = async (query: string, providerId: string, providerType: string, limit?: number): Promise<Exercise[]> => {
  let url = `/exercises/search-external?query=${encodeURIComponent(query)}&providerId=${encodeURIComponent(providerId)}&providerType=${encodeURIComponent(providerType)}`;
  if (limit !== undefined) {
    url += `&limit=${limit}`;
  }
  return apiCall(url, {
    method: 'GET',
  });
};

export const addExternalExerciseToUserExercises = async (wgerExerciseId: string): Promise<Exercise> => {
  return apiCall(`/exercises/add-external`, {
    method: 'POST',
    body: JSON.stringify({ wgerExerciseId }),
  });
};

export const addNutritionixExercise = async (nutritionixExerciseData: Exercise): Promise<Exercise> => {
  return apiCall(`/exercises/add-nutritionix-exercise`, {
    method: 'POST',
    body: JSON.stringify(nutritionixExerciseData),
  });
};

export const addFreeExerciseDBExercise = async (freeExerciseDBId: string): Promise<Exercise> => {
  return apiCall(`/freeexercisedb/add`, {
    method: 'POST',
    body: JSON.stringify({ exerciseId: freeExerciseDBId }),
  });
};