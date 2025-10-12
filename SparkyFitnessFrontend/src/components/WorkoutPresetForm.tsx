import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WorkoutPreset, WorkoutPresetExercise } from "@/types/workout";
import { Exercise } from "@/services/exerciseService";
import AddExerciseDialog from "./AddExerciseDialog"; // Import AddExerciseDialog
import { Plus, X, Repeat, Weight, Timer, ListOrdered } from "lucide-react"; // Added Repeat, Weight, Timer, ListOrdered
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { debug } from "@/utils/logging";

interface WorkoutPresetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preset: Omit<WorkoutPreset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  initialPreset?: WorkoutPreset | null;
}

const WorkoutPresetForm: React.FC<WorkoutPresetFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPreset,
}) => {
  const { loggingLevel } = usePreferences();
  const { toast } = useToast(); // Initialize toast
  const [name, setName] = useState(initialPreset?.name || "");
  const [description, setDescription] = useState(initialPreset?.description || "");
  const [isPublic, setIsPublic] = useState(initialPreset?.is_public || false);
  const [exercises, setExercises] = useState<WorkoutPresetExercise[]>(
    initialPreset?.exercises?.map(ex => ({ ...ex, exercise: undefined })) || []
  );
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false); // State for AddExerciseDialog

  useEffect(() => {
    if (isOpen) {
      setName(initialPreset?.name || "");
      setDescription(initialPreset?.description || "");
      setIsPublic(initialPreset?.is_public || false);
      setExercises(initialPreset?.exercises?.map(ex => ({ ...ex, exercise: undefined })) || []);
    }
  }, [isOpen, initialPreset]);

  const handleAddExercise = (exercise: Exercise, sourceMode: 'internal' | 'external' | 'custom') => {
    debug(loggingLevel, `WorkoutPresetForm: Adding exercise from ${sourceMode}:`, exercise);
    setExercises((prev) => {
      const newExercise: WorkoutPresetExercise = {
        exercise_id: exercise.id,
        exercise_name: exercise.name, // Store name for display
        sets: 1,
        reps: 10,
        weight: 0,
        duration: 0, // Initialize duration
        notes: "", // Initialize notes
        image_url: exercise.images && exercise.images.length > 0 ? exercise.images[0] : "", // Use first image if available
        exercise: exercise, // Store full exercise object for details
      };
      return [...prev, newExercise];
    });
    setIsAddExerciseDialogOpen(false); // Close the dialog after adding
  };

  const handleRemoveExercise = (index: number) => {
    debug(loggingLevel, "WorkoutPresetForm: Removing exercise at index:", index);
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (
    index: number,
    field: keyof WorkoutPresetExercise,
    value: any,
  ) => {
    debug(loggingLevel, `WorkoutPresetForm: Changing exercise field ${String(field)} for index ${index} to ${value}`);
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex,
      ),
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Preset Name is required.",
        variant: "destructive",
      });
      return;
    }
    debug(loggingLevel, "WorkoutPresetForm: Submitting preset with data:", { name, description, isPublic, exercises });
    onSave({ name, description, is_public: isPublic, exercises });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialPreset ? "Edit Workout Preset" : "Create New Workout Preset"}</DialogTitle>
          <DialogDescription>
            {initialPreset ? "Edit the details of your workout preset." : "Create a new workout preset by providing a name, description, and exercises."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto max-h-full">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="isPublic">Share with Public</Label>
          </div>

          <div className="col-span-4">
            <h3 className="text-lg font-semibold mb-2">Exercises</h3>
            <Button type="button" onClick={() => setIsAddExerciseDialogOpen(true)} className="mb-4">
              <Plus className="h-4 w-4 mr-2" /> Add Exercise
            </Button>

            <AddExerciseDialog
              open={isAddExerciseDialogOpen}
              onOpenChange={setIsAddExerciseDialogOpen}
              onExerciseAdded={handleAddExercise} // Pass the handler to receive the selected/created exercise
              mode="preset" // Pass the mode prop
            />

            <div className="space-y-2">
              {exercises.map((ex, index) => (
                <div key={index} className="flex items-center space-x-2 border p-2 rounded-md">
                  <div className="flex-grow grid grid-cols-4 gap-2">
                    <Label className="col-span-4 font-medium">{ex.exercise_name}</Label>
                    <div>
                      <Label htmlFor={`sets-${index}`} className="flex items-center gap-1">
                        <ListOrdered className="h-4 w-4 text-blue-500" /> Sets
                      </Label>
                      <Input
                        id={`sets-${index}`}
                        type="number"
                        value={ex.sets ?? ''}
                        onChange={(e) => handleExerciseChange(index, "sets", Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`reps-${index}`} className="flex items-center gap-1">
                        <Repeat className="h-4 w-4 text-green-500" /> Reps
                      </Label>
                      <Input
                        id={`reps-${index}`}
                        type="number"
                        value={ex.reps ?? ''}
                        onChange={(e) => handleExerciseChange(index, "reps", Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`weight-${index}`} className="flex items-center gap-1">
                        <Weight className="h-4 w-4 text-yellow-500" /> Weight
                      </Label>
                      <Input
                        id={`weight-${index}`}
                        type="number"
                        value={ex.weight ?? ''}
                        onChange={(e) => handleExerciseChange(index, "weight", Number(e.target.value))}
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`duration-${index}`} className="flex items-center gap-1">
                        <Timer className="h-4 w-4 text-red-500" /> Duration (min)
                      </Label>
                      <Input
                        id={`duration-${index}`}
                        type="number"
                        value={ex.duration ?? ''}
                        onChange={(e) => handleExerciseChange(index, "duration", Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label htmlFor={`notes-${index}`}>Notes</Label>
                      <Textarea
                        id={`notes-${index}`}
                        value={ex.notes ?? ''}
                        onChange={(e) => handleExerciseChange(index, "notes", e.target.value)}
                        placeholder="Add notes for this exercise"
                      />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveExercise(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialPreset ? "Save Changes" : "Create Preset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutPresetForm;