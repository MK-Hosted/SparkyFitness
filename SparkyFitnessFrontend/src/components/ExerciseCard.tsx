import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Dumbbell, Edit, Trash2, Settings, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveUser } from "@/contexts/ActiveUserContext";
import EditExerciseEntryDialog from "./EditExerciseEntryDialog";
import ExercisePlaybackModal from "./ExercisePlaybackModal"; // Import the new modal
import { usePreferences } from "@/contexts/PreferencesContext"; // Import usePreferences
import { debug, info, warn, error } from "@/utils/logging"; // Import logging utility
import { parseISO, addDays } from "date-fns"; // Import parseISO and addDays
import { toast } from "@/hooks/use-toast"; // Import toast
import {
  fetchExerciseEntries,
  deleteExerciseEntry,
  ExerciseEntry,
} from "@/services/exerciseEntryService";
import {
  getSuggestedExercises,
  loadExercises,
  createExercise,
  Exercise,
} from "@/services/exerciseService";
import ExerciseSearch from "./ExerciseSearch"; // New import for ExerciseSearch
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // New import for tabs
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

import LogExerciseEntryDialog from "./LogExerciseEntryDialog"; // Import LogExerciseEntryDialog

interface ExerciseCardProps {
  selectedDate: string;
  onExerciseChange: () => void;
}

// Extend ExerciseEntry to include sets, reps, weight
interface ExpandedExerciseEntry extends ExerciseEntry {
  sets?: number;
  reps?: number;
  weight?: number;
}

