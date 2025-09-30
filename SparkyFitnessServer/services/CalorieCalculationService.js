const measurementRepository = require('../models/measurementRepository');
const { log } = require('../config/logging');

// Approximate MET values based on exercise category and level
const MET_VALUES = {
    'cardio': {
        'beginner': 6.0,
        'intermediate': 7.0,
        'expert': 8.0
    },
    'strength': {
        'beginner': 4.0,
        'intermediate': 5.0,
        'expert': 6.0
    },
    'olympic weightlifting': {
        'beginner': 5.0,
        'intermediate': 6.0,
        'expert': 7.0
    },
    'powerlifting': {
        'beginner': 5.0,
        'intermediate': 6.0,
        'expert': 7.0
    },
    'strongman': {
        'beginner': 7.0,
        'intermediate': 8.0,
        'expert': 9.0
    },
    'plyometrics': {
        'beginner': 6.0,
        'intermediate': 7.0,
        'expert': 8.0
    },
    'stretching': {
        'beginner': 2.0,
        'intermediate': 2.5,
        'expert': 3.0
    },
    'default': { // For uncategorized or unknown types
        'beginner': 3.0,
        'intermediate': 3.5,
        'expert': 4.0
    }
};

/**
 * Estimates calories burned per hour for a given exercise and user.
 * @param {object} exercise - The exercise object (must have category and level).
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} Estimated calories burned per hour.
 */
async function estimateCaloriesBurnedPerHour(exercise, userId) {
    let userWeightKg = 70; // Default to 70kg if user weight not found
    try {
        const latestMeasurement = await measurementRepository.getLatestMeasurement(userId);
        if (latestMeasurement && latestMeasurement.weight) {
            userWeightKg = latestMeasurement.weight;
        }
    } catch (error) {
        log('warn', `CalorieCalculationService: Could not fetch user weight for user ${userId}, using default 70kg. Error: ${error.message}`);
    }

    const category = exercise.category ? exercise.category.toLowerCase() : 'default';
    const level = exercise.level ? exercise.level.toLowerCase() : 'intermediate';

    let met = MET_VALUES[category]?.[level] || MET_VALUES['default'][level];

    // Ensure MET is not too low
    if (met < 1.0) met = 1.0;

    // Formula: METs * 3.5 * body weight in kg / 200 = calories burned per minute
    // Calories burned per hour: (METs * 3.5 * body weight in kg) / 200 * 60
    const caloriesPerHour = (met * 3.5 * userWeightKg) / 200 * 60;

    return Math.round(caloriesPerHour);
}

module.exports = {
    estimateCaloriesBurnedPerHour
};