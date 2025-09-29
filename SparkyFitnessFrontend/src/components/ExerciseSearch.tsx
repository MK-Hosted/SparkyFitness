import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // New import
import { usePreferences } from "@/contexts/PreferencesContext";
import { debug, info, warn, error } from '@/utils/logging';
import { searchExercises as searchExercisesService, searchExternalExercises, addExternalExerciseToUserExercises, addNutritionixExercise, addFreeExerciseDBExercise, Exercise } from '@/services/exerciseSearchService'; // Added addFreeExerciseDBExercise
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Loader2, Search, ChevronLeft, ChevronRight, Volume2 } from "lucide-react"; // Added Loader2, Search, ChevronLeft, ChevronRight, Volume2
import { useToast } from "@/hooks/use-toast";
import { getExternalDataProviders, DataProvider, getProviderCategory } from '@/services/externalProviderService'; // New import


interface ExerciseSearchProps {
  onExerciseSelect: (exercise: Exercise) => void;
  showInternalTab?: boolean; // New prop
}

const ExerciseSearch = ({ onExerciseSelect, showInternalTab = true }: ExerciseSearchProps) => {
  const { loggingLevel, itemDisplayLimit } = usePreferences(); // Get itemDisplayLimit from preferences
  const { toast } = useToast();
  debug(loggingLevel, "ExerciseSearch: Component rendered.");
  const [searchTerm, setSearchTerm] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<'internal' | 'external'>(showInternalTab ? 'internal' : 'external');
  const [providers, setProviders] = useState<DataProvider[]>([]); // New state for providers
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null); // Stores the provider's database ID
  const [selectedProviderType, setSelectedProviderType] = useState<string | null>(null); // Stores the provider's type (e.g., 'nutritionix', 'wger')
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For image carousel

  const handleSearch = async (query: string) => {
    debug(loggingLevel, `ExerciseSearch: Searching exercises with query: "${query}" from source: "${searchSource}" and provider ID: "${selectedProviderId}", type: "${selectedProviderType}"`);
    if (!query.trim()) {
      debug(loggingLevel, "ExerciseSearch: Search query is empty, clearing exercises.");
      setExercises([]);
      return;
    }

    setLoading(true);
    try {
      let data: Exercise[] = [];
      if (searchSource === 'internal') {
        data = await searchExercisesService(query);
      } else {
        if (!selectedProviderId || !selectedProviderType) {
          warn(loggingLevel, "ExerciseSearch: No external provider selected (ID or Type missing).");
          setLoading(false);
          return;
        }
        data = await searchExternalExercises(query, selectedProviderId, selectedProviderType, itemDisplayLimit); // Pass ID, Type, and itemDisplayLimit
      }
      info(loggingLevel, "ExerciseSearch: Exercises search results:", data);
      setExercises(data || []);
    } catch (err) {
      error(loggingLevel, "ExerciseSearch: Error searching exercises:", err);
      toast({
        title: "Error",
        description: `Failed to search exercises: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      debug(loggingLevel, "ExerciseSearch: Loading state set to false.");
    }
  };

  const handleAddExternalExercise = async (exercise: Exercise): Promise<Exercise | undefined> => {
    setLoading(true);
    try {
      let newExercise: Exercise | undefined;
      if (selectedProviderType === 'wger') {
        newExercise = await addExternalExerciseToUserExercises(exercise.id);
      } else if (selectedProviderType === 'nutritionix') {
        newExercise = await addNutritionixExercise(exercise); // Call new function to add Nutritionix exercise
      } else if (selectedProviderType === 'free-exercise-db') { // Handle free-exercise-db
        newExercise = await addFreeExerciseDBExercise(exercise.id);
      }
      else {
        warn(loggingLevel, "ExerciseSearch: Unknown provider for adding external exercise:", selectedProviderType);
        return undefined;
      }
      
      if (newExercise) {
        onExerciseSelect(newExercise);
        toast({
          title: "Success",
          description: `${exercise.name} added to your exercises.`,
        });
      }
      return newExercise;
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add exercise: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    debug(loggingLevel, "ExerciseSearch: searchTerm or searchSource useEffect triggered.");
    if (searchSource === 'internal') { // Only debounce for internal search
      const timeoutId = setTimeout(() => {
        handleSearch(searchTerm);
      }, 300);

      return () => {
        debug(loggingLevel, "ExerciseSearch: Cleaning up search timeout.");
        clearTimeout(timeoutId);
      };
    }
  }, [searchTerm, searchSource, selectedProviderId, selectedProviderType, loggingLevel]); // Updated dependencies

  useEffect(() => {
    debug(loggingLevel, "ExerciseSearch: fetchProviders useEffect triggered. Current searchSource:", searchSource);
    const fetchProviders = async () => {
      try {
        const fetchedProviders = await getExternalDataProviders();
        debug(loggingLevel, "ExerciseSearch: Fetched providers:", fetchedProviders);
        const exerciseProviders = fetchedProviders.filter(p => {
          const categories = getProviderCategory(p); // Changed to categories (plural)
          debug(loggingLevel, `ExerciseSearch: Filtering provider: ${p.provider_name}, categories: ${categories.join(', ')}, is_active: ${p.is_active}`);
          return categories.includes('exercise') && p.is_active; // Changed to .includes()
        });
        debug(loggingLevel, "ExerciseSearch: Filtered exercise providers:", exerciseProviders);
        setProviders(exerciseProviders);
        if (exerciseProviders.length > 0) {
          setSelectedProviderId(exerciseProviders[0].id); // Auto-select first enabled exercise provider's ID
          setSelectedProviderType(exerciseProviders[0].provider_type); // Auto-select first enabled exercise provider's Type
        } else {
          warn(loggingLevel, "ExerciseSearch: No enabled exercise providers found.");
        }
      } catch (err) {
        error(loggingLevel, "ExerciseSearch: Error fetching external data providers:", err);
        toast({
          title: "Error",
          description: `Failed to load external providers: ${err instanceof Error ? err.message : String(err)}`,
          variant: "destructive"
        });
      }
    };

    if (searchSource === 'external') {
      fetchProviders();
    }
  }, [searchSource, loggingLevel, toast]);

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % (exercises[0]?.images?.length || 1));
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + (exercises[0]?.images?.length || 1)) % (exercises[0]?.images?.length || 1));
  };

  const handleSpeakInstructions = (instructions: string[]) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(instructions.join('. '));
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Text-to-Speech Not Supported",
        description: "Your browser does not support the Web Speech API.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {showInternalTab ? (
        <Tabs value={searchSource} onValueChange={(value) => setSearchSource(value as 'internal' | 'external')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal">My Exercises</TabsTrigger>
            <TabsTrigger value="external">External Database</TabsTrigger>
          </TabsList>
          <TabsContent value="internal" className="mt-4 space-y-4">
            <Input
              type="text"
              placeholder="Search your exercises..."
              value={searchTerm}
              onChange={(e) => {
                debug(loggingLevel, "ExerciseSearch: Internal search term input changed:", e.target.value);
                setSearchTerm(e.target.value);
              }}
            />
            {loading && <div>Searching...</div>}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{exercise.name}</div>
                    <div className="text-sm text-gray-500">
                      {exercise.category} • {exercise.calories_per_hour} cal/hour
                    </div>
                    {exercise.description && (
                      <div className="text-xs text-gray-400">{exercise.description}</div>
                    )}
                  </div>
                  <Button onClick={() => {
                    debug(loggingLevel, "ExerciseSearch: Select button clicked for internal exercise:", exercise.name);
                    onExerciseSelect(exercise);
                  }}>
                    Select
                  </Button>
                </div>
              ))}
            </div>
            {searchTerm && !loading && exercises.length === 0 && (
              <div className="text-center text-gray-500">No exercises found in your database.</div>
            )}
          </TabsContent>
          <TabsContent value="external" className="mt-4 space-y-4">
            <Select value={selectedProviderId || ''} onValueChange={(value) => {
              const provider = providers.find(p => p.id === value);
              setSelectedProviderId(value);
              setSelectedProviderType(provider ? provider.provider_type : null);
            }}>
              <SelectTrigger className="w-full mb-2">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map(provider => (
                  <SelectItem key={provider.id} value={provider.id}> {/* Use provider.id for value */}
                    {provider.provider_name} {/* Display provider_name */}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex space-x-2 items-center">
              <Input
                type="text"
                placeholder={selectedProviderType === 'nutritionix' ? "Describe your exercise (e.g., 'ran 3 miles', 'swam for 30 minutes')" : `Search ${selectedProviderType || 'external'} database...`}
                value={searchTerm}
                onChange={(e) => {
                  debug(loggingLevel, "ExerciseSearch: External search term input changed:", e.target.value);
                  setSearchTerm(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    debug(loggingLevel, "ExerciseSearch: Enter key pressed, triggering search.");
                    handleSearch(searchTerm);
                  }
                }}
                className="flex-1"
              />
              <Button onClick={() => handleSearch(searchTerm)} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {loading && <div>Searching...</div>}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {exercise.name}
                      {exercise.source === 'wger' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          Wger
                        </span>
                      )}
                      {exercise.source === 'free-exercise-db' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                          Free Exercise DB
                        </span>
                      )}
                      {exercise.source === 'nutritionix' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                          Nutritionix
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {exercise.category}
                      {exercise.calories_per_hour && ` • ${exercise.calories_per_hour} cal/hour`}
                      {exercise.level && ` • Level: ${exercise.level}`}
                      {exercise.force && ` • Force: ${exercise.force}`}
                      {exercise.mechanic && ` • Mechanic: ${exercise.mechanic}`}
                    </div>
                    {exercise.equipment && exercise.equipment.length > 0 && (
                      <div className="text-xs text-gray-400">Equipment: {exercise.equipment.join(', ')}</div>
                    )}
                    {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
                      <div className="text-xs text-gray-400">Primary Muscles: {exercise.primary_muscles.join(', ')}</div>
                    )}
                    {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                      <div className="text-xs text-gray-400">Secondary Muscles: {exercise.secondary_muscles.join(', ')}</div>
                    )}
                    {exercise.instructions && exercise.instructions.length > 0 && (
                      <div className="text-xs text-gray-400 flex items-center">
                        Instructions: {exercise.instructions[0]}...
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSpeakInstructions(exercise.instructions || [])}
                          className="ml-2"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {exercise.description && (
                      <div className="text-xs text-gray-400">{exercise.description}</div>
                    )}
                    {exercise.images && exercise.images.length > 0 && (
                      <div className="relative w-32 h-32 mt-2">
                        <img src={exercise.images[currentImageIndex]} alt={exercise.name} className="w-full h-full object-contain" />
                        {exercise.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-0 top-1/2 -translate-y-1/2"
                              onClick={handlePrevImage}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-1/2 -translate-y-1/2"
                              onClick={handleNextImage}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => {
                    debug(loggingLevel, "ExerciseSearch: Add/Select button clicked for external exercise:", exercise.name);
                    handleAddExternalExercise(exercise).catch(err => {
                      error(loggingLevel, "ExerciseSearch: Error handling external exercise selection:", err);
                    });
                  }}>
                    {selectedProviderType === 'nutritionix' ? 'Select' : <><Plus className="h-4 w-4 mr-2" /> Add</>}
                  </Button>
                </div>
              ))}
            </div>
            {searchTerm && !loading && exercises.length === 0 && (
              <div className="text-center text-gray-500">No exercises found in {selectedProviderType || 'external'} database.</div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        // Render only the external search if showInternalTab is false
        <div className="mt-4 space-y-4">
          <Select value={selectedProviderId || ''} onValueChange={(value) => {
              const provider = providers.find(p => p.id === value);
              setSelectedProviderId(value);
              setSelectedProviderType(provider ? provider.provider_type : null);
            }}>
            <SelectTrigger className="w-full mb-2">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map(provider => (
                <SelectItem key={provider.id} value={provider.id}> {/* Use provider.id for value */}
                  {provider.provider_name} {/* Display provider_name */}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex space-x-2 items-center">
            <Input
              type="text"
              placeholder={selectedProviderType === 'nutritionix' ? "Describe your exercise (e.g., 'ran 3 miles', 'swam for 30 minutes')" : `Search ${selectedProviderType || 'external'} database...`}
              value={searchTerm}
              onChange={(e) => {
                debug(loggingLevel, "ExerciseSearch: External search term input changed:", e.target.value);
                setSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  debug(loggingLevel, "ExerciseSearch: Enter key pressed, triggering search.");
                  handleSearch(searchTerm);
                }
              }}
              className="flex-1"
            />
            <Button onClick={() => handleSearch(searchTerm)} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {loading && <div>Searching...</div>}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {exercise.name}
                    {exercise.source === 'wger' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                        Wger
                      </span>
                    )}
                    {exercise.source === 'free-exercise-db' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                        Free Exercise DB
                      </span>
                    )}
                    {exercise.source === 'nutritionix' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                        Nutritionix
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {exercise.category}
                    {exercise.calories_per_hour && ` • ${exercise.calories_per_hour} cal/hour`}
                    {exercise.level && ` • Level: ${exercise.level}`}
                    {exercise.force && ` • Force: ${exercise.force}`}
                    {exercise.mechanic && ` • Mechanic: ${exercise.mechanic}`}
                  </div>
                  {exercise.equipment && exercise.equipment.length > 0 && (
                    <div className="text-xs text-gray-400">Equipment: {exercise.equipment.join(', ')}</div>
                  )}
                  {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
                    <div className="text-xs text-gray-400">Primary Muscles: {exercise.primary_muscles.join(', ')}</div>
                  )}
                  {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                    <div className="text-xs text-gray-400">Secondary Muscles: {exercise.secondary_muscles.join(', ')}</div>
                  )}
                  {exercise.instructions && exercise.instructions.length > 0 && (
                    <div className="text-xs text-gray-400 flex items-center">
                      Instructions: {exercise.instructions[0]}...
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSpeakInstructions(exercise.instructions || [])}
                        className="ml-2"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {exercise.description && (
                    <div className="text-xs text-gray-400">{exercise.description}</div>
                  )}
                  {exercise.images && exercise.images.length > 0 && (
                      <div className="relative w-32 h-32 mt-2">
                        <img src={exercise.images[currentImageIndex]} alt={exercise.name} className="w-full h-full object-contain" />
                        {exercise.images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-0 top-1/2 -translate-y-1/2"
                              onClick={handlePrevImage}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-1/2 -translate-y-1/2"
                              onClick={handleNextImage}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                </div>
                <Button onClick={() => {
                  debug(loggingLevel, "ExerciseSearch: Add/Select button clicked for external exercise:", exercise.name);
                  handleAddExternalExercise(exercise).catch(err => {
                    error(loggingLevel, "ExerciseSearch: Error handling external exercise selection:", err);
                  });
                }}>
                  {selectedProviderType === 'nutritionix' ? 'Select' : <><Plus className="h-4 w-4 mr-2" /> Add</>}
                </Button>
              </div>
            ))}
          </div>
          {searchTerm && !loading && exercises.length === 0 && (
            <div className="text-center text-gray-500">No exercises found in {selectedProviderType || 'external'} database.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExerciseSearch;
