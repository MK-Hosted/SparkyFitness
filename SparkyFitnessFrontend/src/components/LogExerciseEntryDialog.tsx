import React, { useState, useEffect, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/contexts/PreferencesContext";
import { debug, info, warn, error } from '@/utils/logging';
import { Exercise } from '@/services/exerciseSearchService';
import { createExerciseEntry } from '@/services/exerciseEntryService';
import { useToast } from "@/hooks/use-toast";
import ExerciseHistoryDisplay from "./ExerciseHistoryDisplay"; // Import ExerciseHistoryDisplay

interface LogExerciseEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  selectedDate: string;
  onSaveSuccess: () => void;
  // New props for pre-population
  initialSets?: number;
  initialReps?: number;
  initialWeight?: number;
  initialDuration?: number; // Changed from initialDurationMinutes
  initialNotes?: string;
  initialImageUrl?: string;
}

const LogExerciseEntryDialog: React.FC<LogExerciseEntryDialogProps> = ({
  isOpen,
  onClose,
  exercise,
  selectedDate,
  onSaveSuccess,
  initialSets,
  initialReps,
  initialWeight,
  initialDuration, // Changed from initialDurationMinutes
  initialNotes,
  initialImageUrl,
}) => {
  const { loggingLevel } = usePreferences();
  const { toast } = useToast();

  const [durationMinutes, setDurationMinutes] = useState<number | string>(initialDuration ?? '');
  const [sets, setSets] = useState<number | string>(initialSets ?? '');
  const [reps, setReps] = useState<number | string>(initialReps ?? '');
  const [weight, setWeight] = useState<number | string>(initialWeight ?? '');
  const [notes, setNotes] = useState<string>(initialNotes ?? '');
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null); // State for the uploaded image file
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && exercise) {
      // Reset form or pre-populate when dialog opens
      setDurationMinutes(initialDuration ?? '');
      setSets(initialSets ?? '');
      setReps(initialReps ?? '');
      setWeight(initialWeight ?? '');
      setNotes(initialNotes ?? '');
      setImageUrl(initialImageUrl ?? '');
      setImageFile(null); // Reset image file
      debug(loggingLevel, `LogExerciseEntryDialog: Opened for exercise ${exercise.name} on ${selectedDate}`);
    }
  }, [isOpen, exercise, selectedDate, loggingLevel, initialSets, initialReps, initialWeight, initialDuration, initialNotes, initialImageUrl]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      // Optionally, you can create a local URL for previewing the image
      // setImageUrl(URL.createObjectURL(file)); // We will handle actual upload later
    } else {
      setImageFile(null);
      // setImageUrl('');
    }
  };

  const handleSave = async () => {
    if (!exercise) {
      warn(loggingLevel, "LogExerciseEntryDialog: Attempted to save without a selected exercise.");
      return;
    }

    setLoading(true);
    try {
      const entryData = {
        exercise_id: exercise.id,
        duration_minutes: typeof durationMinutes === 'number' ? durationMinutes : (parseFloat(durationMinutes as string) || undefined), // Optional
        sets: typeof sets === 'number' ? sets : (parseInt(sets as string) || undefined),
        reps: typeof reps === 'number' ? reps : (parseInt(reps as string) || undefined),
        weight: typeof weight === 'number' ? weight : (parseFloat(weight as string) || undefined),
        notes: notes,
        entry_date: selectedDate,
        calories_burned: 0, // Will be calculated by backend if not provided
        image_url: imageUrl, // Include image_url
        // For now, we'll pass the imageFile directly. The service will handle the upload.
        imageFile: imageFile,
      };

      await createExerciseEntry(entryData);
      info(loggingLevel, `LogExerciseEntryDialog: Exercise entry saved successfully for ${exercise.name}`);
      toast({
        title: "Success",
        description: `Exercise "${exercise.name}" logged successfully.`,
        variant: "default", // Changed to default as destructive is for errors
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
              placeholder="Optional"
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
              placeholder="Optional"
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
              placeholder="Optional"
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
              placeholder="Optional"
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="imageUrl" className="text-right">
              Image URL
            </Label>
            <Input
              id="imageUrl"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="col-span-3"
              placeholder="Optional image URL"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="imageUpload" className="text-right">
              Upload Image
            </Label>
            <Input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="col-span-3"
            />
          </div>
        </div>
        {exercise && <ExerciseHistoryDisplay exerciseId={exercise.id} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !exercise}>
            {loading ? "Saving..." : "Save Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogExerciseEntryDialog;