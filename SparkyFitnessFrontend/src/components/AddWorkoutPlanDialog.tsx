import React, { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkoutPlanTemplate, WorkoutPlanAssignment, WorkoutPreset } from "@/types/workout";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, X, Repeat, Weight, Timer, ListOrdered, CalendarDays } from "lucide-react";
import { getWorkoutPresets } from "@/services/workoutPresetService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadExercises } from "@/services/exerciseService";
import { Exercise } from "@/services/exerciseSearchService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import AddExerciseDialog from "@/components/AddExerciseDialog"; // Import the unified AddExerciseDialog

interface AddWorkoutPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newPlan: Omit<WorkoutPlanTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  initialData?: WorkoutPlanTemplate | null; // Optional: for editing existing plans
  onUpdate?: (planId: string, updatedPlan: Partial<WorkoutPlanTemplate>) => void; // Optional: for updating existing plans
}

const daysOfWeek = [
  { id: 0, name: "Sunday" },
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

const AddWorkoutPlanDialog: React.FC<AddWorkoutPlanDialogProps> = ({ isOpen, onClose, onSave, initialData, onUpdate }) => {
  const { user } = useAuth();
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [assignments, setAssignments] = useState<WorkoutPlanAssignment[]>([]);
  const [workoutPresets, setWorkoutPresets] = useState<WorkoutPreset[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false); // Unified dialog state
  const [selectedDayForAssignment, setSelectedDayForAssignment] = useState<number | null>(null); // Unified selected day

  useEffect(() => {
    if (isOpen) {
      if (user?.id) {
        fetchPresetsAndExercises();
      }

      if (initialData) {
        setPlanName(initialData.plan_name);
        setDescription(initialData.description);
        setStartDate(initialData.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '');
        setEndDate(initialData.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '');
        setIsActive(initialData.is_active);
        setAssignments(initialData.assignments || []);
      } else {
        // For new plan, set default dates
        setPlanName("");
        setDescription("");
        setStartDate(new Date().toISOString().split('T')[0]);
        const today = new Date();
        today.setDate(today.getDate() + 7);
        setEndDate(today.toISOString().split('T')[0]);
        setIsActive(true);
        setAssignments([]);
      }
    } else {
      // Reset all states when dialog closes
      setPlanName("");
      setDescription("");
      setStartDate(new Date().toISOString().split('T')[0]);
      const today = new Date();
      today.setDate(today.getDate() + 7);
      setEndDate(today.toISOString().split('T')[0]);
      setIsActive(true);
      setAssignments([]);
    }
  }, [isOpen, user?.id, initialData]);

  const fetchPresetsAndExercises = async () => {
    if (!user?.id) return;
    try {
      const [presets, { exercises: fetchedExercises }] = await Promise.all([
        getWorkoutPresets(),
        loadExercises(user.id),
      ]);
      setWorkoutPresets(presets);
      setExercises(fetchedExercises);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workout presets or exercises.",
        variant: "destructive",
      });
      console.error("Error fetching presets or exercises:", error);
    }
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAssignmentChange = (
    index: number,
    field: keyof WorkoutPlanAssignment,
    value: string | number | undefined
  ) => {
    setAssignments((prev) =>
      prev.map((assignment, i) =>
        i === index
          ? {
              ...assignment,
              [field]: value,
            }
          : assignment
      )
    );
  };

  const handleAddExerciseOrPreset = (
    item: Exercise | WorkoutPreset,
    sourceMode: 'internal' | 'external' | 'custom' | 'preset'
  ) => {
    if (selectedDayForAssignment !== null) {
      if (sourceMode === 'preset') {
        const preset = item as WorkoutPreset;
        setAssignments((prev) => [
          ...prev,
          {
            day_of_week: selectedDayForAssignment,
            template_id: '',
            workout_preset_id: preset.id,
            exercise_id: undefined,
          },
        ]);
      } else {
        const exercise = item as Exercise;
        setAssignments((prev) => [
          ...prev,
          {
            day_of_week: selectedDayForAssignment,
            template_id: '',
            workout_preset_id: undefined,
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            sets: 1,
            reps: 10,
            weight: 0,
            duration: 0,
            notes: "",
          },
        ]);
      }
      setIsAddExerciseDialogOpen(false);
      setSelectedDayForAssignment(null);
    }
  };

  const handleClearPreset = (assignmentIndex: number) => {
    setAssignments((prev) =>
      prev.map((assignment, i) =>
        i === assignmentIndex
          ? { ...assignment, workout_preset_id: undefined }
          : assignment
      )
    );
  };

  const handleSave = () => {
    if (planName.trim() === "" || startDate.trim() === "") {
      toast({
        title: "Validation Error",
        description: "Plan Name and Start Date are required.",
        variant: "destructive",
      });
      return;
    }

    const assignmentsToSave = assignments.filter(
      (assignment) => assignment.workout_preset_id || assignment.exercise_id
    );

    const planData = {
      plan_name: planName,
      description: description,
      start_date: startDate,
      end_date: endDate || null,
      is_active: isActive,
      assignments: assignmentsToSave,
    };

    if (initialData && onUpdate) {
      onUpdate(initialData.id, planData);
    } else if (onSave) {
      onSave(planData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <TooltipProvider>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Workout Plan" : "Add New Workout Plan"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Edit the details for your workout plan and its assignments." : "Enter the details for your new workout plan and assign workouts to days."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="planName">
              Plan Name
            </Label>
            <Input
              id="planName"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date
              </Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pr-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pr-8"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="isActive">
              Set as active plan
            </Label>
          </div>

          <div className="space-y-4">
            <h4 className="mb-2 text-lg font-medium">Assignments</h4>
            {daysOfWeek.map((day) => (
              <Card key={day.id}>
                <CardHeader>
                  <CardTitle>{day.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {assignments
                      .filter((assignment) => assignment.day_of_week === day.id)
                      .map((assignment, index) => (
                         <div key={index} className="flex items-center space-x-2">
                           {assignment.workout_preset_id !== undefined && assignment.workout_preset_id !== null ? (
                             <div className="flex-grow space-y-2">
                               <div className="flex items-center justify-between">
                                 <span className="font-medium">
                                   {workoutPresets.find(p => p.id === assignment.workout_preset_id)?.name || "No Preset Selected"}
                                 </span>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => handleClearPreset(assignments.indexOf(assignment))}
                                 >
                                   <X className="h-4 w-4" />
                                 </Button>
                               </div>
                               {assignment.workout_preset_id && workoutPresets.find(p => p.id === assignment.workout_preset_id)?.exercises.map((ex, exIndex) => (
                                 <div key={exIndex} className="flex items-center space-x-2 text-sm text-muted-foreground ml-4">
                                   <span className="font-medium">{ex.exercise_name}</span>
                                   {ex.sets > 0 && (
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <span className="flex items-center">
                                           <ListOrdered className="h-3 w-3 mr-1" /> {ex.sets}
                                         </span>
                                       </TooltipTrigger>
                                       <TooltipContent>Sets</TooltipContent>
                                     </Tooltip>
                                   )}
                                   {ex.reps > 0 && (
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <span className="flex items-center">
                                           <Repeat className="h-3 w-3 mr-1" /> {ex.reps}
                                         </span>
                                       </TooltipTrigger>
                                       <TooltipContent>Reps</TooltipContent>
                                     </Tooltip>
                                   )}
                                   {ex.weight > 0 && (
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <span className="flex items-center">
                                           <Weight className="h-3 w-3 mr-1" /> {ex.weight}
                                         </span>
                                       </TooltipTrigger>
                                       <TooltipContent>Weight</TooltipContent>
                                     </Tooltip>
                                   )}
                                   {ex.duration > 0 && (
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <span className="flex items-center">
                                           <Timer className="h-3 w-3 mr-1" /> {ex.duration} min
                                         </span>
                                       </TooltipTrigger>
                                       <TooltipContent>Duration (minutes)</TooltipContent>
                                     </Tooltip>
                                   )}
                                 </div>
                                ))}
                             </div>
                           ) : (
                             <div className="flex-grow space-y-2">
                               <div className="flex items-center justify-between">
                                 <span className="font-medium">
                                   {assignment.exercise_name || exercises.find(ex => ex.id === assignment.exercise_id)?.name || "No Exercise Selected"}
                                 </span>
                                 <Button variant="ghost" size="icon" onClick={() => handleRemoveAssignment(assignments.indexOf(assignment))}>
                                   <X className="h-4 w-4" />
                                 </Button>
                               </div>
                               {assignment.exercise_id && (
                                 <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground ml-4">
                                   <div className="flex items-center gap-2">
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <ListOrdered className="h-3 w-3" />
                                       </TooltipTrigger>
                                       <TooltipContent>Sets</TooltipContent>
                                     </Tooltip>
                                     <div className="flex-1">
                                       <Label htmlFor={`sets-${assignments.indexOf(assignment)}`}>Sets</Label>
                                       <Input
                                         id={`sets-${assignments.indexOf(assignment)}`}
                                         type="number"
                                         value={assignment.sets ?? ''}
                                         onChange={(e) => handleAssignmentChange(assignments.indexOf(assignment), "sets", Number(e.target.value))}
                                         min="0"
                                       />
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <Repeat className="h-3 w-3" />
                                       </TooltipTrigger>
                                       <TooltipContent>Reps</TooltipContent>
                                     </Tooltip>
                                     <div className="flex-1">
                                       <Label htmlFor={`reps-${assignments.indexOf(assignment)}`}>Reps</Label>
                                       <Input
                                         id={`reps-${assignments.indexOf(assignment)}`}
                                         type="number"
                                         value={assignment.reps ?? ''}
                                         onChange={(e) => handleAssignmentChange(assignments.indexOf(assignment), "reps", Number(e.target.value))}
                                         min="0"
                                       />
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <Weight className="h-3 w-3" />
                                       </TooltipTrigger>
                                       <TooltipContent>Weight</TooltipContent>
                                     </Tooltip>
                                     <div className="flex-1">
                                       <Label htmlFor={`weight-${assignments.indexOf(assignment)}`}>Weight</Label>
                                       <Input
                                         id={`weight-${assignments.indexOf(assignment)}`}
                                         type="number"
                                         value={assignment.weight ?? ''}
                                         onChange={(e) => handleAssignmentChange(assignments.indexOf(assignment), "weight", Number(e.target.value))}
                                         min="0"
                                         step="0.1"
                                       />
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <Timer className="h-3 w-3" />
                                       </TooltipTrigger>
                                       <TooltipContent>Duration (minutes)</TooltipContent>
                                     </Tooltip>
                                     <div className="flex-1">
                                       <Label htmlFor={`duration-${assignments.indexOf(assignment)}`}>Duration (min)</Label>
                                       <Input
                                         id={`duration-${assignments.indexOf(assignment)}`}
                                         type="number"
                                         value={assignment.duration ?? ''}
                                         onChange={(e) => handleAssignmentChange(assignments.indexOf(assignment), "duration", Number(e.target.value))}
                                         min="0"
                                       />
                                     </div>
                                   </div>
                                   <div className="col-span-2">
                                     <Label htmlFor={`notes-${assignments.indexOf(assignment)}`}>Notes</Label>
                                     <Textarea
                                       id={`notes-${assignments.indexOf(assignment)}`}
                                       value={assignment.notes ?? ''}
                                       onChange={(e) => handleAssignmentChange(assignments.indexOf(assignment), "notes", e.target.value)}
                                       placeholder="Add notes for this exercise"
                                     />
                                   </div>
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                       ))}
                   </div>
                   <div className="flex space-x-2 mt-4">
                     <Button variant="outline" size="sm" onClick={() => {
                       setSelectedDayForAssignment(day.id);
                       setIsAddExerciseDialogOpen(true);
                     }}>
                       <Plus className="h-4 w-4 mr-2" /> Add Exercise/Preset
                     </Button>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
         <DialogFooter>
           <DialogClose asChild>
             <Button variant="outline" onClick={onClose}>Cancel</Button>
           </DialogClose>
           <Button onClick={handleSave}>Save Plan</Button>
         </DialogFooter>
       </DialogContent>
 
       <AddExerciseDialog
         open={isAddExerciseDialogOpen}
         onOpenChange={setIsAddExerciseDialogOpen}
         onExerciseAdded={(exercise, sourceMode) => handleAddExerciseOrPreset(exercise, sourceMode)}
         onWorkoutPresetSelected={(preset) => handleAddExerciseOrPreset(preset, 'preset')}
         mode="workout-plan"
       />
      </TooltipProvider>
    </Dialog>
    );
  };

export default AddWorkoutPlanDialog;