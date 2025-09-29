import { apiCall } from './api';
import { getExerciseEntriesForDate as getDailyExerciseEntries } from './dailyProgressService';
import { Exercise } from './exerciseSearchService'; // Import the comprehensive Exercise interface
import { parseJsonArray } from './exerciseService'; // Import parseJsonArray

export interface ExerciseEntry {
  id: string;
  exercise_id: string;
  duration_minutes: number;
  calories_burned: number;
  entry_date: string;
  notes?: string;
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

export const addExerciseEntry = async (payload: {
  exercise_id: string;
  duration_minutes: number;
  calories_burned: number;
  entry_date: string;
  notes?: string;
}): Promise<ExerciseEntry> => {
  return apiCall('/exercise-entries', {
    method: 'POST',
    body: payload,
  });
};

export const deleteExerciseEntry = async (entryId: string): Promise<void> => {
  return apiCall(`/exercise-entries/${entryId}`, {
    method: 'DELETE',
  });
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