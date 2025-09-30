const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeAccess } = require('../middleware/authMiddleware');
const exerciseService = require('../services/exerciseService');

// Endpoint to fetch exercise entries for a specific user and date using query parameters
router.get('/by-date', authenticateToken, authorizeAccess('exercise_log', (req) => req.userId), async (req, res, next) => {
  const { selectedDate } = req.query;
  if (!selectedDate) {
    return res.status(400).json({ error: 'Selected date is required.' });
  }
  try {
    const entries = await exerciseService.getExerciseEntriesByDate(req.userId, req.userId, selectedDate);
    res.status(200).json(entries);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

// Endpoint to insert an exercise entry
router.post('/', authenticateToken, authorizeAccess('exercise_log'), express.json(), async (req, res, next) => {
  try {
    const { exercise_id, duration_minutes, calories_burned, entry_date, notes, sets, reps, weight } = req.body;
    const newEntry = await exerciseService.createExerciseEntry(req.userId, {
      exercise_id,
      duration_minutes,
      calories_burned,
      entry_date,
      notes,
      sets,
      reps,
      weight,
    });
    res.status(201).json(newEntry);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

// Endpoint to fetch an exercise entry by ID
router.get('/:id', authenticateToken, authorizeAccess('exercise_log'), async (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!id || !uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Exercise Entry ID is required and must be a valid UUID.' });
  }
  try {
    const entry = await exerciseService.getExerciseEntryById(req.userId, id);
    res.status(200).json(entry);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Exercise entry not found.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Endpoint to fetch exercise entries for a specific user and date (path parameters)

// Endpoint to update an exercise entry
router.put('/:id', authenticateToken, authorizeAccess('exercise_log'), express.json(), async (req, res, next) => {
  const { id } = req.params;
  const { exercise_id, duration_minutes, calories_burned, entry_date, notes, sets, reps, weight } = req.body;
  const updateData = { exercise_id, duration_minutes, calories_burned, entry_date, notes, sets, reps, weight };
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!id || !uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Exercise Entry ID is required and must be a valid UUID.' });
  }
  try {
    const updatedEntry = await exerciseService.updateExerciseEntry(req.userId, id, updateData);
    res.status(200).json(updatedEntry);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Exercise entry not found or not authorized to update.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/progress/:exerciseId', authenticateToken, authorizeAccess('exercise_log'), async (req, res, next) => {
  const { exerciseId } = req.params;
  const { startDate, endDate } = req.query;

  if (!exerciseId) {
    return res.status(400).json({ error: 'Exercise ID is required.' });
  }
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required for progress data.' });
  }

  try {
    const progressData = await exerciseService.getExerciseProgressData(req.userId, exerciseId, startDate, endDate);
    res.status(200).json(progressData);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Exercise not found.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Endpoint to delete an exercise entry
router.delete('/:id', authenticateToken, authorizeAccess('exercise_log'), async (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!id || !uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Exercise Entry ID is required and must be a valid UUID.' });
  }
  try {
    const result = await exerciseService.deleteExerciseEntry(req.userId, id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Exercise entry not found or not authorized to delete.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;