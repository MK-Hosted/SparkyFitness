import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/contexts/PreferencesContext";
import { debug, info, warn, error } from '@/utils/logging';
import { Exercise } from '@/services/exerciseSearchService';
import { createExerciseEntry } from '@/services/exerciseEntryService'; // Assuming this service exists or will be created
import { useToast } from "@/hooks/use-toast";

interface LogExerciseEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  selectedDate: string;
  onSaveSuccess: () => void;
}

const LogExerciseEntryDialog: React.FC<LogExerciseEntryDialogProps> = ({
  isOpen,
  onClose,
  exercise,
  selectedDate,
  onSaveSuccess,
}) => {
  const { loggingLevel } = usePreferences();
  const { toast } = useToast();

  const [durationMinutes, setDurationMinutes] = useState<number | string>('');
  const [sets, setSets] = useState<number | string>('');
  const [reps, setReps] = useState<number | string>('');
  const [weight, setWeight] = useState<number | string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && exercise) {
      // Reset form when dialog opens for a new exercise
      setDurationMinutes('');
      setSets('');
      setReps('');
      setWeight('');
      setNotes('');
      debug(loggingLevel, `LogExerciseEntryDialog: Opened for exercise ${exercise.name} on ${selectedDate}`);
    }
  }, [isOpen, exercise, selectedDate, loggingLevel]);

  const handleSave = async () => {
    if (!exercise) {
      warn(loggingLevel, "LogExerciseEntryDialog: Attempted to save without a selected exercise.");
      return;
    }

    setLoading(true);
    try {
      const entryData = {
        exercise_id: exercise.id,
        duration_minutes: typeof durationMinutes === 'number' ? durationMinutes : parseFloat(durationMinutes as string) || 0,
        sets: typeof sets === 'number' ? sets : parseInt(sets as string) || null,
        reps: typeof reps === 'number' ? reps : parseInt(reps as string) || null,
        weight: typeof weight === 'number' ? weight : parseFloat(weight as string) || null,
        notes: notes,
        entry_date: selectedDate,
        calories_burned: 0, // Will be calculated by backend if not provided
      };

      await createExerciseEntry(entryData);
      info(loggingLevel, `LogExerciseEntryDialog: Exercise entry saved successfully for ${exercise.name}`);
      toast({
        title: "Success",
        description: `Exercise "${exercise.name}" logged successfully.`,
      });
      onSaveSuccess();
      onClose();
    } catch (err) {
      error(loggingLevel, "LogExerciseEntryDialog: Error saving exercise entry:", err);
      toast({
        title: "Error",
        description: `Failed to log exercise: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Exercise: {exercise?.name}</DialogTitle>
          <DialogDescription>
            Enter details for your exercise session on {selectedDate}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sets" className="text-right">
              Sets
            </Label>
            <Input
              id="sets"
              type="number"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reps" className="text-right">
              Reps
            </Label>
            <Input
              id="reps"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight" className="text-right">
              Weight (kg/lbs)
            </Label>
            <Input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="col-span-3"
              min="0"
              step="0.1"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Any additional notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !exercise || !durationMinutes}>
            {loading ? "Saving..." : "Save Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogExerciseEntryDialog;