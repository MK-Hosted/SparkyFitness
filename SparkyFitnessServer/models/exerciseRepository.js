const pool = require('../db/connection');
const { log } = require('../config/logging');

async function getExerciseById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, source, source_id, name, force, level, mechanic, equipment,
              primary_muscles, secondary_muscles, instructions, category, images,
              calories_per_hour, description, user_id, is_custom, shared_with_public,
              created_at, updated_at
       FROM exercises WHERE id = $1`,
      [id]
    );
    const exercise = result.rows[0];
    if (exercise && exercise.images) {
      try {
        exercise.images = JSON.parse(exercise.images);
      } catch (e) {
        log('error', `Error parsing images for exercise ${exercise.id}:`, e);
        exercise.images = []; // Default to empty array on parse error
      }
    }
    return exercise;
  } finally {
    client.release();
  }
}

async function getExerciseOwnerId(id) {
  const client = await pool.connect();
  try {
    const exerciseResult = await client.query(
      'SELECT user_id FROM exercises WHERE id = $1',
      [id]
    );
    return exerciseResult.rows[0]?.user_id;
  } finally {
    client.release();
  }
}

async function getOrCreateActiveCaloriesExercise(userId) {
  const exerciseName = "Active Calories";
  const client = await pool.connect();
  let exercise = null;
  try {
    const result = await client.query(
      'SELECT id FROM exercises WHERE name = $1 AND user_id = $2',
      [exerciseName, userId]
    );
    exercise = result.rows[0];
  } catch (error) {
    log('error', "Error fetching active calories exercise:", error);
    throw new Error(`Failed to retrieve active calories exercise: ${error.message}`);
  } finally {
    client.release();
  }

  if (!exercise) {
    log('info', `Creating default exercise: ${exerciseName} for user ${userId}`);
    const insertClient = await pool.connect();
    let newExercise = null;
    try {
      const result = await insertClient.query(
        `INSERT INTO exercises (user_id, name, category, calories_per_hour, description, is_custom, shared_with_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [userId, exerciseName, 'Cardio', 600, 'Automatically logged active calories from a health tracking shortcut.', true, false]
      );
      newExercise = result.rows[0];
    } catch (createError) {
      log('error', "Error creating active calories exercise:", createError);
      throw new Error(`Failed to create active calories exercise: ${createError.message}`);
    } finally {
      insertClient.release();
    }
    exercise = newExercise;
  }
  return exercise.id;
}

