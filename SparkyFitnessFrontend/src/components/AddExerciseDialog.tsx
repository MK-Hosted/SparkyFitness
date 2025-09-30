import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExerciseSearch from "./ExerciseSearch";
import { createExercise, Exercise } from "@/services/exerciseService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { PlusCircle, XCircle } from "lucide-react";

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExerciseAdded: () => void;
}

const AddExerciseDialog = ({ open, onOpenChange, onExerciseAdded }: AddExerciseDialogProps) => {
  const { user } = useAuth();
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState("general");
  const [newExerciseCalories, setNewExerciseCalories] = useState(300); // Default calculated calories
  const [manualCaloriesPerHour, setManualCaloriesPerHour] = useState<number | undefined>(undefined); // For manual override
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [newExerciseSource, setNewExerciseSource] = useState("custom"); // Default to "custom"
  const [newExerciseForce, setNewExerciseForce] = useState("");
  const [newExerciseLevel, setNewExerciseLevel] = useState("");
  const [newExerciseMechanic, setNewExerciseMechanic] = useState("");
  const [newExerciseEquipment, setNewExerciseEquipment] = useState("");
  const [newExercisePrimaryMuscles, setNewExercisePrimaryMuscles] = useState("");
  const [newExerciseSecondaryMuscles, setNewExerciseSecondaryMuscles] = useState("");
  const [newExerciseInstructions, setNewExerciseInstructions] = useState("");
  const [newExerciseImages, setNewExerciseImages] = useState<File[]>([]); // State to hold image files
  const [newExerciseImageUrls, setNewExerciseImageUrls] = useState<string[]>([]); // State to hold image URLs for display
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null); // For reordering

  const handleExerciseSelect = (exercise: Exercise) => {
    toast({
      title: "Success",
      description: `${exercise.name} added to your exercises.`,
    });
    onExerciseAdded();
    onOpenChange(false);
  };

  const handleAddCustomExercise = async () => {
    if (!user) return;
    try {
      const newExercise = {
        name: newExerciseName,
        category: newExerciseCategory,
        calories_per_hour: manualCaloriesPerHour !== undefined ? manualCaloriesPerHour : newExerciseCalories, // Use manual if provided
        description: newExerciseDescription,
        user_id: user.id,
        is_custom: true,
        source: newExerciseSource,
        force: newExerciseForce,
        level: newExerciseLevel,
        mechanic: newExerciseMechanic,
        equipment: newExerciseEquipment.split(',').map(s => s.trim()).filter(s => s),
        primary_muscles: newExercisePrimaryMuscles.split(',').map(s => s.trim()).filter(s => s),
        secondary_muscles: newExerciseSecondaryMuscles.split(',').map(s => s.trim()).filter(s => s),
        instructions: newExerciseInstructions.split('\n').map(s => s.trim()).filter(s => s),
        // images: newExerciseImageUrls, // Do not send URLs to backend, server will handle based on uploaded files
      };

      const formData = new FormData();
      formData.append('exerciseData', JSON.stringify(newExercise));
      newExerciseImages.forEach((file) => {
        formData.append('images', file);
      });

      await createExercise(formData);
      toast({
        title: "Success",
        description: "Exercise added successfully",
      });
      onExerciseAdded();
      onOpenChange(false);
      setNewExerciseName("");
      setNewExerciseCategory("general");
      setNewExerciseCalories(300);
      setNewExerciseDescription("");
      setNewExerciseSource("custom");
      setNewExerciseForce("");
      setNewExerciseLevel("");
      setNewExerciseMechanic("");
      setNewExerciseEquipment("");
      setNewExercisePrimaryMuscles("");
      setNewExerciseSecondaryMuscles("");
      setNewExerciseInstructions("");
      setNewExerciseImages([]);
      setNewExerciseImageUrls([]);
    } catch (error) {
      console.error("Error adding exercise:", error);
      toast({
        title: "Error",
        description: "Failed to add exercise",
        variant: "destructive",
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewExerciseImages((prevImages) => [...prevImages, ...filesArray]);
      filesArray.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewExerciseImageUrls((prevUrls) => [...prevUrls, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setNewExerciseImages((prevImages) => prevImages.filter((_, index) => index !== indexToRemove));
    setNewExerciseImageUrls((prevUrls) => prevUrls.filter((_, index) => index !== indexToRemove));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === index) {
      return;
    }

    const reorderedImages = [...newExerciseImages];
    const reorderedUrls = [...newExerciseImageUrls];

    const [draggedFile] = reorderedImages.splice(draggedImageIndex, 1);
    const [draggedUrl] = reorderedUrls.splice(draggedImageIndex, 1);

    reorderedImages.splice(index, 0, draggedFile);
    reorderedUrls.splice(index, 0, draggedUrl);

    setNewExerciseImages(reorderedImages);
    setNewExerciseImageUrls(reorderedUrls);
    setDraggedImageIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>
            Add a new exercise to your database, either by creating a custom one or importing from an external source.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="online">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="custom">Add Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="custom">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select onValueChange={setNewExerciseCategory} defaultValue={newExerciseCategory}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="calories" className="text-right">
                  Calories/Hour
                </Label>
                <Input
                  id="calories"
                  type="number"
                  value={manualCaloriesPerHour !== undefined ? manualCaloriesPerHour.toString() : newExerciseCalories.toString()}
                  onChange={(e) => setManualCaloriesPerHour(Number(e.target.value))}
                  placeholder="Calculated: 300" // Show calculated as placeholder
                  className="col-span-3"
                />
                <p className="col-span-4 text-xs text-muted-foreground">
                  Leave blank to use system calculated calories per hour ({newExerciseCalories} cal/hour).
                </p>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right mt-1">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newExerciseDescription}
                  onChange={(e) => setNewExerciseDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="source" className="text-right">
                  Source
                </Label>
                <Input
                  id="source"
                  value={newExerciseSource}
                  onChange={(e) => setNewExerciseSource(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="force" className="text-right">
                  Force
                </Label>
                <Input
                  id="force"
                  value={newExerciseForce}
                  onChange={(e) => setNewExerciseForce(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="level" className="text-right">
                  Level
                </Label>
                <Input
                  id="level"
                  value={newExerciseLevel}
                  onChange={(e) => setNewExerciseLevel(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mechanic" className="text-right">
                  Mechanic
                </Label>
                <Input
                  id="mechanic"
                  value={newExerciseMechanic}
                  onChange={(e) => setNewExerciseMechanic(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="equipment" className="text-right mt-1">
                  Equipment (comma-separated)
                </Label>
                <Textarea
                  id="equipment"
                  value={newExerciseEquipment}
                  onChange={(e) => setNewExerciseEquipment(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="primaryMuscles" className="text-right mt-1">
                  Primary Muscles (comma-separated)
                </Label>
                <Textarea
                  id="primaryMuscles"
                  value={newExercisePrimaryMuscles}
                  onChange={(e) => setNewExercisePrimaryMuscles(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="secondaryMuscles" className="text-right mt-1">
                  Secondary Muscles (comma-separated)
                </Label>
                <Textarea
                  id="secondaryMuscles"
                  value={newExerciseSecondaryMuscles}
                  onChange={(e) => setNewExerciseSecondaryMuscles(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="instructions" className="text-right mt-1">
                  Instructions (one per line)
                </Label>
                <Textarea
                  id="instructions"
                  value={newExerciseInstructions}
                  onChange={(e) => setNewExerciseInstructions(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="images" className="text-right mt-1">
                  Images
                </Label>
                <div className="col-span-3">
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="col-span-3"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newExerciseImageUrls.map((url, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className="relative w-24 h-24 cursor-grab"
                      >
                        <img src={url} alt={`preview ${index}`} className="w-full h-full object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            <Button onClick={handleAddCustomExercise}>Add Exercise</Button>
          </TabsContent>
          <TabsContent value="online">
            <div className="pt-4">
              <ExerciseSearch onExerciseSelect={handleExerciseSelect} showInternalTab={false} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddExerciseDialog;