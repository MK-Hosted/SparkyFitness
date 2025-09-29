const axios = require('axios');
const NodeCache = require('node-cache'); // For caching GitHub API responses
const { log } = require('../../config/logging'); // Import the log utility

const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const GITHUB_API_BASE_URL = 'https://api.github.com/repos/yuhonas/free-exercise-db/contents';
const EXERCISES_PATH = 'exercises'; // No leading slash for API

// Initialize cache for GitHub API responses (e.g., 1 hour TTL)
const githubCache = new NodeCache({ stdTTL: 3600 });

class FreeExerciseDBService {
    constructor() {
        this.exerciseList = []; // To store a list of available exercise IDs/names
    }

    /**
     * Fetches a single exercise by its ID (filename without .json).
     * @param {string} exerciseId - The ID of the exercise (e.g., "Air_Bike").
     * @returns {Promise<object|null>} The exercise data or null if not found.
     */
    async getExerciseById(exerciseId) {
        const cacheKey = `exercise_${exerciseId}`;
        let exercise = githubCache.get(cacheKey);

        if (exercise) {
            console.log(`[FreeExerciseDBService] Cache hit for exercise: ${exerciseId}`);
            return exercise;
        }

        try {
            const url = `${GITHUB_RAW_BASE_URL}/${EXERCISES_PATH}/${exerciseId}.json`;
            console.log(`[FreeExerciseDBService] Fetching exercise from: ${url}`);
            const response = await axios.get(url);
            exercise = response.data;
            githubCache.set(cacheKey, exercise);
            return exercise;
        } catch (error) {
            console.error(`[FreeExerciseDBService] Error fetching exercise ${exerciseId}:`, error.message);
            return null;
        }
    }

    async searchExercises(query, limit = 50) { // Added limit parameter
        const cacheKey = `search_exercises_${query}_${limit}`; // Include limit in cache key
        let cachedResults = githubCache.get(cacheKey);

        if (cachedResults) {
            console.log(`[FreeExerciseDBService] Cache hit for search query: ${query} with limit ${limit}`);
            return cachedResults;
        }

        try {
            const directoryUrl = `${GITHUB_API_BASE_URL}/${EXERCISES_PATH}`;
            console.log(`[FreeExerciseDBService] Fetching directory contents from: ${directoryUrl}`);
            const response = await axios.get(directoryUrl);
            const files = response.data;

            const matchingExerciseFiles = files.filter(file =>
                file.name.toLowerCase().endsWith('.json') &&
                file.name.toLowerCase().includes(query.toLowerCase())
            );

            const exercisesPromises = matchingExerciseFiles.slice(0, limit).map(async (file) => { // Apply limit here
                const exerciseId = file.name.replace('.json', '');
                return this.getExerciseById(exerciseId);
            });

            const exercises = (await Promise.all(exercisesPromises)).filter(Boolean);
            githubCache.set(cacheKey, exercises);
            return exercises;
        } catch (error) {
            console.error(`[FreeExerciseDBService] Error searching exercises for query "${query}" with limit ${limit}:`, error.message);
            return [];
        }
    }

    getExerciseImageUrl(imagePath) {
        // The imagePath from the exercise JSON is relative to the exercise file,
        // e.g., "3_4_Sit-Up/0.jpg".
        // The full raw URL should be GITHUB_RAW_BASE_URL/images/ExerciseName/image.jpg
        const imageUrl = `${GITHUB_RAW_BASE_URL}/${EXERCISES_PATH}/${imagePath}`;
        log('debug', `[FreeExerciseDBService] Constructed image URL: ${imageUrl} from imagePath: ${imagePath}`);
        return imageUrl;
    }
}

module.exports = new FreeExerciseDBService();