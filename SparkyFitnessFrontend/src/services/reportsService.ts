import { apiCall } from './api';
import { Exercise } from './exerciseSearchService'; // Import Exercise interface

export interface NutritionData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturated_fat: number;
  polyunsaturated_fat: number;
  monounsaturated_fat: number;
  trans_fat: number;
  cholesterol: number;
  sodium: number;
  potassium: number;
  dietary_fiber: number;
  sugars: number;
  vitamin_a: number;
  vitamin_c: number;
  calcium: number;
  iron: number;
}

export interface MeasurementData {
  entry_date: string;
  weight?: number;
  neck?: number;
  waist?: number;
  hips?: number;
  steps?: number;
}

export interface DailyFoodEntry {
  entry_date: string;
  meal_type: string;
  quantity: number;
  unit: string;
  foods: {
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    saturated_fat?: number;
    polyunsaturated_fat?: number;
    monounsaturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    dietary_fiber?: number;
    sugars?: number;
    vitamin_a?: number;
    vitamin_c?: number;
    calcium?: number;
    iron?: number;
    serving_size: number;
  };
  food_variants?: {
    id: string;
    serving_size: number;
    serving_unit: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    saturated_fat?: number;
    polyunsaturated_fat?: number;
    monounsaturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    dietary_fiber?: number;
    sugars?: number;
    vitamin_a?: number;
    vitamin_c?: number;
    calcium?: number;
    iron?: number;
  };
}

export interface DailyExerciseEntry {
  id: string;
  entry_date: string;
  duration_minutes: number;
  calories_burned: number;
  notes?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  exercises: Exercise; // Use the comprehensive Exercise interface
}

export interface ExerciseProgressData {
  entry_date: string;
  sets?: number;
  reps?: number;
  weight?: number;
  calories_burned: number;
  duration_minutes: number;
}

export interface CustomCategory {
  id: string;
  name: string;
  measurement_type: string;
  frequency: string;
}

export interface CustomMeasurementData {
  category_id: string;
  entry_date: string;
  hour?: number;
  value: number;
  timestamp: string;
}

export const loadReportsData = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  nutritionData: NutritionData[];
  tabularData: DailyFoodEntry[];
  exerciseEntries: DailyExerciseEntry[];
  measurementData: MeasurementData[];
  customCategories: CustomCategory[];
  customMeasurementsData: Record<string, CustomMeasurementData[]>;
}> => {
  const params = new URLSearchParams({
    userId,
    startDate,
    endDate,
  });
  const response = await apiCall(`/reports?${params.toString()}`, {
    method: 'GET',
  });
  return response;
};