const ExerciseCard = ({
  selectedDate,
  onExerciseChange,
}: ExerciseCardProps) => {
  const { user } = useAuth();
  const { activeUserId } = useActiveUser();
  const { loggingLevel, itemDisplayLimit } = usePreferences(); // Get logging level
  debug(
    loggingLevel,
    "ExerciseCard component rendered for date:",
    selectedDate,
  );
  const [exerciseEntries, setExerciseEntries] = useState<ExpandedExerciseEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const addDialogRef = useRef<HTMLDivElement>(null); // Declare addDialogRef
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  ); // New state for selected exercise object
  const [duration, setDuration] = useState<number>(30);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<ExpandedExerciseEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Keep for internal search
  const [searchLoading, setSearchLoading] = useState(false); // Keep for internal search
  const [filterType, setFilterType] = useState<string>("all"); // Keep for internal search
  const [searchMode, setSearchMode] = useState<
    "internal" | "external" | "custom"
  >("internal"); // New state for search mode
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);
  const [topExercises, setTopExercises] = useState<Exercise[]>([]);
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState("general");
  const [newExerciseCalories, setNewExerciseCalories] = useState(300);
  const [newExerciseDescription, setNewExerciseDescription] = useState("");
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [isPlaybackModalOpen, setIsPlaybackModalOpen] = useState(false); // State for playback modal
  const [exerciseToPlay, setExerciseToPlay] = useState<Exercise | null>(null); // State for exercise to play
  const [isLogExerciseDialogOpen, setIsLogExerciseDialogOpen] = useState(false); // State for LogExerciseEntryDialog
  const [selectedExerciseToLog, setSelectedExerciseToLog] = useState<Exercise | null>(null); // State for exercise to log
  const [exerciseEntriesRefreshTrigger, setExerciseEntriesRefreshTrigger] = useState(0); // New state for refreshing exercise entries

  const currentUserId = activeUserId || user?.id;
  debug(loggingLevel, "Current user ID:", currentUserId);

  const _fetchExerciseEntries = useCallback(async () => {
    debug(loggingLevel, "Fetching exercise entries for date:", selectedDate);
    setLoading(true);
    try {
      const data = await fetchExerciseEntries(selectedDate); // Use imported fetchExerciseEntries
      info(loggingLevel, "Exercise entries fetched successfully:", data);
      setExerciseEntries(data || []);
      debug(loggingLevel, "ExerciseCard: exerciseEntries state updated to:", data);
    } catch (err) {
      error(loggingLevel, "Error fetching exercise entries:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, selectedDate, loggingLevel, exerciseEntriesRefreshTrigger]); // Add refresh trigger to dependencies

  useEffect(() => {
    debug(loggingLevel, "currentUserId, selectedDate, or exerciseEntriesRefreshTrigger useEffect triggered.", {
      currentUserId,
      selectedDate,
      exerciseEntriesRefreshTrigger,
    });
    if (currentUserId) {
      _fetchExerciseEntries();
    }
  }, [currentUserId, selectedDate, _fetchExerciseEntries, exerciseEntriesRefreshTrigger]); // Add refresh trigger to dependencies

  useEffect(() => {
    const performInternalSearch = async () => {
      if (!currentUserId) return;

      setSearchLoading(true);
      try {
        const { exercises } = await loadExercises(
          currentUserId,
          searchTerm,
          filterType,
        );
        setSearchResults(exercises);
        info(loggingLevel, "Internal exercise search results:", exercises);
      } catch (err) {
        error(loggingLevel, "Error during internal exercise search:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    const fetchSuggested = async () => {
      if (currentUserId) {
        debug(
          loggingLevel,
          "Fetching suggested exercises with limit:",
          itemDisplayLimit,
        );
        const { recentExercises, topExercises } =
          await getSuggestedExercises(itemDisplayLimit);
        info(loggingLevel, "Suggested exercises data:", {
          recentExercises,
          topExercises,
        });
        setRecentExercises(recentExercises);
        setTopExercises(topExercises);
      }
    };

    if (isAddDialogOpen && searchMode === "internal") {
      if (searchTerm.trim() === "") {
        fetchSuggested();
        setSearchResults([]);
      } else {
        const delayDebounceFn = setTimeout(() => {
          performInternalSearch();
        }, 300); // Debounce search to avoid excessive API calls
        return () => clearTimeout(delayDebounceFn);
      }
    }
  }, [
    searchTerm,
    filterType,
    currentUserId,
    loggingLevel,
    searchMode,
    isAddDialogOpen,
    itemDisplayLimit,
  ]);

  const handleOpenAddDialog = () => {
    debug(loggingLevel, "Opening add exercise dialog.");
    setIsAddDialogOpen(true);
    setSelectedExerciseId(null); // Reset selected exercise
    setSelectedExercise(null); // Reset selected exercise object
    setDuration(30);
    setNotes("");
  };

  const handleCloseAddDialog = () => {
    debug(loggingLevel, "Closing add exercise dialog.");
    setIsAddDialogOpen(false);
    setSelectedExerciseId(null);
    setSelectedExercise(null);
    setDuration(30);
    setNotes("");
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    debug(loggingLevel, "Exercise selected in search:", exercise.id);
    setSelectedExerciseToLog(exercise);
    setIsLogExerciseDialogOpen(true);
    setIsAddDialogOpen(false);
  };

  const handleAddCustomExercise = async () => {
    if (!user) return;
    try {
      const newExercise = {
        name: newExerciseName,
        category: newExerciseCategory,
        calories_per_hour: newExerciseCalories,
        description: newExerciseDescription,
        user_id: user.id,
        is_custom: true,
      };
      const createdExercise = await createExercise(newExercise);
      toast({
        title: "Success",
        description: "Exercise added successfully",
      });
      setSelectedExerciseToLog(createdExercise); // Set the newly created exercise for logging
      setIsLogExerciseDialogOpen(true); // Open the LogExerciseEntryDialog
      setIsAddDialogOpen(false); // Close the Add Exercise dialog
      setNewExerciseName("");
      setNewExerciseCategory("general");
      setNewExerciseCalories(300);
      setNewExerciseDescription("");
    } catch (error) {
      console.error("Error adding exercise:", error);
      toast({
        title: "Error",
        description: "Failed to add exercise",
        variant: "destructive",
      });
    }
  };

  const handleAddToDiary = async () => {
    debug(loggingLevel, "Handling add to diary.");
    if (!selectedExerciseId || !selectedExercise) {
      // Check for selectedExercise object
      warn(loggingLevel, "Submit called with no exercise selected.");
      toast({
        title: "Error",
        description: "Please select an exercise.",
        variant: "destructive",
      });
      return;
    }

    const caloriesPerHour = selectedExercise.calories_per_hour || 300;
    const caloriesBurned = Math.round((caloriesPerHour / 60) * duration);
    debug(loggingLevel, "Calculated calories burned:", caloriesBurned);

    try {
      // This function is no longer used directly, as LogExerciseEntryDialog handles creation
      // await addExerciseEntry({
      //   exercise_id: selectedExerciseId,
      //   duration_minutes: duration,
      //   calories_burned: caloriesBurned,
      //   entry_date: selectedDate,
      //   notes: notes,
      // });
      info(loggingLevel, "Exercise entry added successfully.");
      toast({
        title: "Success",
        description: "Exercise entry added successfully.",
      });
      _fetchExerciseEntries(); // Call the memoized local function
      onExerciseChange();
      setShowDurationDialog(false);
      handleCloseAddDialog();
    } catch (err) {
      error(loggingLevel, "Error adding exercise entry:", err);
      toast({
        title: "Error",
        description: "Failed to add exercise entry.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (entryId: string) => {
    debug(loggingLevel, "Handling delete exercise entry:", entryId);
    try {
      await deleteExerciseEntry(entryId);
      info(loggingLevel, "Exercise entry deleted successfully:", entryId);
      toast({
        title: "Success",
        description: "Exercise entry deleted successfully.",
      });
      _fetchExerciseEntries(); // Call the memoized local function
      onExerciseChange();
    } catch (err) {
      error(loggingLevel, "Error deleting exercise entry:", err);
      toast({
        title: "Error",
        description: "Failed to delete exercise entry.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entry: ExpandedExerciseEntry) => {
    debug(loggingLevel, "Handling edit exercise entry:", entry.id);
    setEditingEntry(entry);
  };

  const handleEditComplete = () => {
    debug(loggingLevel, "Handling edit exercise entry complete.");
    setEditingEntry(null);
    _fetchExerciseEntries(); // Call the memoized local function
    onExerciseChange();
    info(loggingLevel, "Exercise entry edit complete and refresh triggered.");
  };

  const handleEditExerciseDatabase = (exerciseId: string) => {
    debug(loggingLevel, "Handling edit exercise database for ID:", exerciseId);
    // TODO: Implement navigation or dialog for editing exercise database entry
  };

  const handleDataChange = () => {
    debug(
      loggingLevel,
      "Handling data change, incrementing refresh trigger.",
    );
    setExerciseEntriesRefreshTrigger(prev => prev + 1); // Increment trigger to force refresh
    onExerciseChange(); // Still call parent's onExerciseChange for broader diary refresh if needed
    handleCloseAddDialog(); // Close the add exercise dialog
  };

  if (loading) {
    debug(loggingLevel, "ExerciseCard is loading.");
    return <div>Loading exercises...</div>;
  }
  debug(loggingLevel, "ExerciseCard finished loading.");

  const totalExerciseCaloriesBurned = exerciseEntries.reduce(
    (sum, entry) => sum + Number(entry.calories_burned),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="dark:text-slate-300">Exercise</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="default" onClick={handleOpenAddDialog}>
                <Plus className="w-4 h-4 mr-1" />
                <Dumbbell className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Exercise</DialogTitle>
                <DialogDescription>
                  Search for an exercise or add a custom one.
                </DialogDescription>
              </DialogHeader>
              <Tabs
                value={searchMode}
                onValueChange={(value) =>
                  setSearchMode(value as "internal" | "external" | "custom")
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="internal">My Exercises</TabsTrigger>
                  <TabsTrigger value="external">Online</TabsTrigger>
                  <TabsTrigger value="custom">Add Custom</TabsTrigger>
                </TabsList>
                <TabsContent value="internal" className="mt-4 space-y-4">
                  <div className="mb-4">
                    <Input
                      type="text"
                      placeholder="Search your exercises..."
                      value={searchTerm}
                      onChange={(e) => {
                        debug(
                          loggingLevel,
                          "Exercise search term changed:",
                          e.target.value,
                        );
                        setSearchTerm(e.target.value);
                      }}
                      className="mb-2"
                    />
                    <Select
                      value={filterType}
                      onValueChange={(value) => {
                        debug(
                          loggingLevel,
                          "Exercise filter type changed:",
                          value,
                        );
                        setFilterType(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter exercises" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Exercises</SelectItem>
                        <SelectItem value="my_own">My Own</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {searchLoading && <div>Searching...</div>}

                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                    {searchTerm.trim() === "" ? (
                      <>
                        {recentExercises.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-2">
                              Recent Exercises
                            </h3>
                            {recentExercises.map((exercise) => (
                              <Card
                                key={exercise.id}
                                className="mb-2 cursor-pointer"
                                onClick={() => handleExerciseSelect(exercise)}
                              >
                                <CardContent className="p-3">
                                  <p className="font-semibold">{exercise.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {exercise.category}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                        {topExercises.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                              Top Exercises
                            </h3>
                            {topExercises.map((exercise) => (
                              <Card
                                key={exercise.id}
                                className="mb-2 cursor-pointer"
                                onClick={() => handleExerciseSelect(exercise)}
                              >
                                <CardContent className="p-3">
                                  <p className="font-semibold">{exercise.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {exercise.category}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                        {topExercises.length === 0 &&
                          recentExercises.length === 0 && (
                            <div className="text-center text-gray-500">
                              No recent or top exercises found.
                            </div>
                          )}
                      </>
                    ) : (
                      <>
                        {searchResults.map((exercise) => (
                          <div
                            key={exercise.id}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${
                              selectedExerciseId === exercise.id
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/90"
                            }`}
                            onClick={() => handleExerciseSelect(exercise)}
                          >
                            <div>
                              <div className="font-medium">{exercise.name}</div>
                              <div className="text-sm text-gray-500">
                                {exercise.category} • {exercise.calories_per_hour}{" "}
                                cal/hour
                              </div>
                              {exercise.description && (
                                <div className="text-xs text-gray-400">
                                  {exercise.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {searchTerm &&
                          !searchLoading &&
                          searchResults.length === 0 && (
                            <div className="text-center text-gray-500 mb-4">
                              No exercises found
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="external" className="mt-4 space-y-4">
                  <ExerciseSearch
                    onExerciseSelect={handleExerciseSelect}
                    showInternalTab={false}
                    selectedDate={selectedDate}
                    onLogSuccess={handleDataChange}
                  />{" "}
                  {/* Now expects Exercise object */}
                </TabsContent>
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
                      <Select
                        onValueChange={setNewExerciseCategory}
                        defaultValue={newExerciseCategory}
                      >
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
                        value={newExerciseCalories.toString()}
                        onChange={(e) =>
                          setNewExerciseCalories(Number(e.target.value))
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="description" className="text-right mt-1">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={newExerciseDescription}
                        onChange={(e) =>
                          setNewExerciseDescription(e.target.value)
                        }
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddCustomExercise}>Add Exercise</Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {exerciseEntries.length === 0 ? (
          <p className="dark:text-slate-300">
            No exercise entries for this day.
          </p>
        ) : (
          <div className="space-y-4">
            {exerciseEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-gray-100 rounded-md dark:bg-gray-800"
              >
                <div className="flex items-center">
                  <Dumbbell className="w-5 h-5 mr-2" />
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      {entry.exercises?.name || "Unknown Exercise"}
                      {entry.exercises?.source === 'wger' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          Wger
                        </span>
                      )}
                      {entry.exercises?.source === 'free-exercise-db' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                          Free Exercise DB
                        </span>
                      )}
                      {entry.exercises?.source === 'nutritionix' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          Nutritionix
                        </span>
                      )}
                      {entry.exercises?.is_custom && !entry.exercises?.source && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          Custom
                        </span>
                      )}
                    </span>
                    <div className="text-sm text-gray-500">
                      {entry.exercises?.name === "Active Calories"
                        ? `${Math.round(entry.calories_burned)} active calories`
                        : `${entry.duration_minutes} minutes • ${Math.round(entry.calories_burned)} calories`}
                      {entry.sets && ` • Sets: ${entry.sets}`}
                      {entry.reps && ` • Reps: ${entry.reps}`}
                      {entry.weight && ` • Weight: ${entry.weight}`}
                      {entry.exercises?.level && ` • Level: ${entry.exercises.level}`}
                      {entry.exercises?.force && ` • Force: ${entry.exercises.force}`}
                      {entry.exercises?.mechanic && ` • Mechanic: ${entry.exercises.mechanic}`}
                    </div>
                    {entry.exercises?.equipment && Array.isArray(entry.exercises.equipment) && entry.exercises.equipment.length > 0 && (
                      <div className="text-xs text-gray-400">Equipment: {entry.exercises.equipment.join(', ')}</div>
                    )}
                    {entry.exercises?.primary_muscles && Array.isArray(entry.exercises.primary_muscles) && entry.exercises.primary_muscles.length > 0 && (
                      <div className="text-xs text-gray-400">Primary Muscles: {entry.exercises.primary_muscles.join(', ')}</div>
                    )}
                    {entry.exercises?.secondary_muscles && Array.isArray(entry.exercises.secondary_muscles) && entry.exercises.secondary_muscles.length > 0 && (
                      <div className="text-xs text-gray-400">Secondary Muscles: {entry.exercises.secondary_muscles.join(', ')}</div>
                    )}
                    {entry.notes && (
                      <div className="text-xs text-gray-400">{entry.notes}</div>
                    )}
                    {entry.exercises?.images && entry.exercises.images.length > 0 && (
                      <img
                        src={entry.exercises.source ? `/uploads/exercises/${entry.exercises.images[0]}` : entry.exercises.images[0]}
                        alt={entry.exercises.name}
                        className="w-16 h-16 object-contain mt-2"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {entry.exercises?.instructions && entry.exercises.instructions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setExerciseToPlay(entry.exercises);
                        setIsPlaybackModalOpen(true);
                      }}
                      className="h-8 w-8"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(entry)}
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {entry.exercises?.user_id === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleEditExerciseDatabase(entry.exercise_id)
                      }
                      className="h-8 w-8"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entry.id)}
                    className="h-8 w-8 hover:bg-gray-200 dark:hover:bg-gray-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-4">
              <span className="font-semibold">Exercise Total:</span>
              <div className="grid grid-cols-1 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="text-center">
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {Math.round(totalExerciseCaloriesBurned)}
                  </div>
                  <div className="text-xs text-gray-500">cal</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Exercise Entry Dialog */}
        {editingEntry && (
          <EditExerciseEntryDialog
            entry={editingEntry}
            open={!!editingEntry}
            onOpenChange={(open) => {
              debug(
                loggingLevel,
                "Edit exercise entry dialog open state changed:",
                open,
              );
              if (!open) {
                setEditingEntry(null);
              }
            }}
            onSave={handleEditComplete}
          />
        )}

        {/* Exercise Playback Modal */}
        <ExercisePlaybackModal
          isOpen={isPlaybackModalOpen}
          onClose={() => setIsPlaybackModalOpen(false)}
          exercise={exerciseToPlay}
        />

        {/* Log Exercise Entry Dialog */}
        {selectedExerciseToLog && (
          <LogExerciseEntryDialog
            isOpen={isLogExerciseDialogOpen}
            onClose={() => setIsLogExerciseDialogOpen(false)}
            exercise={selectedExerciseToLog}
            selectedDate={selectedDate}
            onSaveSuccess={handleDataChange}
          />
        )}

      </CardContent>
    </Card>
  );
};

export default ExerciseCard;