async function upsertExerciseEntryData(userId, exerciseId, caloriesBurned, date) {
  log('info', "upsertExerciseEntryData received date parameter:", date);
  const client = await pool.connect();
  let existingEntry = null;
  try {
    const result = await client.query(
      'SELECT id, calories_burned FROM exercise_entries WHERE user_id = $1 AND exercise_id = $2 AND entry_date = $3',
      [userId, exerciseId, date]
    );
    existingEntry = result.rows[0];
  } catch (error) {
    log('error', "Error checking for existing active calories exercise entry:", error);
    throw new Error(`Failed to check existing active calories exercise entry: ${error.message}`);
  } finally {
    client.release();
  }

  let result;
  if (existingEntry) {
    log('info', `Existing active calories entry found for ${date}, updating calories from ${existingEntry.calories_burned} to ${caloriesBurned}.`);
    const updateClient = await pool.connect();
    try {
      const updateResult = await updateClient.query(
        'UPDATE exercise_entries SET calories_burned = $1, notes = $2 WHERE id = $3 RETURNING *',
        [caloriesBurned, 'Active calories logged from Apple Health (updated).', existingEntry.id]
      );
      result = updateResult.rows[0];
    } catch (error) {
      log('error', "Error updating active calories exercise entry:", error);
      throw new Error(`Failed to update active calories exercise entry: ${error.message}`);
    } finally {
      updateClient.release();
    }
  } else {
    log('info', `No existing active calories entry found for ${date}, inserting new entry.`);
    const insertClient = await pool.connect();
    try {
      const insertResult = await insertClient.query(
        `INSERT INTO exercise_entries (user_id, exercise_id, entry_date, calories_burned, duration_minutes, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, exerciseId, date, caloriesBurned, 0, 'Active calories logged from Apple Health.']
      );
      result = insertResult.rows[0];
    } catch (error) {
      log('error', "Error inserting active calories exercise entry:", error);
      throw new Error(`Failed to insert active calories exercise entry: ${error.message}`);
    } finally {
      insertClient.release();
    }
  }
  return result;
}

async function getExercisesWithPagination(targetUserId, searchTerm, categoryFilter, ownershipFilter, equipmentFilter, muscleGroupFilter, limit, offset) {
  const client = await pool.connect();
  try {
    let whereClauses = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    if (searchTerm) {
      whereClauses.push(`name ILIKE $${paramIndex}`);
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (categoryFilter && categoryFilter !== 'all') {
      whereClauses.push(`category = $${paramIndex}`);
      queryParams.push(categoryFilter);
      paramIndex++;
    }

    if (ownershipFilter === 'own') {
      whereClauses.push(`user_id = $${paramIndex}`);
      queryParams.push(targetUserId);
      paramIndex++;
    } else if (ownershipFilter === 'public') {
      whereClauses.push(`user_id IS NULL OR shared_with_public = TRUE`);
    } else if (ownershipFilter === 'family') {
      whereClauses.push(`user_id != $${paramIndex} AND is_custom = TRUE`);
      queryParams.push(targetUserId);
      paramIndex++;
    } else if (ownershipFilter === 'all') {
      whereClauses.push(`(user_id IS NULL OR user_id = $${paramIndex} OR shared_with_public = TRUE OR user_id IN (SELECT owner_user_id FROM family_access WHERE family_user_id = $${paramIndex} AND is_active = TRUE AND (access_end_date IS NULL OR access_end_date > NOW())))`);
      queryParams.push(targetUserId);
      paramIndex++;
    }

    if (equipmentFilter && equipmentFilter.length > 0) {
      whereClauses.push(`equipment::jsonb ?| ARRAY[${equipmentFilter.map((_, i) => `$${paramIndex + i}`).join(',')}]`);
      queryParams.push(...equipmentFilter);
      paramIndex += equipmentFilter.length;
    }

    if (muscleGroupFilter && muscleGroupFilter.length > 0) {
      whereClauses.push(`(primary_muscles::jsonb ?| ARRAY[${muscleGroupFilter.map((_, i) => `$${paramIndex + i}`).join(',')}] OR secondary_muscles::jsonb ?| ARRAY[${muscleGroupFilter.map((_, i) => `$${paramIndex + i}`).join(',')}])`);
      queryParams.push(...muscleGroupFilter);
      queryParams.push(...muscleGroupFilter); // Push twice for primary and secondary muscles
      paramIndex += (muscleGroupFilter.length * 2);
    }

    let query = `
      SELECT id, source, source_id, name, force, level, mechanic, equipment,
             primary_muscles, secondary_muscles, instructions, category, images,
             calories_per_hour, description, user_id, is_custom, shared_with_public,
             created_at, updated_at
      FROM exercises
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const result = await client.query(query, queryParams);
    return result.rows.map(row => {
      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (e) {
          log('error', `Error parsing images for exercise ${row.id}:`, e);
          row.images = [];
        }
      }
      return row;
    });
  } finally {
    client.release();
  }
}

async function countExercises(targetUserId, searchTerm, categoryFilter, ownershipFilter, equipmentFilter, muscleGroupFilter) {
  const client = await pool.connect();
  try {
    let whereClauses = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    if (searchTerm) {
      whereClauses.push(`name ILIKE $${paramIndex}`);
      queryParams.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (categoryFilter && categoryFilter !== 'all') {
      whereClauses.push(`category = $${paramIndex}`);
      queryParams.push(categoryFilter);
      paramIndex++;
    }

    if (ownershipFilter === 'own') {
      whereClauses.push(`user_id = $${paramIndex}`);
      queryParams.push(targetUserId);
      paramIndex++;
    } else if (ownershipFilter === 'public') {
      whereClauses.push(`user_id IS NULL OR shared_with_public = TRUE`);
    } else if (ownershipFilter === 'family') {
      whereClauses.push(`user_id != $${paramIndex} AND is_custom = TRUE`);
      queryParams.push(targetUserId);
      paramIndex++;
    } else if (ownershipFilter === 'all') {
      whereClauses.push(`(user_id IS NULL OR user_id = $${paramIndex} OR shared_with_public = TRUE OR user_id IN (SELECT owner_user_id FROM family_access WHERE family_user_id = $${paramIndex} AND is_active = TRUE AND (access_end_date IS NULL OR access_end_date > NOW())))`);
      queryParams.push(targetUserId);
      paramIndex++;
    }

    if (equipmentFilter && equipmentFilter.length > 0) {
      whereClauses.push(`equipment::jsonb ?| ARRAY[${equipmentFilter.map((_, i) => `$${paramIndex + i}`).join(',')}]`);
      queryParams.push(...equipmentFilter);
      paramIndex += equipmentFilter.length;
    }

    if (muscleGroupFilter && muscleGroupFilter.length > 0) {
      whereClauses.push(`(primary_muscles::jsonb ?| ARRAY[${muscleGroupFilter.map((_, i) => `$${paramIndex + i}`).join(',')}] OR secondary_muscles::jsonb ?| ARRAY[${muscleGroupFilter.map((_, i) => `$${paramIndex + i}`).join(',')}])`);
      queryParams.push(...muscleGroupFilter);
      queryParams.push(...muscleGroupFilter); // Push twice for primary and secondary muscles
      paramIndex += (muscleGroupFilter.length * 2);
    }

    const countQuery = `
      SELECT COUNT(*)
      FROM exercises
      WHERE ${whereClauses.join(' AND ')}
    `;
    const result = await client.query(countQuery, queryParams);
    return parseInt(result.rows[0].count, 10);
  } finally {
    client.release();
  }
}

async function getDistinctEquipment() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT DISTINCT jsonb_array_elements_text(equipment::jsonb) AS equipment_name
       FROM exercises
       WHERE equipment IS NOT NULL AND equipment::jsonb IS NOT NULL AND jsonb_array_length(equipment::jsonb) > 0`
    );
    return result.rows.map(row => row.equipment_name);
  } finally {
    client.release();
  }
}

async function getDistinctMuscleGroups() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT DISTINCT muscle_name FROM (
         SELECT jsonb_array_elements_text(primary_muscles::jsonb) AS muscle_name
         FROM exercises
         WHERE primary_muscles IS NOT NULL AND primary_muscles::jsonb IS NOT NULL AND jsonb_array_length(primary_muscles::jsonb) > 0
         UNION
         SELECT jsonb_array_elements_text(secondary_muscles::jsonb) AS muscle_name
         FROM exercises
         WHERE secondary_muscles IS NOT NULL AND secondary_muscles::jsonb IS NOT NULL AND jsonb_array_length(secondary_muscles::jsonb) > 0
       ) AS distinct_muscles`
    );
    return result.rows.map(row => row.muscle_name);
  } finally {
    client.release();
  }
}

