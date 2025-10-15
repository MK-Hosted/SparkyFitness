import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EnhancedFoodSearch from "./EnhancedFoodSearch";
import { Food } from '@/types/food';

interface FoodSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoodSelect: (food: Food) => void;
  title?: string;
  description?: string;
  hideDatabaseTab?: boolean;
  hideMealTab?: boolean;
}

const FoodSearchDialog = ({
  open,
  onOpenChange,
  onFoodSelect,
  title = "Search and Add Food",
  description = "Search for foods to add to your database.",
  hideDatabaseTab = false,
  hideMealTab = false
}: FoodSearchDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <EnhancedFoodSearch onFoodSelect={onFoodSelect} hideDatabaseTab={hideDatabaseTab} hideMealTab={hideMealTab} />
      </DialogContent>
    </Dialog>
  );
};

export default FoodSearchDialog;