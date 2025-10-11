const { getPool } = require('../db/poolManager');
const { log } = require('../config/logging');
const format = require('pg-format');

async function createWorkoutPreset(presetData) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const presetResult = await client.query(
      `INSERT INTO workout_presets (user_id, name, description, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now()) RETURNING id, user_id, name, description, is_public`,
      [presetData.user_id, presetData.name, presetData.description, presetData.is_public]
    );
    const newPreset = presetResult.rows[0];

    if (presetData.exercises && presetData.exercises.length > 0) {
      const presetExercisesValues = presetData.exercises.map(exercise => [
        newPreset.id, exercise.exercise_id, exercise.sets, exercise.reps, exercise.weight, exercise.duration, exercise.notes, exercise.image_url, 'now()', 'now()'
      ]);
      const presetExercisesQuery = format(
        `INSERT INTO workout_preset_exercises (workout_preset_id, exercise_id, sets, reps, weight, duration, notes, image_url, created_at, updated_at) VALUES %L RETURNING id`,
        presetExercisesValues
      );
      await client.query(presetExercisesQuery);
    }

    await client.query('COMMIT');
    return newPreset;
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', `Error creating workout preset:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function getWorkoutPresets(userId) {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT wp.id, wp.user_id, wp.name, wp.description, wp.is_public, wp.created_at, wp.updated_at,
              COALESCE(json_agg(json_build_object(
                  'id', wpe.id,
                  'exercise_id', wpe.exercise_id,
                  'sets', wpe.sets,
                  'reps', wpe.reps,
                  'weight', wpe.weight,
                  'duration', wpe.duration,
                  'notes', wpe.notes,
                  'image_url', wpe.image_url,
                  'exercise_name', e.name
              )) FILTER (WHERE wpe.id IS NOT NULL), '[]') AS exercises
       FROM workout_presets wp
       LEFT JOIN workout_preset_exercises wpe ON wp.id = wpe.workout_preset_id
       LEFT JOIN exercises e ON wpe.exercise_id = e.id
       WHERE wp.user_id = $1 OR wp.is_public = TRUE
       GROUP BY wp.id
       ORDER BY wp.name ASC`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getWorkoutPresetById(presetId) {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT wp.id, wp.user_id, wp.name, wp.description, wp.is_public, wp.created_at, wp.updated_at,
              COALESCE(json_agg(json_build_object(
                  'id', wpe.id,
                  'exercise_id', wpe.exercise_id,
                  'sets', wpe.sets,
                  'reps', wpe.reps,
                  'weight', wpe.weight,
                  'duration', wpe.duration,
                  'notes', wpe.notes,
                  'image_url', wpe.image_url,
                  'exercise_name', e.name
              )) FILTER (WHERE wpe.id IS NOT NULL), '[]') AS exercises
       FROM workout_presets wp
       LEFT JOIN workout_preset_exercises wpe ON wp.id = wpe.workout_preset_id
       LEFT JOIN exercises e ON wpe.exercise_id = e.id
       WHERE wp.id = $1
       GROUP BY wp.id`,
      [presetId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function updateWorkoutPreset(presetId, userId, updateData) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE workout_presets SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_public = COALESCE($3, is_public),
        updated_at = now()
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, name, description, is_public`,
      [updateData.name, updateData.description, updateData.is_public, presetId, userId]
    );
    const updatedPreset = result.rows[0];

    if (updatedPreset && updateData.exercises !== undefined) {
      await client.query('DELETE FROM workout_preset_exercises WHERE workout_preset_id = $1', [presetId]);

      if (updateData.exercises.length > 0) {
        const presetExercisesValues = updateData.exercises.map(exercise => [
          presetId, exercise.exercise_id, exercise.sets, exercise.reps, exercise.weight, exercise.duration, exercise.notes, exercise.image_url, 'now()', 'now()'
        ]);
        const presetExercisesQuery = format(
          `INSERT INTO workout_preset_exercises (workout_preset_id, exercise_id, sets, reps, weight, duration, notes, image_url, created_at, updated_at) VALUES %L RETURNING id`,
          presetExercisesValues
        );
        await client.query(presetExercisesQuery);
      }
    }

    await client.query('COMMIT');
    return updatedPreset;
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', `Error updating workout preset ${presetId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function deleteWorkoutPreset(presetId, userId) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'DELETE FROM workout_presets WHERE id = $1 AND user_id = $2 RETURNING id',
      [presetId, userId]
    );
    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    log('error', `Error deleting workout preset ${presetId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function getWorkoutPresetOwnerId(presetId) {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      'SELECT user_id FROM workout_presets WHERE id = $1',
      [presetId]
    );
    return result.rows[0] ? result.rows[0].user_id : null;
  } finally {
    client.release();
  }
}

async function searchWorkoutPresets(searchTerm, userId, limit = null) {
  const client = await getPool().connect();
  try {
    let query = `
      SELECT wp.id, wp.user_id, wp.name, wp.description, wp.is_public,
             COALESCE(json_agg(json_build_object(
                 'id', wpe.id,
                 'exercise_id', wpe.exercise_id,
                 'sets', wpe.sets,
                 'reps', wpe.reps,
                 'weight', wpe.weight,
                 'duration', wpe.duration,
                 'notes', wpe.notes,
                 'image_url', wpe.image_url,
                 'exercise_name', e.name
             )) FILTER (WHERE wpe.id IS NOT NULL), '[]') AS exercises
      FROM workout_presets wp
      LEFT JOIN workout_preset_exercises wpe ON wp.id = wpe.workout_preset_id
      LEFT JOIN exercises e ON wpe.exercise_id = e.id
      WHERE (wp.user_id = $1 OR wp.is_public = TRUE)
      AND wp.name ILIKE $2
      GROUP BY wp.id
      ORDER BY wp.name ASC`;
    const queryParams = [userId, `%${searchTerm}%`];

    if (limit !== null) {
      query += ` LIMIT $3`;
      queryParams.push(limit);
    }

    const result = await client.query(query, queryParams);
    return result.rows;
  } finally {
    client.release();
  }
}

module.exports = {
  createWorkoutPreset,
  getWorkoutPresets,
  getWorkoutPresetById,
  updateWorkoutPreset,
  deleteWorkoutPreset,
  getWorkoutPresetOwnerId,
  searchWorkoutPresets,
};