async function searchExercises(name, userId, equipmentFilter, muscleGroupFilter) {
  const client = await pool.connect();
  try {
    let whereClauses = ['1=1'];
    const queryParams = [];
    let paramIndex = 1;

    if (name) {
      whereClauses.push(`name ILIKE $${paramIndex}`);
      queryParams.push(`%${name}%`);
      paramIndex++;
    }

    whereClauses.push(`(is_custom = false OR user_id = $${paramIndex} OR source IS NOT NULL)`);
    queryParams.push(userId);
    paramIndex++;

    if (equipmentFilter && equipmentFilter.length > 0) {
      whereClauses.push(`equipment::jsonb ?| ARRAY[${equipmentFilter.map((_, i) => `$${paramIndex + i}`).join(',')}]`);
      queryParams.push(...equipmentFilter);
      paramIndex += equipmentFilter.length;
    }

    if (muscleGroupFilter && muscleGroupFilter.length > 0) {
      whereClauses.push(`(primary_muscles::jsonb ?| ARRAY[${muscleGroupFilter.map((_, i) => `$${paramIndex + i}`).join(',')}] OR secondary_muscles::jsonb ?| ARRAY[${muscleGroupFilter.map((_, i) => `$${paramIndex + i}`).join(',')}])`);
      queryParams.push(...muscleGroupFilter);
      queryParams.push(...muscleGroupFilter); // Push twice for primary and secondary muscles
      paramIndex += (muscleGroupFilter.length * 2);
    }

    const result = await client.query(
      `SELECT id, source, source_id, name, force, level, mechanic, equipment,
              primary_muscles, secondary_muscles, instructions, category, images,
              calories_per_hour, description, user_id, is_custom, shared_with_public
       FROM exercises
       WHERE ${whereClauses.join(' AND ')} LIMIT 50`, // Added a limit to prevent too many results
      queryParams
    );
    return result.rows.map(row => {
      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (e) {
          log('error', `Error parsing images for exercise ${row.id}:`, e);
          row.images = [];
        }
      }
      return row;
    });
  } finally {
    client.release();
  }
}

