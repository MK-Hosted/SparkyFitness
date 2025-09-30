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

export const searchExercises = async (query: string, equipmentFilter: string[] = [], muscleGroupFilter: string[] = []): Promise<Exercise[]> => {
  let url = `/exercises?searchTerm=${encodeURIComponent(query)}`;
  if (equipmentFilter.length > 0) {
    url += `&equipmentFilter=${equipmentFilter.join(',')}`;
  }
  if (muscleGroupFilter.length > 0) {
    url += `&muscleGroupFilter=${muscleGroupFilter.join(',')}`;
  }
  return apiCall(url, {
    method: 'GET',
  });
};

export const searchExternalExercises = async (query: string, providerId: string, providerType: string, equipmentFilter: string[] = [], muscleGroupFilter: string[] = [], limit?: number): Promise<Exercise[]> => {
  const params: Record<string, any> = {
    query: query,
    providerId: providerId,
    providerType: providerType,
  };

  params.equipmentFilter = equipmentFilter.join(',');
  params.muscleGroupFilter = muscleGroupFilter.join(',');
  if (limit !== undefined) {
    params.limit = limit;
  }

  return apiCall('/exercises/search-external', {
    method: 'GET',
    params: params,
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