import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/contexts/PreferencesContext";
import { debug, error } from '@/utils/logging';
import { getExerciseHistory } from '@/services/exerciseEntryService'; // Assuming this service exists
import { ExerciseEntry } from '@/services/exerciseEntryService'; // Assuming ExerciseEntry interface is defined here

interface ExerciseHistoryDisplayProps {
  exerciseId: string;
  limit?: number;
}

const ExerciseHistoryDisplay: React.FC<ExerciseHistoryDisplayProps> = ({ exerciseId, limit = 5 }) => {
  const { user } = useAuth();
  const { loggingLevel } = usePreferences();
  const [history, setHistory] = useState<ExerciseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id || !exerciseId) return;
      setLoading(true);
      try {
        const fetchedHistory = await getExerciseHistory(exerciseId, limit);
        setHistory(fetchedHistory);
        debug(loggingLevel, `Fetched history for exercise ${exerciseId}:`, fetchedHistory);
      } catch (err) {
        error(loggingLevel, `Error fetching exercise history for ${exerciseId}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id, exerciseId, limit, loggingLevel]);

  if (loading) {
    return <p className="text-center text-muted-foreground">Loading history...</p>;
  }

  if (history.length === 0) {
    return <p className="text-center text-muted-foreground">No previous entries found for this exercise.</p>;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-md font-semibold">Last {limit} Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry, index) => (
            <div key={entry.id || index} className="border-b pb-2 last:border-b-0">
              <p className="text-sm font-medium">{new Date(entry.entry_date).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">
                {entry.sets && `Sets: ${entry.sets}`}
                {entry.reps && ` • Reps: ${entry.reps}`}
                {entry.weight && ` • Weight: ${entry.weight}`}
                {entry.duration_minutes && ` • Duration: ${entry.duration_minutes} min`}
                {entry.calories_burned && ` • Calories: ${Math.round(entry.calories_burned)}`}
              </p>
              {entry.notes && <p className="text-xs text-muted-foreground italic">Notes: {entry.notes}</p>}
              {entry.image_url && (
                <img src={entry.image_url} alt="Exercise" className="w-16 h-16 object-cover mt-1 rounded" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseHistoryDisplay;