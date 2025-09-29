const pool = require('../db/connection'); // Import the database connection pool
const exerciseRepository = require('../models/exerciseRepository');
const userRepository = require('../models/userRepository');
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

async function getExercisesWithPagination(authenticatedUserId, targetUserId, searchTerm, categoryFilter, ownershipFilter, currentPage, itemsPerPage) {
  try {

    const limit = parseInt(itemsPerPage, 10) || 10;
    const offset = ((parseInt(currentPage, 10) || 1) - 1) * limit;

    const [exercises, totalCount] = await Promise.all([
      exerciseRepository.getExercisesWithPagination(targetUserId, searchTerm, categoryFilter, ownershipFilter, limit, offset),
      exerciseRepository.countExercises(targetUserId, searchTerm, categoryFilter, ownershipFilter)
    ]);
    return { exercises, totalCount };
  } catch (error) {
    log('error', `Error fetching exercises with pagination for user ${authenticatedUserId} and target ${targetUserId}:`, error);
    throw error;
  }
}

async function searchExercises(authenticatedUserId, name, targetUserId) {
  try {
    const exercises = await exerciseRepository.searchExercises(name, targetUserId);
    return exercises;
  } catch (error) {
    log('error', `Error searching exercises for user ${authenticatedUserId} with name "${name}":`, error);
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
    // Ensure the entry is created for the authenticated user
    entryData.user_id = authenticatedUserId;

    // If calories_burned is not provided, calculate it based on exercise's calories_per_hour and duration
    if (!entryData.calories_burned && entryData.exercise_id && entryData.duration_minutes) {
      const exercise = await exerciseRepository.getExerciseById(entryData.exercise_id);
      if (exercise && exercise.calories_per_hour) {
        entryData.calories_burned = (exercise.calories_per_hour / 60) * entryData.duration_minutes;
      } else {
        log('warn', `Exercise ${entryData.exercise_id} not found or calories_per_hour not set. Cannot auto-calculate calories_burned.`);
        entryData.calories_burned = 0; // Default to 0 if calculation not possible
      }
    } else if (!entryData.calories_burned) {
      entryData.calories_burned = 0; // Default to 0 if no duration or exercise_id
    }

    const newEntry = await exerciseRepository.createExerciseEntry(authenticatedUserId, entryData);
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
    const entryOwnerId = await exerciseRepository.getExerciseEntryOwnerId(id);
    if (!entryOwnerId) {
      throw new Error('Exercise entry not found.');
    }
    // Ensure the authenticated user is the owner of the exercise entry
    if (entryOwnerId !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to update this exercise entry.');
    }

    const updatedEntry = await exerciseRepository.updateExerciseEntry(id, authenticatedUserId, updateData);
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
    const entryOwnerId = await exerciseRepository.getExerciseEntryOwnerId(id);
    if (!entryOwnerId) {
      throw new Error('Exercise entry not found.');
    }
    // Ensure the authenticated user is the owner of the exercise entry
    if (entryOwnerId !== authenticatedUserId) {
      throw new Error('Forbidden: You do not have permission to delete this exercise entry.');
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
    if (exercise.images && exercise.images.length > 0) {
      const imagePaths = JSON.parse(exercise.images);
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

async function searchExternalExercises(authenticatedUserId, query, providerId, providerType, limit = 50) { // Added limit parameter with default
  try {
    let exercises = [];
    const latestMeasurement = await measurementRepository.getLatestMeasurement(authenticatedUserId);
    const userWeightKg = (latestMeasurement && latestMeasurement.weight) ? latestMeasurement.weight : 70; // Default to 70kg

    if (providerType === 'wger') {
      const wgerSearchResults = await wgerService.searchWgerExercises(query);

      const detailedExercisesPromises = wgerSearchResults.map(async (wgerExercise) => {
        const details = await wgerService.getWgerExerciseDetails(wgerExercise.id);

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
      const freeExerciseDBSearchResults = await freeExerciseDBService.searchExercises(query, limit); // Pass limit to freeExerciseDBService
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
      source_external_id: wgerExerciseDetails.id.toString(), // Store wger ID
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
      images: exerciseDetails.images, // Store original relative paths
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
    const recentExercises = await exerciseRepository.getRecentExercises(authenticatedUserId, limit);
    const topExercises = await exerciseRepository.getTopExercises(authenticatedUserId, limit);
    return { recentExercises, topExercises };
  } catch (error) {
    log('error', `Error fetching suggested exercises for user ${authenticatedUserId}:`, error);
    throw error;
  }
}
module.exports = {
  getExerciseById,
  getOrCreateActiveCaloriesExercise,
  upsertExerciseEntryData,
  getExercisesWithPagination,
  searchExercises,
  createExercise,
  createExerciseEntry,
  getExerciseEntryById,
  updateExerciseEntry,
  deleteExerciseEntry,
  updateExercise,
  deleteExercise,
  getExerciseEntriesByDate,
  addFreeExerciseDBExerciseToUserExercises, // New export
  getSuggestedExercises,
  searchExternalExercises,
  addExternalExerciseToUserExercises,
  addNutritionixExerciseToUserExercises,
  getExerciseDeletionImpact, // Export the function
};

async function getExerciseDeletionImpact(exerciseId) {
    const client = await pool.connect();
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