const { getPool } = require('../db/poolManager'); // Import the database connection pool
const exerciseRepository = require('../models/exerciseRepository');
const userRepository = require('../models/userRepository');
const preferenceRepository = require('../models/preferenceRepository');
const { v4: uuidv4 } = require('uuid'); // New import for UUID generation
const { log } = require('../config/logging');
const wgerService = require('../integrations/wger/wgerService');
const nutritionixService = require('../integrations/nutritionix/nutritionixService');
const freeExerciseDBService = require('../integrations/freeexercisedb/FreeExerciseDBService'); // New import
const measurementRepository = require('../models/measurementRepository');
const { downloadImage } = require('../utils/imageDownloader'); // Import image downloader
const calorieCalculationService = require('./CalorieCalculationService'); // Import calorie calculation service
const fs = require('fs'); // Import file system module
const path = require('path'); // Import path module
const { isValidUuid, resolveExerciseIdToUuid } = require('../utils/uuidUtils'); // Import uuidUtils
const papa = require('papaparse');

async function getExercisesWithPagination(authenticatedUserId, targetUserId, searchTerm, categoryFilter, ownershipFilter, equipmentFilter, muscleGroupFilter, currentPage, itemsPerPage) {
  try {
    const limit = parseInt(itemsPerPage, 10) || 10;
    const offset = ((parseInt(currentPage, 10) || 1) - 1) * limit;

    const [exercises, totalCount] = await Promise.all([
      exerciseRepository.getExercisesWithPagination(targetUserId, searchTerm, categoryFilter, ownershipFilter, equipmentFilter, muscleGroupFilter, limit, offset),
      exerciseRepository.countExercises(targetUserId, searchTerm, categoryFilter, ownershipFilter, equipmentFilter, muscleGroupFilter)
    ]);
    return { exercises, totalCount };
  } catch (error) {
    log('error', `Error fetching exercises with pagination for user ${authenticatedUserId} and target ${targetUserId}:`, error);
    throw error;
  }
}

async function searchExercises(authenticatedUserId, name, targetUserId, equipmentFilter, muscleGroupFilter) {
  try {
    const exercises = await exerciseRepository.searchExercises(name, targetUserId, equipmentFilter, muscleGroupFilter);
    return exercises;
  } catch (error) {
    log('error', `Error searching exercises for user ${authenticatedUserId} with name "${name}":`, error);
    throw error;
  }
}

async function getAvailableEquipment() {
  try {
    const equipment = await exerciseRepository.getDistinctEquipment();
    return equipment;
  } catch (error) {
    log('error', `Error fetching available equipment:`, error);
    throw error;
  }
}

async function getAvailableMuscleGroups() {
  try {
    const muscleGroups = await exerciseRepository.getDistinctMuscleGroups();
    return muscleGroups;
  } catch (error) {
    log('error', `Error fetching available muscle groups:`, error);
    throw error;
  }
}

