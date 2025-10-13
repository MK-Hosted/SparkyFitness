
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast"; // Import toast
import { usePreferences } from "@/contexts/PreferencesContext";
import { debug, info, warn, error } from '@/utils/logging';
import {
  fetchExerciseDetails,
  updateExerciseEntry,
  ExerciseEntry,
} from '@/services/editExerciseEntryService';
import { WorkoutPresetSet } from "@/types/workout";


interface EditExerciseEntryDialogProps {
  entry: ExerciseEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const EditExerciseEntryDialog = ({ entry, open, onOpenChange, onSave }: EditExerciseEntryDialogProps) => {
 const { loggingLevel } = usePreferences();
 debug(loggingLevel, "EditExerciseEntryDialog: Component rendered for entry:", entry.id);

 const [duration, setDuration] = useState<number | undefined>(entry.duration_minutes);
 const [sets, setSets] = useState<WorkoutPresetSet[] | undefined>(entry.sets as WorkoutPresetSet[] | undefined);
 const [reps, setReps] = useState<number | undefined>(entry.reps);
 const [weight, setWeight] = useState<number | undefined>(entry.weight);
 const [notes, setNotes] = useState(entry.notes || "");
 const [imageUrl, setImageUrl] = useState(entry.image_url || "");
 const [loading, setLoading] = useState(false);

 useEffect(() => {
   debug(loggingLevel, "EditExerciseEntryDialog: entry useEffect triggered.", entry);
   setDuration(entry.duration_minutes);
   setSets(entry.sets as WorkoutPresetSet[] | undefined);
   setReps(entry.reps);
   setWeight(entry.weight);
   setNotes(entry.notes || "");
   setImageUrl(entry.image_url || "");
 }, [entry, loggingLevel]);

 const handleSave = async () => {
   info(loggingLevel, "EditExerciseEntryDialog: Attempting to save changes for entry:", entry.id);
   setLoading(true);
   
   try {
     // Fetch the exercise to get calories_per_hour for recalculation
     debug(loggingLevel, "EditExerciseEntryDialog: Fetching exercise details for recalculation:", entry.exercise_id);
     const exerciseData = await fetchExerciseDetails(entry.exercise_id);

     const caloriesPerHour = exerciseData?.calories_per_hour || 300;
     const caloriesBurned = (caloriesPerHour / 60) * duration;
     debug(loggingLevel, "EditExerciseEntryDialog: Recalculated calories burned:", caloriesBurned);

     await updateExerciseEntry(entry.id, {
       duration_minutes: duration,
       calories_burned: caloriesBurned,
       notes: notes,
       sets: sets,
       reps: reps,
       weight: weight,
       image_url: imageUrl,
     });

     info(loggingLevel, "EditExerciseEntryDialog: Exercise entry updated successfully:", entry.id);
     toast({
       title: "Success",
       description: "Exercise entry updated successfully.",
     });
     onSave();
     onOpenChange(false);
   } catch (err) {
     error(loggingLevel, "EditExerciseEntryDialog: Error updating exercise entry:", err);
     toast({
       title: "Error",
       description: "Failed to update exercise entry.",
       variant: "destructive",
     });
   } finally {
     setLoading(false);
     debug(loggingLevel, "EditExerciseEntryDialog: Loading state set to false.");
   }
 };

 return (
   <Dialog open={open} onOpenChange={(open) => {
     debug(loggingLevel, "EditExerciseEntryDialog: Dialog open state changed:", open);
     onOpenChange(open);
   }}>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>Edit Exercise Entry</DialogTitle>
         <DialogDescription>
           Make changes to your exercise entry here. Click save when you're done.
         </DialogDescription>
       </DialogHeader>
       
       <div className="space-y-4">
         <div>
           <Label htmlFor="exercise-name">Exercise</Label>
           <Input
             id="exercise-name"
             value={entry.exercises?.name || "Unknown Exercise"}
             disabled
             className="bg-gray-100 dark:bg-gray-800"
           />
         </div>
         
         <div>
           <Label htmlFor="duration">Duration (minutes)</Label>
           <Input
             id="duration"
             type="number"
             value={duration}
             onChange={(e) => {
               debug(loggingLevel, "EditExerciseEntryDialog: Duration input changed:", e.target.value);
               setDuration(Number(e.target.value));
             }}
             min="0"
           />
         </div>

         {/* The sets are now an array of objects, so we can't just display a single number.
             This part of the UI will need to be updated to handle multiple sets if that's the desired functionality.
             For now, I will just display the number of sets. */}
         <div>
           <Label htmlFor="sets">Sets</Label>
           <Input
             id="sets"
             type="number"
             value={sets?.length ?? ''}
             disabled
           />
         </div>

         <div>
           <Label htmlFor="reps">Reps</Label>
           <Input
             id="reps"
             type="number"
             value={reps ?? ''}
             onChange={(e) => setReps(Number(e.target.value) || undefined)}
             min="0"
           />
         </div>

         <div>
           <Label htmlFor="weight">Weight (kg/lbs)</Label>
           <Input
             id="weight"
             type="number"
             value={weight ?? ''}
             onChange={(e) => setWeight(Number(e.target.value) || undefined)}
             min="0"
             step="0.1"
           />
         </div>
         
         <div>
           <Label htmlFor="notes">Notes</Label>
           <Textarea
             id="notes"
             value={notes}
             onChange={(e) => {
               debug(loggingLevel, "EditExerciseEntryDialog: Notes input changed:", e.target.value);
               setNotes(e.target.value);
             }}
             placeholder="Add any notes about this exercise..."
           />
         </div>

         <div>
           <Label htmlFor="imageUrl">Image URL</Label>
           <Input
             id="imageUrl"
             type="text"
             value={imageUrl}
             onChange={(e) => setImageUrl(e.target.value)}
             placeholder="Optional image URL"
           />
         </div>
       </div>
       
       <div className="flex justify-end space-x-2 mt-6">
         <Button variant="outline" onClick={() => {
           debug(loggingLevel, "EditExerciseEntryDialog: Cancel button clicked.");
           onOpenChange(false);
         }}>
           Cancel
         </Button>
         <Button onClick={handleSave} disabled={loading}>
           {loading ? "Saving..." : "Save Changes"}
         </Button>
       </div>
     </DialogContent>
   </Dialog>
 );
};

export default EditExerciseEntryDialog;
