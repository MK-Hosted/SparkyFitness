const { getPool } = require('../db/poolManager');
const { log } = require('../config/logging');
const format = require('pg-format');

async function createWorkoutPlanTemplate(planData) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const insertTemplateQuery = `
            INSERT INTO workout_plan_templates (user_id, plan_name, description, start_date, end_date, is_active)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const templateValues = [
            planData.user_id,
            planData.plan_name ?? '',
            planData.description ?? '',
            planData.start_date ?? new Date(),
            planData.end_date,
            planData.is_active ?? false
        ];
        
        const templateResult = await client.query(insertTemplateQuery, templateValues);
        const newTemplate = templateResult.rows[0];

        if (planData.assignments && planData.assignments.length > 0) {
            const assignmentValues = planData.assignments.map(a => {
                return [newTemplate.id, a.day_of_week, a.workout_preset_id, a.exercise_id, a.sets, a.reps, a.weight, a.duration, a.notes, 'now()', 'now()'];
            });
            const assignmentQuery = format(
                `INSERT INTO workout_plan_template_assignments (template_id, day_of_week, workout_preset_id, exercise_id, sets, reps, weight, duration, notes, created_at, updated_at) VALUES %L`,
                assignmentValues
            );
            await client.query(assignmentQuery);
        }

        await client.query('COMMIT');
        const finalQuery = `
            SELECT
                t.*,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', a.id,
                                'day_of_week', a.day_of_week,
                                'workout_preset_id', a.workout_preset_id,
                                'workout_preset_name', wp.name,
                                'exercise_id', a.exercise_id,
                                'exercise_name', e.name,
                                'sets', a.sets,
                                'reps', a.reps,
                                'weight', a.weight,
                                'duration', a.duration,
                                'notes', a.notes
                            )
                        )
                        FROM workout_plan_template_assignments a
                        LEFT JOIN workout_presets wp ON a.workout_preset_id = wp.id
                        LEFT JOIN exercises e ON a.exercise_id = e.id
                        WHERE a.template_id = t.id
                    ),
                    '[]'::json
                ) as assignments
            FROM workout_plan_templates t
            WHERE t.id = $1
        `;
        const finalResult = await client.query(finalQuery, [newTemplate.id]);
        return finalResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        log('error', `Error creating workout plan template: ${error.message}`, error);
        throw error;
    } finally {
        client.release();
    }
}

async function getWorkoutPlanTemplatesByUserId(userId) {
    const client = await getPool().connect();
    try {
        const query = `
            SELECT
                t.*,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', a.id,
                                'day_of_week', a.day_of_week,
                                'workout_preset_id', a.workout_preset_id,
                                'workout_preset_name', wp.name,
                                'exercise_id', a.exercise_id,
                                'exercise_name', e.name,
                                'sets', a.sets,
                                'reps', a.reps,
                                'weight', a.weight,
                                'duration', a.duration,
                                'notes', a.notes
                            )
                        )
                        FROM workout_plan_template_assignments a
                        LEFT JOIN workout_presets wp ON a.workout_preset_id = wp.id
                        LEFT JOIN exercises e ON a.exercise_id = e.id
                        WHERE a.template_id = t.id
                    ),
                    '[]'::json
                ) as assignments
            FROM workout_plan_templates t
            WHERE t.user_id = $1
            ORDER BY t.start_date DESC
        `;
        const result = await client.query(query, [userId]);
        return result.rows;
    } finally {
        client.release();
    }
}

async function getWorkoutPlanTemplateById(templateId) {
    const client = await getPool().connect();
    try {
        const query = `
            SELECT
                t.*,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', a.id,
                                'day_of_week', a.day_of_week,
                                'workout_preset_id', a.workout_preset_id,
                                'workout_preset_name', wp.name,
                                'exercise_id', a.exercise_id,
                                'exercise_name', e.name,
                                'sets', a.sets,
                                'reps', a.reps,
                                'weight', a.weight,
                                'duration', a.duration,
                                'notes', a.notes
                            )
                        )
                        FROM workout_plan_template_assignments a
                        LEFT JOIN workout_presets wp ON a.workout_preset_id = wp.id
                        LEFT JOIN exercises e ON a.exercise_id = e.id
                        WHERE a.template_id = t.id
                    ),
                    '[]'::json
                ) as assignments
            FROM workout_plan_templates t
            WHERE t.id = $1
        `;
        const result = await client.query(query, [templateId]);
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function updateWorkoutPlanTemplate(templateId, userId, updateData) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const templateResult = await client.query(
            `UPDATE workout_plan_templates SET
                plan_name = $1, description = $2, start_date = $3, end_date = $4, is_active = $5, updated_at = now()
             WHERE id = $6 AND user_id = $7 RETURNING *`,
            [
                updateData.plan_name ?? '',
                updateData.description ?? '',
                updateData.start_date ?? new Date(),
                updateData.end_date,
                updateData.is_active ?? false,
                templateId,
                userId
            ]
        );
        const updatedTemplate = templateResult.rows[0];

        await client.query('DELETE FROM workout_plan_template_assignments WHERE template_id = $1', [templateId]);

        if (updateData.assignments && updateData.assignments.length > 0) {
            const assignmentValues = updateData.assignments.map(a => {
                return [templateId, a.day_of_week, a.workout_preset_id, a.exercise_id, a.sets, a.reps, a.weight, a.duration, a.notes, 'now()', 'now()'];
            });
            const assignmentQuery = format(
                `INSERT INTO workout_plan_template_assignments (template_id, day_of_week, workout_preset_id, exercise_id, sets, reps, weight, duration, notes, created_at, updated_at) VALUES %L`,
                assignmentValues
            );
            await client.query(assignmentQuery);
        }

        await client.query('COMMIT');
        const finalQuery = `
            SELECT
                t.*,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', a.id,
                                'day_of_week', a.day_of_week,
                                'workout_preset_id', a.workout_preset_id,
                                'workout_preset_name', wp.name,
                                'exercise_id', a.exercise_id,
                                'exercise_name', e.name,
                                'sets', a.sets,
                                'reps', a.reps,
                                'weight', a.weight,
                                'duration', a.duration,
                                'notes', a.notes
                            )
                        )
                        FROM workout_plan_template_assignments a
                        LEFT JOIN workout_presets wp ON a.workout_preset_id = wp.id
                        LEFT JOIN exercises e ON a.exercise_id = e.id
                        WHERE a.template_id = t.id
                    ),
                    '[]'::json
                ) as assignments
            FROM workout_plan_templates t
            WHERE t.id = $1
        `;
        const finalResult = await client.query(finalQuery, [templateId]);
        return finalResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        log('error', `Error updating workout plan template ${templateId}: ${error.message}`, error);
        throw error;
    } finally {
        client.release();
    }
}

async function deleteWorkoutPlanTemplate(templateId, userId) {
    const client = await getPool().connect();
    try {
        const result = await client.query(
            `DELETE FROM workout_plan_templates WHERE id = $1 AND user_id = $2 RETURNING *`,
            [templateId, userId]
        );
        return result.rows[0];
    } catch (error) {
        log('error', `Error deleting workout plan template ${templateId}: ${error.message}`, error);
        throw error;
    } finally {
        client.release();
    }
}

async function getWorkoutPlanTemplateOwnerId(templateId) {
    const client = await getPool().connect();
    try {
        const result = await client.query(
            `SELECT user_id FROM workout_plan_templates WHERE id = $1`,
            [templateId]
        );
        return result.rows[0]?.user_id;
    } finally {
        client.release();
    }
}

async function getActiveWorkoutPlanForDate(userId, date) {
    const client = await getPool().connect();
    try {
        const query = `
            SELECT
                t.*,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', a.id,
                                'day_of_week', a.day_of_week,
                                'workout_preset_id', a.workout_preset_id,
                                'workout_preset_name', wp.name,
                                'exercise_id', a.exercise_id,
                                'exercise_name', e.name,
                                'sets', a.sets,
                                'reps', a.reps,
                                'weight', a.weight,
                                'duration', a.duration,
                                'notes', a.notes
                            )
                        )
                        FROM workout_plan_template_assignments a
                        LEFT JOIN workout_presets wp ON a.workout_preset_id = wp.id
                        LEFT JOIN exercises e ON a.exercise_id = e.id
                        WHERE a.template_id = t.id
                    ),
                    '[]'::json
                ) as assignments
            FROM workout_plan_templates t
            WHERE t.user_id = $1
              AND t.is_active = TRUE
              AND t.start_date <= $2
              AND (t.end_date IS NULL OR t.end_date >= $2)
            ORDER BY t.start_date DESC
            LIMIT 1
        `;
        const result = await client.query(query, [userId, date]);
        return result.rows[0];
    } finally {
        client.release();
    }
}

module.exports = {
    createWorkoutPlanTemplate,
    getWorkoutPlanTemplatesByUserId,
    getWorkoutPlanTemplateById,
    updateWorkoutPlanTemplate,
    deleteWorkoutPlanTemplate,
    getWorkoutPlanTemplateOwnerId,
    getActiveWorkoutPlanForDate,
};