async function createExercise(exerciseData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO exercises (
        source, source_id, name, force, level, mechanic, equipment,
        primary_muscles, secondary_muscles, instructions, category, images,
        calories_per_hour, description, is_custom, user_id, shared_with_public,
        created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now(), now())
       RETURNING *`,
      [
        exerciseData.source,
        exerciseData.source_id,
        exerciseData.name,
        exerciseData.force,
        exerciseData.level,
        exerciseData.mechanic,
        exerciseData.equipment ? JSON.stringify(exerciseData.equipment) : null,
        exerciseData.primary_muscles ? JSON.stringify(exerciseData.primary_muscles) : null,
        exerciseData.secondary_muscles ? JSON.stringify(exerciseData.secondary_muscles) : null,
        exerciseData.instructions ? JSON.stringify(exerciseData.instructions) : null,
        exerciseData.category,
        exerciseData.images ? JSON.stringify(exerciseData.images) : null,
        exerciseData.calories_per_hour,
        exerciseData.description,
        exerciseData.is_custom,
        exerciseData.user_id,
        exerciseData.shared_with_public,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function createExerciseEntry(userId, entryData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO exercise_entries (user_id, exercise_id, duration_minutes, calories_burned, entry_date, notes, sets, reps, weight, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()) RETURNING *`,
      [
        userId,
        entryData.exercise_id,
        entryData.duration_minutes,
        entryData.calories_burned,
        entryData.entry_date,
        entryData.notes,
        entryData.sets || null,
        entryData.reps || null,
        entryData.weight || null,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getExerciseEntryById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM exercise_entries WHERE id = $1',
      [id]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getExerciseEntryOwnerId(id) {
  const client = await pool.connect();
  try {
    const entryResult = await client.query(
      'SELECT user_id FROM exercise_entries WHERE id = $1',
      [id]
    );
    return entryResult.rows[0]?.user_id;
  } finally {
    client.release();
  }
}

async function updateExerciseEntry(id, userId, updateData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE exercise_entries SET
        exercise_id = COALESCE($1, exercise_id),
        duration_minutes = COALESCE($2, duration_minutes),
        calories_burned = COALESCE($3, calories_burned),
        entry_date = COALESCE($4, entry_date),
        notes = COALESCE($5, notes),
        sets = COALESCE($6, sets),
        reps = COALESCE($7, reps),
        weight = COALESCE($8, weight),
        updated_at = now()
      WHERE id = $9 AND user_id = $10
      RETURNING *`,
      [
        updateData.exercise_id,
        updateData.duration_minutes,
        updateData.calories_burned,
        updateData.entry_date,
        updateData.notes,
        updateData.sets || null,
        updateData.reps || null,
        updateData.weight || null,
        id,
        userId,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function deleteExerciseEntry(id, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM exercise_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function updateExercise(id, userId, updateData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE exercises SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        calories_per_hour = COALESCE($3, calories_per_hour),
        description = COALESCE($4, description),
        is_custom = COALESCE($5, is_custom),
        shared_with_public = COALESCE($6, shared_with_public),
        force = COALESCE($7, force),
        level = COALESCE($8, level),
        mechanic = COALESCE($9, mechanic),
        equipment = COALESCE($10, equipment),
        primary_muscles = COALESCE($11, primary_muscles),
        secondary_muscles = COALESCE($12, secondary_muscles),
        instructions = COALESCE($13, instructions),
        images = COALESCE($14, images),
        updated_at = now()
      WHERE id = $15 AND user_id = $16
      RETURNING *`,
      [
        updateData.name,
        updateData.category,
        updateData.calories_per_hour,
        updateData.description,
        updateData.is_custom,
        updateData.shared_with_public,
        updateData.force,
        updateData.level,
        updateData.mechanic,
        updateData.equipment ? JSON.stringify(updateData.equipment) : null,
        updateData.primary_muscles ? JSON.stringify(updateData.primary_muscles) : null,
        updateData.secondary_muscles ? JSON.stringify(updateData.secondary_muscles) : null,
        updateData.instructions ? JSON.stringify(updateData.instructions) : null,
        updateData.images ? JSON.stringify(updateData.images) : null,
        id,
        userId
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function deleteExercise(id, userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM exercises WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

async function getExerciseEntriesByDate(userId, selectedDate) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         ee.id,
         ee.exercise_id,
         ee.duration_minutes,
         ee.calories_burned,
         ee.entry_date,
         ee.notes,
         ee.sets,
         ee.reps,
         ee.weight,
         e.name AS exercise_name,
         e.category AS exercise_category,
         e.calories_per_hour AS exercise_calories_per_hour,
         e.user_id AS exercise_user_id,
         e.source AS exercise_source,
         e.source_id AS exercise_source_id,
         e.force AS exercise_force,
         e.level AS exercise_level,
         e.mechanic AS exercise_mechanic,
         e.equipment AS exercise_equipment,
         e.primary_muscles AS exercise_primary_muscles,
         e.secondary_muscles AS exercise_secondary_muscles,
         e.instructions AS exercise_instructions,
         e.images AS exercise_images
       FROM exercise_entries ee
       JOIN exercises e ON ee.exercise_id = e.id
       WHERE ee.user_id = $1 AND ee.entry_date = $2`,
      [userId, selectedDate]
    );

    return result.rows.map(row => {
      if (row.exercise_images) {
        try {
          row.exercise_images = JSON.parse(row.exercise_images);
        } catch (e) {
          log('error', `Error parsing images for exercise entry ${row.id}:`, e);
          row.exercise_images = [];
        }
      }
      return {
        id: row.id,
        exercise_id: row.exercise_id,
        duration_minutes: row.duration_minutes,
        calories_burned: row.calories_burned,
        entry_date: row.entry_date,
        notes: row.notes,
        sets: row.sets,
        reps: row.reps,
        weight: row.weight,
        exercises: {
          id: row.exercise_id,
          name: row.exercise_name,
          category: row.exercise_category,
          calories_per_hour: row.exercise_calories_per_hour,
          user_id: row.exercise_user_id,
          source: row.exercise_source,
          source_id: row.exercise_source_id,
          force: row.exercise_force,
          level: row.exercise_level,
          mechanic: row.exercise_mechanic,
          equipment: row.exercise_equipment,
          primary_muscles: row.exercise_primary_muscles,
          secondary_muscles: row.exercise_secondary_muscles,
          instructions: row.exercise_instructions,
          images: row.exercise_images,
        },
      };
    });
  } finally {
    client.release();
  }
}

async function getRecentExercises(userId, limit) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        e.id, e.source, e.source_id, e.name, e.force, e.level, e.mechanic, e.equipment,
        e.primary_muscles, e.secondary_muscles, e.instructions, e.category, e.images,
        e.calories_per_hour, e.description, e.user_id, e.is_custom, e.shared_with_public,
        e.created_at, e.updated_at
      FROM exercise_entries ee
      JOIN exercises e ON ee.exercise_id = e.id
      WHERE ee.user_id = $1
      GROUP BY e.id, e.source, e.source_id, e.name, e.force, e.level, e.mechanic, e.equipment,
               e.primary_muscles, e.secondary_muscles, e.instructions, e.category, e.images,
               e.calories_per_hour, e.description, e.user_id, e.is_custom, e.shared_with_public,
               e.created_at, e.updated_at
      ORDER BY MAX(ee.entry_date) DESC, MAX(ee.created_at) DESC
      LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(row => {
      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (e) {
          log('error', `Error parsing images for exercise ${row.id}:`, e);
          row.images = [];
        }
      }
      return row;
    });
  } finally {
    client.release();
  }
}

async function getTopExercises(userId, limit) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        e.id, e.source, e.source_id, e.name, e.force, e.level, e.mechanic, e.equipment,
        e.primary_muscles, e.secondary_muscles, e.instructions, e.category, e.images,
        e.calories_per_hour, e.description, e.user_id, e.is_custom, e.shared_with_public,
        e.created_at, e.updated_at,
        COUNT(ee.exercise_id) AS usage_count
      FROM exercise_entries ee
      JOIN exercises e ON ee.exercise_id = e.id
      WHERE ee.user_id = $1
      GROUP BY e.id, e.source, e.source_id, e.name, e.force, e.level, e.mechanic, e.equipment,
               e.primary_muscles, e.secondary_muscles, e.instructions, e.category, e.images,
               e.calories_per_hour, e.description, e.user_id, e.is_custom, e.shared_with_public,
               e.created_at, e.updated_at
      ORDER BY usage_count DESC
      LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(row => {
      if (row.images) {
        try {
          row.images = JSON.parse(row.images);
        } catch (e) {
          log('error', `Error parsing images for exercise ${row.id}:`, e);
          row.images = [];
        }
      }
      return row;
    });
  } finally {
    client.release();
  }
}
async function getExerciseProgressData(userId, exerciseId, startDate, endDate) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         ee.entry_date,
         ee.sets,
         ee.reps,
         ee.weight,
         ee.calories_burned,
         ee.duration_minutes
       FROM exercise_entries ee
       WHERE ee.user_id = $1
         AND ee.exercise_id = $2
         AND ee.entry_date BETWEEN $3 AND $4
       ORDER BY ee.entry_date ASC`,
      [userId, exerciseId, startDate, endDate]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

module.exports = {
  getExerciseById,
  getExerciseOwnerId,
  getOrCreateActiveCaloriesExercise,
  upsertExerciseEntryData,
  getExercisesWithPagination,
  countExercises,
  getDistinctEquipment,
  getDistinctMuscleGroups,
  searchExercises,
  createExercise,
  createExerciseEntry,
  getExerciseEntryById,
  getExerciseEntryOwnerId,
  updateExerciseEntry,
  deleteExerciseEntry,
  updateExercise,
  deleteExercise,
  getExerciseEntriesByDate,
  getExerciseDeletionImpact,
  getRecentExercises,
  getTopExercises,
  getExerciseBySourceAndSourceId,
  getExerciseProgressData, // New export
};

async function getExerciseBySourceAndSourceId(source, sourceId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, source, source_id, name, force, level, mechanic, equipment,
              primary_muscles, secondary_muscles, instructions, category, images,
              calories_per_hour, description, user_id, is_custom, shared_with_public,
              created_at, updated_at
       FROM exercises WHERE source = $1 AND source_id = $2`,
      [source, sourceId]
    );
    const exercise = result.rows[0];
    if (exercise && exercise.images) {
      try {
        exercise.images = JSON.parse(exercise.images);
      } catch (e) {
        log('error', `Error parsing images for exercise ${exercise.id}:`, e);
        exercise.images = []; // Default to empty array on parse error
      }
    }
    return exercise;
  } finally {
    client.release();
  }
}

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