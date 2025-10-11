import { apiCall } from './api';
import { getExerciseEntriesForDate as getDailyExerciseEntries } from './dailyProgressService';
import { Exercise } from './exerciseSearchService'; // Import the comprehensive Exercise interface
import { parseJsonArray } from './exerciseService'; // Import parseJsonArray
import { ExerciseProgressData } from './reportsService'; // Import ExerciseProgressData

export interface ExerciseEntry {
  id: string;
  exercise_id: string;
  duration_minutes?: number; // Make optional
  calories_burned: number;
  entry_date: string;
  notes?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  image_url?: string; // Add image_url
  exercises: Exercise; // Use the comprehensive Exercise interface
}
 
export const fetchExerciseEntries = async (selectedDate: string): Promise<ExerciseEntry[]> => {
  const response = await getDailyExerciseEntries(selectedDate);
  
  const parsedEntries = response.map((entry: ExerciseEntry) => ({
    ...entry,
    exercises: {
      ...entry.exercises,
      equipment: parseJsonArray(entry.exercises.equipment),
      primary_muscles: parseJsonArray(entry.exercises.primary_muscles),
      secondary_muscles: parseJsonArray(entry.exercises.secondary_muscles),
      instructions: parseJsonArray(entry.exercises.instructions),
      images: parseJsonArray(entry.exercises.images),
    }
  }));
 
  return parsedEntries;
};
 
export const createExerciseEntry = async (payload: {
  exercise_id: string;
  duration_minutes?: number; // Make optional
  calories_burned?: number; // Make optional as it can be calculated by backend
  entry_date: string;
  notes?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  image_url?: string; // Add image_url
}): Promise<ExerciseEntry> => {
  return apiCall('/exercise-entries', {
    method: 'POST',
    body: payload,
  });
};

export const logWorkoutPreset = async (workoutPresetId: string, entryDate: string): Promise<ExerciseEntry[]> => {
  return apiCall('/exercise-entries/from-preset', {
    method: 'POST',
    body: JSON.stringify({ workout_preset_id: workoutPresetId, entry_date: entryDate }),
  });
};

export const deleteExerciseEntry = async (entryId: string): Promise<void> => {
  return apiCall(`/exercise-entries/${entryId}`, {
    method: 'DELETE',
  });
};

export const getExerciseProgressData = async (exerciseId: string, startDate: string, endDate: string): Promise<ExerciseProgressData[]> => {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  const response = await apiCall(`/exercise-entries/progress/${exerciseId}?${params.toString()}`, {
    method: 'GET',
  });
  return response;
};

export const searchExercises = async (query: string, filterType: string): Promise<Exercise[]> => {
  if (!query.trim()) {
    return [];
  }
  const params = new URLSearchParams({ searchTerm: query, ownershipFilter: filterType });
  const data = await apiCall(`/exercises?${params.toString()}`, {
    method: 'GET',
    suppress404Toast: true, // Suppress toast for 404
  });
  return data.exercises || []; // Return empty array if 404 or no exercises found
};

export const getExerciseHistory = async (exerciseId: string, limit: number = 5): Promise<ExerciseEntry[]> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  const response = await apiCall(`/exercise-entries/history/${exerciseId}?${params.toString()}`, {
    method: 'GET',
  });
  return response;
};