async function createExercise(authenticatedUserId, exerciseData) {
  try {
    // Ensure the exercise is created for the authenticated user
    exerciseData.user_id = authenticatedUserId;
    // If images are provided, ensure they are stored as JSON string in the database
    if (exerciseData.images && Array.isArray(exerciseData.images)) {
      exerciseData.images = JSON.stringify(exerciseData.images);
    }
    const newExercise = await exerciseRepository.createExercise(exerciseData);
    return newExercise;
  } catch (error) {
    log('error', `Error creating exercise for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function createExerciseEntry(authenticatedUserId, entryData) {
  try {
    entryData.user_id = authenticatedUserId;

    // Resolve exercise_id to a UUID
    const resolvedExerciseId = await resolveExerciseIdToUuid(entryData.exercise_id);
    entryData.exercise_id = resolvedExerciseId;

    // If calories_burned is not provided, calculate it using the calorieCalculationService
    if (!entryData.calories_burned && entryData.exercise_id && entryData.duration_minutes !== null && entryData.duration_minutes !== undefined) {
      const exercise = await exerciseRepository.getExerciseById(entryData.exercise_id);
      if (exercise) {
        const caloriesPerHour = await calorieCalculationService.estimateCaloriesBurnedPerHour(exercise, authenticatedUserId);
        entryData.calories_burned = (caloriesPerHour / 60) * entryData.duration_minutes;
      } else {
        log('warn', `Exercise ${entryData.exercise_id} not found. Cannot auto-calculate calories_burned.`);
        entryData.calories_burned = 0;
      }
    } else if (!entryData.calories_burned) {
      entryData.calories_burned = 0;
    }

    const newEntry = await exerciseRepository.createExerciseEntry(authenticatedUserId, {
      ...entryData,
      duration_minutes: typeof entryData.duration_minutes === 'number' ? entryData.duration_minutes : 0,
      sets: entryData.sets || null,
      reps: entryData.reps || null,
      weight: entryData.weight || null,
      workout_plan_assignment_id: entryData.workout_plan_assignment_id || null,
      image_url: entryData.image_url || null,
    });
    return newEntry;
  } catch (error) {
    log('error', `Error creating exercise entry for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getExerciseEntryById(authenticatedUserId, id) {
  try {
    const entryOwnerId = await exerciseRepository.getExerciseEntryOwnerId(id);
    if (!entryOwnerId) {
      throw new Error('Exercise entry not found.');
    }
    const entry = await exerciseRepository.getExerciseEntryById(id);
    return entry;
  } catch (error) {
    log('error', `Error fetching exercise entry ${id} by user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function updateExerciseEntry(authenticatedUserId, id, updateData) {
  try {
    const existingEntry = await exerciseRepository.getExerciseEntryById(id);
    if (!existingEntry) {
      throw new Error('Exercise entry not found.');
    }
    // Ensure the authenticated user is the owner of the exercise entry
    if (existingEntry.user_id !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to update this exercise entry.');
    }

    // If a new image is being uploaded or the image is being cleared, delete the old one
    // If a new image is being uploaded or the image is being cleared, delete the old one
    if ((updateData.image_url || updateData.image_url === null) && existingEntry.image_url) {
      const oldImagePath = path.join(__dirname, '..', existingEntry.image_url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
        log('info', `Deleted old exercise entry image: ${oldImagePath}`);
      }
    }
 
    // If calories_burned is not provided, calculate it using the calorieCalculationService
    if (updateData.exercise_id && updateData.duration_minutes !== null && updateData.duration_minutes !== undefined && updateData.calories_burned === undefined) {
      const exercise = await exerciseRepository.getExerciseById(updateData.exercise_id);
      if (exercise) {
        const caloriesPerHour = await calorieCalculationService.estimateCaloriesBurnedPerHour(exercise, authenticatedUserId);
        updateData.calories_burned = (caloriesPerHour / 60) * updateData.duration_minutes;
      } else {
        log('warn', `Exercise ${updateData.exercise_id} not found. Cannot auto-calculate calories_burned.`);
        updateData.calories_burned = 0;
      }
    } else if (updateData.calories_burned === undefined) {
      // If calories_burned is not in updateData, use existing value or 0
      updateData.calories_burned = existingEntry.calories_burned || 0;
    }

    const updatedEntry = await exerciseRepository.updateExerciseEntry(id, authenticatedUserId, {
      ...updateData,
      duration_minutes: updateData.duration_minutes || 0,
      sets: updateData.sets || null,
      reps: updateData.reps || null,
      weight: updateData.weight || null,
      workout_plan_assignment_id: updateData.workout_plan_assignment_id || null,
      image_url: updateData.image_url === null ? null : (updateData.image_url || existingEntry.image_url),
    });
    if (!updatedEntry) {
      throw new Error('Exercise entry not found or not authorized to update.');
    }
    return updatedEntry;
  } catch (error) {
    log('error', `Error updating exercise entry ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function deleteExerciseEntry(authenticatedUserId, id) {
  try {
    const entry = await exerciseRepository.getExerciseEntryById(id);
    if (!entry) {
      throw new Error('Exercise entry not found.');
    }
    // Ensure the authenticated user is the owner of the exercise entry
    if (entry.user_id !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to delete this exercise entry.');
    }

    // If an image is associated with the entry, delete it from the filesystem
    if (entry.image_url) {
      const imagePath = path.join(__dirname, '..', entry.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        log('info', `Deleted exercise entry image: ${imagePath}`);
      }
    }

    const success = await exerciseRepository.deleteExerciseEntry(id, authenticatedUserId);
    if (!success) {
      throw new Error('Exercise entry not found or not authorized to delete.');
    }
    return { message: 'Exercise entry deleted successfully.' };
  } catch (error) {
    log('error', `Error deleting exercise entry ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getExerciseById(authenticatedUserId, id) {
  try {
    const exerciseOwnerId = await exerciseRepository.getExerciseOwnerId(id);
    if (!exerciseOwnerId) {
      const publicExercise = await exerciseRepository.getExerciseById(id);
      if (publicExercise && !publicExercise.is_custom) {
        return publicExercise;
      }
      throw new Error('Exercise not found.');
    }
    const exercise = await exerciseRepository.getExerciseById(id);
    return exercise;
  } catch (error) {
    log('error', `Error fetching exercise ${id} by user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function updateExercise(authenticatedUserId, id, updateData) {
  try {
    const exerciseOwnerId = await exerciseRepository.getExerciseOwnerId(id);
    if (!exerciseOwnerId) {
      throw new Error('Exercise not found.');
    }
    if (exerciseOwnerId !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to update this exercise.');
    }
    // If images are provided, ensure they are stored as JSON string in the database
    if (updateData.images && Array.isArray(updateData.images)) {
      updateData.images = JSON.stringify(updateData.images);
    }
    const updatedExercise = await exerciseRepository.updateExercise(id, authenticatedUserId, updateData);
    if (!updatedExercise) {
      throw new Error('Exercise not found or not authorized to update.');
    }
    return updatedExercise;
  } catch (error) {
    log('error', `Error updating exercise ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function deleteExercise(authenticatedUserId, id) {
  try {
    const exercise = await exerciseRepository.getExerciseById(id); // Get exercise details
    if (!exercise) {
      throw new Error('Exercise not found.');
    }
    if (exercise.user_id !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to delete this exercise.');
    }

    const success = await exerciseRepository.deleteExercise(id, authenticatedUserId);
    if (!success) {
      throw new Error('Exercise not found or not authorized to delete.');
    }

    // Delete associated images and their folder
    if (exercise.images) {
      let imagePaths = [];
      try {
        // Attempt to parse as JSON array
        imagePaths = JSON.parse(exercise.images);
      } catch (e) {
        // If parsing fails, assume it's a single image path string
        imagePaths = [exercise.images];
      }

      if (imagePaths.length > 0) {
        // Assuming all images for an exercise are in the same folder
        const folderName = imagePaths[0].split('/')[0];
        const exerciseUploadPath = path.join(__dirname, '../uploads/exercises', folderName);

        if (fs.existsSync(exerciseUploadPath)) {
          fs.rmdirSync(exerciseUploadPath, { recursive: true });
          log('info', `Deleted exercise image folder: ${exerciseUploadPath}`);
        }
      }
    }

    return { message: 'Exercise deleted successfully.' };
  } catch (error) {
    log('error', `Error deleting exercise ${id} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getExerciseEntriesByDate(authenticatedUserId, targetUserId, selectedDate) {
  try {
    if (!targetUserId) {
      log('error', 'getExerciseEntriesByDate: targetUserId is undefined. Returning empty array.');
      return [];
    }
    const entries = await exerciseRepository.getExerciseEntriesByDate(targetUserId, selectedDate);
    if (!entries || entries.length === 0) {
      return [];
    }
    return entries;
  } catch (error) {
    log('error', `Error fetching exercise entries for user ${targetUserId} on ${selectedDate} by ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getOrCreateActiveCaloriesExercise(userId) {
  try {
    const exerciseId = await exerciseRepository.getOrCreateActiveCaloriesExercise(userId);
    return exerciseId;
  } catch (error) {
    log('error', `Error getting or creating active calories exercise for user ${userId}:`, error);
    throw error;
  }
}

async function upsertExerciseEntryData(userId, exerciseId, caloriesBurned, date) {
  try {
    const entry = await exerciseRepository.upsertExerciseEntryData(userId, exerciseId, caloriesBurned, date);
    return entry;
  } catch (error) {
    log('error', `Error upserting exercise entry data for user ${userId}, exercise ${exerciseId}:`, error);
    throw error;
  }
}

async function searchExternalExercises(authenticatedUserId, query, providerId, providerType, equipmentFilter, muscleGroupFilter, limit = 50) {
  try {
    let exercises = [];
    const latestMeasurement = await measurementRepository.getLatestMeasurement(authenticatedUserId);
    const userWeightKg = (latestMeasurement && latestMeasurement.weight) ? latestMeasurement.weight : 70; // Default to 70kg

    const hasFilters = equipmentFilter.length > 0 || muscleGroupFilter.length > 0;
    const hasQuery = query.trim().length > 0;

    // If there's no search query but filters are present, and the provider doesn't support filters,
    // return an empty array to avoid returning a large, unfiltered list.
    if (!hasQuery && hasFilters) {
      if (providerType === 'wger' || providerType === 'nutritionix') {
        log('warn', `External search for provider ${providerType} received filters but no search query. Filters are not supported for this provider without a search query. Returning empty results.`);
        return [];
      }
    }

    if (providerType === 'wger') {
      const wgerSearchResults = await wgerService.searchWgerExercises(query);

      const detailedExercisesPromises = wgerSearchResults.map(async (wgerExercise) => {
        const details = await wgerService.getWgerExerciseDetails(wgerExercise.base_id);

        let caloriesPerHour = 0;
        if (details.met && details.met > 0) {
          caloriesPerHour = Math.round((details.met * 3.5 * userWeightKg) / 200 * 60);
        }

        const exerciseName = (details.translations && details.translations.length > 0 && details.translations[0].name)
          ? details.translations[0].name
          : details.description || `Exercise ID: ${details.id}`;

        return {
          id: details.id.toString(),
          name: exerciseName,
          category: details.category ? details.category.name : 'Uncategorized',
          calories_per_hour: caloriesPerHour,
          description: details.description || exerciseName,
        };
      });
      exercises = await Promise.all(detailedExercisesPromises);
    } else if (providerType === 'nutritionix') {
      // For Nutritionix, we are not using user demographics for now, as per user feedback.
      const nutritionixSearchResults = await nutritionixService.searchNutritionixExercises(query, providerId);
      exercises = nutritionixSearchResults;
    } else if (providerType === 'free-exercise-db') {
      const freeExerciseDBSearchResults = await freeExerciseDBService.searchExercises(query, equipmentFilter, muscleGroupFilter, limit); // Pass filters and limit
      exercises = freeExerciseDBSearchResults.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        calories_per_hour: 0, // Will be calculated when added to user's exercises
        description: exercise.description,
        source: 'free-exercise-db',
        force: exercise.force,
        level: exercise.level,
        mechanic: exercise.mechanic,
        equipment: Array.isArray(exercise.equipment) ? exercise.equipment : (exercise.equipment ? [exercise.equipment] : []),
        primary_muscles: Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : (exercise.primaryMuscles ? [exercise.primaryMuscles] : []),
        secondary_muscles: Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : (exercise.secondaryMuscles ? [exercise.secondaryMuscles] : []),
        instructions: Array.isArray(exercise.instructions) ? exercise.instructions : (exercise.instructions ? [exercise.instructions] : []),
        images: exercise.images.map(img => freeExerciseDBService.getExerciseImageUrl(img)), // Convert to full URLs for search results
      }));
    } else {
      throw new Error(`Unsupported external exercise provider: ${providerType}`);
    }
    return exercises;
  } catch (error) {
    log('error', `Error searching external exercises with query "${query}" from provider "${providerType}":`, error);
    throw error;
  }
}

async function addExternalExerciseToUserExercises(authenticatedUserId, wgerExerciseId) {
  try {
    const wgerExerciseDetails = await wgerService.getWgerExerciseDetails(wgerExerciseId);

    if (!wgerExerciseDetails) {
      throw new Error('Wger exercise not found.');
    }

    // Attempt to get a more descriptive name from the /exercise/ endpoint if available

    // Calculate calories_per_hour
    let caloriesPerHour = 300; // Default value if MET is not available or calculation fails
    if (wgerExerciseDetails.met && wgerExerciseDetails.met > 0) {
      let userWeightKg = 70; // Default to 70kg if user weight not found
      const latestMeasurement = await measurementRepository.getLatestMeasurement(authenticatedUserId);
      if (latestMeasurement && latestMeasurement.weight) {
        userWeightKg = latestMeasurement.weight;
      }

      // Formula: METs * 3.5 * body weight in kg / 200 = calories burned per minute
      // To get calories per hour: (METs * 3.5 * body weight in kg) / 200 * 60
      caloriesPerHour = (wgerExerciseDetails.met * 3.5 * userWeightKg) / 200 * 60;
      caloriesPerHour = Math.round(caloriesPerHour); // Round to nearest whole number
    }

    // Use the name from translations if available, otherwise fallback to description or ID
    const exerciseName = (wgerExerciseDetails.translations && wgerExerciseDetails.translations.length > 0 && wgerExerciseDetails.translations[0].name)
      ? wgerExerciseDetails.translations[0].name
      : wgerExerciseDetails.description || `Wger Exercise ${wgerExerciseId}`;

    const exerciseData = {
      name: exerciseName,
      category: wgerExerciseDetails.category ? wgerExerciseDetails.category.name : 'general',
      calories_per_hour: caloriesPerHour,
      description: wgerExerciseDetails.description || exerciseName, // Use the derived exerciseName for description fallback
      user_id: authenticatedUserId,
      is_custom: true, // Mark as custom as it's imported by the user
      shared_with_public: false, // Imported exercises are private by default
      source_external_id: wgerExerciseDetails.toString(), // Store wger ID
    };

    const newExercise = await exerciseRepository.createExercise(exerciseData);
    return newExercise;
  } catch (error) {
    log('error', `Error adding external exercise ${wgerExerciseId} for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function addNutritionixExerciseToUserExercises(authenticatedUserId, nutritionixExerciseData) {
  try {
    const newExerciseId = uuidv4(); // Generate a new UUID for the local exercise

    const exerciseData = {
      id: newExerciseId,
      name: nutritionixExerciseData.name,
      category: nutritionixExerciseData.category || 'External',
      calories_per_hour: nutritionixExerciseData.calories_per_hour,
      description: nutritionixExerciseData.description,
      user_id: authenticatedUserId,
      is_custom: true, // Mark as custom as it's imported by the user
      shared_with_public: false, // Imported exercises are private by default
      source_external_id: nutritionixExerciseData.external_id.toString(), // Store original Nutritionix ID
      source: 'nutritionix',
    };

    const newExercise = await exerciseRepository.createExercise(exerciseData);
    return newExercise;
  } catch (error) {
    log('error', `Error adding Nutritionix exercise for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function addFreeExerciseDBExerciseToUserExercises(authenticatedUserId, freeExerciseDBId) {
  try {
    const freeExerciseDBService = require('../integrations/freeexercisedb/FreeExerciseDBService'); // Lazy load to avoid circular dependency
    const exerciseDetails = await freeExerciseDBService.getExerciseById(freeExerciseDBId);

    if (!exerciseDetails) {
      throw new Error('Free-Exercise-DB exercise not found.');
    }

    // Download images and update paths
    const localImagePaths = await Promise.all(
      exerciseDetails.images.map(async (imagePath) => {
        const imageUrl = freeExerciseDBService.getExerciseImageUrl(imagePath); // This now correctly forms the external URL
        const exerciseIdFromPath = imagePath.split('/')[0]; // Extract exercise ID from path for download
        await downloadImage(imageUrl, exerciseIdFromPath); // Download the image
        return imagePath; // Store the original relative path in the database
      })
    );

    // Map free-exercise-db data to our generic Exercise model
    const exerciseData = {
      id: uuidv4(), // Generate a new UUID for the local exercise
      source: 'free-exercise-db',
      source_id: exerciseDetails.id,
      name: exerciseDetails.name,
      force: exerciseDetails.force,
      level: exerciseDetails.level,
      mechanic: exerciseDetails.mechanic,
      equipment: exerciseDetails.equipment,
      primary_muscles: exerciseDetails.primaryMuscles,
      secondary_muscles: exerciseDetails.secondaryMuscles,
      instructions: exerciseDetails.instructions,
      category: exerciseDetails.category,
      images: JSON.stringify(exerciseDetails.images), // Store original relative paths as JSON string
      calories_per_hour: await calorieCalculationService.estimateCaloriesBurnedPerHour(exerciseDetails, authenticatedUserId), // Calculate calories
      description: exerciseDetails.instructions[0] || exerciseDetails.name, // Use first instruction as description or name
      user_id: authenticatedUserId,
      is_custom: true, // Imported exercises are custom to the user
      shared_with_public: false, // Imported exercises are private by default
    };

    const newExercise = await exerciseRepository.createExercise(exerciseData);
    return newExercise;
  } catch (error) {
    log('error', `Error adding Free-Exercise-DB exercise ${freeExerciseDBId} for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getSuggestedExercises(authenticatedUserId, limit) {
  try {
    const preferences = await preferenceRepository.getUserPreferences(authenticatedUserId);
    const displayLimit = preferences?.item_display_limit || limit;
    const recentExercises = await exerciseRepository.getRecentExercises(authenticatedUserId, displayLimit);
    const topExercises = await exerciseRepository.getTopExercises(authenticatedUserId, displayLimit);
    return { recentExercises, topExercises };
  } catch (error) {
    log('error', `Error fetching suggested exercises for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getRecentExercises(authenticatedUserId, limit) {
  try {
    const preferences = await preferenceRepository.getUserPreferences(authenticatedUserId);
    const displayLimit = preferences?.item_display_limit || limit;
    const recentExercises = await exerciseRepository.getRecentExercises(authenticatedUserId, displayLimit);
    return recentExercises;
  } catch (error) {
    log('error', `Error fetching recent exercises for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getTopExercises(authenticatedUserId, limit) {
  try {
    const preferences = await preferenceRepository.getUserPreferences(authenticatedUserId);
    const displayLimit = preferences?.item_display_limit || limit;
    const topExercises = await exerciseRepository.getTopExercises(authenticatedUserId, displayLimit);
    return topExercises;
  } catch (error) {
    log('error', `Error fetching top exercises for user ${authenticatedUserId}:`, error);
    throw error;
  }
}

async function getExerciseProgressData(authenticatedUserId, exerciseId, startDate, endDate) {
  try {
    const progressData = await exerciseRepository.getExerciseProgressData(authenticatedUserId, exerciseId, startDate, endDate);
    return progressData;
  } catch (error) {
    log('error', `Error fetching exercise progress data for user ${authenticatedUserId}, exercise ${exerciseId}:`, error);
    throw error;
  }
}
 
async function getExerciseHistory(authenticatedUserId, exerciseId, limit) {
  try {
    const resolvedExerciseId = await resolveExerciseIdToUuid(exerciseId);
    const history = await exerciseRepository.getExerciseHistory(authenticatedUserId, resolvedExerciseId, limit);
    return history;
  } catch (error) {
    log('error', `Error fetching exercise history for user ${authenticatedUserId}, exercise ${exerciseId}:`, error);
    throw error;
  }
}

async function importExercisesFromCSV(authenticatedUserId, filePath) {
  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const failedRows = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, errors } = papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      log('error', 'CSV parsing errors:', errors);
      throw new Error('CSV parsing failed. Please check file format.');
    }

    for (const row of data) {
      try {
        const exerciseName = row.name ? row.name.trim() : null;
        if (!exerciseName) {
          failedCount++;
          failedRows.push({ row, reason: 'Exercise name is required.' });
          continue;
        }

        const primaryMuscles = row.primary_muscles ? row.primary_muscles.split(',').map(m => m.trim()) : [];
        if (primaryMuscles.length === 0) {
          failedCount++;
          failedRows.push({ row, reason: 'Primary muscles are required.' });
          continue;
        }

        const sourceId = exerciseName.toLowerCase().replace(/\s/g, '_');
        const exerciseData = {
          name: exerciseName,
          description: row.description || null,
          instructions: row.instructions ? row.instructions.split(',').map(i => i.trim()) : [],
          category: row.category || null,
          force: row.force || null,
          level: row.level || null,
          mechanic: row.mechanic || null,
          equipment: row.equipment ? row.equipment.split(',').map(e => e.trim()) : [],
          primary_muscles: primaryMuscles,
          secondary_muscles: row.secondary_muscles ? row.secondary_muscles.split(',').map(m => m.trim()) : [],
          calories_per_hour: row.calories_per_hour ? parseFloat(row.calories_per_hour) : null,
          user_id: authenticatedUserId,
          is_custom: true,
          shared_with_public: row.shared_with_public === 'true',
          source: 'CSV',
          source_id: sourceId,
        };

        // Handle images: download and store local paths
        if (row.images) {
          const imageUrls = row.images.split(',').map(url => url.trim());
          const localImagePaths = [];
          const exerciseFolderName = exerciseName.replace(/[^a-zA-Z0-9]/g, '_');
          for (const imageUrl of imageUrls) {
            try {
              const localPath = await downloadImage(imageUrl, exerciseFolderName);
              localImagePaths.push(localPath);
            } catch (imgError) {
              log('error', `Failed to download image ${imageUrl} for exercise ${exerciseName}:`, imgError);
              // Continue without this image, but log the error
            }
          }
          exerciseData.images = localImagePaths;
        } else {
          exerciseData.images = [];
        }

        const existingExercise = await exerciseRepository.searchExercises(exerciseName, authenticatedUserId, [], []);
        if (existingExercise && existingExercise.length > 0) {
          // Assuming the first match is the one to update
          await exerciseRepository.updateExercise(existingExercise[0].id, authenticatedUserId, exerciseData);
          updatedCount++;
        } else {
          await exerciseRepository.createExercise(exerciseData);
          createdCount++;
        }
      } catch (rowError) {
        failedCount++;
        failedRows.push({ row, reason: rowError.message });
        log('error', `Error processing CSV row for user ${authenticatedUserId}:`, rowError);
      }
    }
  } catch (error) {
    log('error', `Error importing exercises from CSV for user ${authenticatedUserId}:`, error);
    throw error;
  } finally {
    // Clean up the uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  return {
    message: 'CSV import complete.',
    created: createdCount,
    updated: updatedCount,
    failed: failedCount,
    failedRows: failedRows,
  };
}
 
async function getExerciseDeletionImpact(exerciseId) {
    const client = await getPool().connect();
    try {
        const result = await client.query(
            'SELECT COUNT(*) FROM exercise_entries WHERE exercise_id = $1',
            [exerciseId]
        );
        return {
            exerciseEntriesCount: parseInt(result.rows[0].count, 10),
        };
    } finally {
        client.release();
    }
}

module.exports = {
  getExerciseById,
  getOrCreateActiveCaloriesExercise,
  upsertExerciseEntryData,
  getExercisesWithPagination,
  searchExercises,
  getAvailableEquipment,
  getAvailableMuscleGroups,
  createExercise,
  createExerciseEntry,
  getExerciseEntryById,
  updateExerciseEntry,
  deleteExerciseEntry,
  updateExercise,
  deleteExercise,
  getExerciseEntriesByDate,
  addFreeExerciseDBExerciseToUserExercises,
  getSuggestedExercises,
  searchExternalExercises,
  addExternalExerciseToUserExercises,
  addNutritionixExerciseToUserExercises,
  getExerciseDeletionImpact,
  getExerciseProgressData,
  getExerciseHistory,
  getRecentExercises,
  getTopExercises,
  importExercisesFromCSV,
  importExercisesFromJson, // Export the new function
};

async function importExercisesFromJson(authenticatedUserId, exercisesArray) {
  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const failedRows = [];
  const duplicates = [];

  for (const exerciseData of exercisesArray) {
    try {
      const exerciseName = exerciseData.name ? exerciseData.name.trim() : null;
      if (!exerciseName) {
        failedCount++;
        failedRows.push({ row: exerciseData, reason: 'Exercise name is required.' });
        continue;
      }

      const primaryMuscles = exerciseData.primary_muscles ? exerciseData.primary_muscles.split(',').map(m => m.trim()) : [];
      if (primaryMuscles.length === 0) {
        failedCount++;
        failedRows.push({ row: exerciseData, reason: 'Primary muscles are required.' });
        continue;
      }

      const sourceId = exerciseName.toLowerCase().replace(/\s/g, '_');
      const newExerciseData = {
        name: exerciseName,
        description: exerciseData.description || null,
        instructions: exerciseData.instructions ? exerciseData.instructions.split(',').map(i => i.trim()) : [],
        category: exerciseData.category || null,
        force: exerciseData.force || null,
        level: exerciseData.level || null,
        mechanic: exerciseData.mechanic || null,
        equipment: exerciseData.equipment ? exerciseData.equipment.split(',').map(e => e.trim()) : [],
        primary_muscles: primaryMuscles,
        secondary_muscles: exerciseData.secondary_muscles ? exerciseData.secondary_muscles.split(',').map(m => m.trim()) : [],
        calories_per_hour: exerciseData.calories_per_hour ? parseFloat(exerciseData.calories_per_hour) : null,
        user_id: authenticatedUserId,
        is_custom: exerciseData.is_custom === true,
        shared_with_public: exerciseData.shared_with_public === true,
        source: 'CSV_Import', // Indicate that it came from a CSV import via the UI
        source_id: sourceId,
      };

      // Handle images: download and store local paths
      if (exerciseData.images) {
        const imageUrls = exerciseData.images.split(',').map(url => url.trim());
        const localImagePaths = [];
        const exerciseFolderName = exerciseName.replace(/[^a-zA-Z0-9]/g, '_');
        for (const imageUrl of imageUrls) {
          try {
            const localPath = await downloadImage(imageUrl, exerciseFolderName);
            localImagePaths.push(localPath);
          } catch (imgError) {
            log('error', `Failed to download image ${imageUrl} for exercise ${exerciseName}:`, imgError);
            // Continue without this image, but log the error
          }
        }
        newExerciseData.images = localImagePaths;
      } else {
        newExerciseData.images = [];
      }

      const existingExercise = await exerciseRepository.searchExercises(exerciseName, authenticatedUserId, [], []);
      if (existingExercise && existingExercise.length > 0) {
        // Check for exact duplicate before updating
        const isDuplicate = existingExercise.some(
          (ex) => ex.name.toLowerCase() === exerciseName.toLowerCase()
        );

        if (isDuplicate) {
          duplicates.push({ name: exerciseName, reason: 'Exercise with this name already exists.' });
          failedCount++;
          failedRows.push({ row: exerciseData, reason: 'Duplicate exercise name.' });
          continue;
        }

        // Assuming the first match is the one to update
        await exerciseRepository.updateExercise(existingExercise[0].id, authenticatedUserId, newExerciseData);
        updatedCount++;
      } else {
        await exerciseRepository.createExercise(newExerciseData);
        createdCount++;
      }
    } catch (rowError) {
      failedCount++;
      failedRows.push({ row: exerciseData, reason: rowError.message });
      log('error', `Error processing exercise data for user ${authenticatedUserId}:`, rowError);
    }
  }

  if (duplicates.length > 0) {
    const error = new Error('Duplicate exercises found.');
    error.status = 409; // Conflict
    error.data = { duplicates };
    throw error;
  }

  return {
    message: 'Exercise import complete.',
    created: createdCount,
    updated: updatedCount,
    failed: failedCount,
    failedRows: failedRows,
  };
}