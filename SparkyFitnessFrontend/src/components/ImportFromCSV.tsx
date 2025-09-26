import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Food, FoodVariant } from "@/types/food";
import { isUUID } from "@/services/enhancedCustomFoodFormService";

interface ImportFromCSVProps {
  onSave: (foodData: any) => void;
  food?: Food;
  initialVariants?: FoodVariant[];
  visibleNutrients?: string[];
}

export interface CSVData {
  id: string;
  [key: string]: string | number | boolean;
}

const generateUniqueId = () => `new_${Math.random().toString(36).substr(2, 9)}`;

const ImportFromCSV = ({
  onSave,
  food,
  initialVariants,
  visibleNutrients: passedVisibleNutrients,
}: ImportFromCSVProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define field types for conditional rendering
  const textFields = new Set(["name", "brand", "serving_unit"]);
  const booleanFields = new Set([
    "shared_with_public",
    "is_quick_food",
    "is_default",
  ]);

  // Define the default structure for new rows or an empty table
  const defaultHeaders = [
    "name",
    "brand",
    "is_custom",
    "shared_with_public",
    "is_quick_food",
    "serving_size",
    "serving_unit",
    "calories",
    "protein",
    "carbs",
    "fat",
    "is_default",
  ];

  const parseCSV = (text: string): CSVData[] => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    if (lines.length < 2) return [];

    const parsedHeaders = lines[0].split(",").map((header) => header.trim());
    const data: CSVData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((value) => value.trim());
      const row: CSVData = { id: isUUID() };

      parsedHeaders.forEach((header, index) => {
        const value = values[index] || "";
        if (booleanFields.has(header)) {
          row[header] = value.toLowerCase() === "true";
        } else if (
          !textFields.has(header) &&
          header !== "is_custom" &&
          !isNaN(parseFloat(value))
        ) {
          row[header] = parseFloat(value);
        } else {
          row[header] = value;
        }
      });
      data.push(row);
    }
    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsedData = parseCSV(text);

      if (parsedData.length > 0) {
        setHeaders(Object.keys(parsedData[0]).filter((key) => key !== "id"));
        setCsvData(parsedData);
      }
    };
    reader.readAsText(file);
  };

  const handleEditCell = (
    id: string,
    field: string,
    value: string | number | boolean
  ) => {
    setCsvData((prevData) =>
      prevData.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleDeleteRow = (id: string) => {
    setCsvData((prevData) => prevData.filter((row) => row.id !== id));
  };

  const handleAddNewRow = () => {
    const newRow: CSVData = {
      id: isUUID(),
      name: "", // Required, user must fill this
      brand: "",
      is_custom: true, // Defaulted to true, not editable
      shared_with_public: false,
      is_quick_food: false,
      serving_size: 100,
      serving_unit: "g",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      is_default: csvData.length === 0, // Make the first variant the default
    };

    if (headers.length === 0) {
      setHeaders(defaultHeaders);
    }

    setCsvData((prev) => [...prev, newRow]);
  };

  const clearData = () => {
    setCsvData([]);
    setHeaders([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const invalidRow = csvData.find(
      (row) => !row.name || String(row.name).trim() === ""
    );
    if (invalidRow) {
      toast({
        title: "Validation Error",
        description:
          "The 'name' field cannot be empty. Please fill it in for all records.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log("Submitting data:", csvData);
    // onSave(csvData);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Success!", description: "Data submitted successfully." });
    }, 1000); // Mock async operation
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Food Data</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* RESPONSIVE CHANGE: Buttons stack on mobile, row on larger screens */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleAddNewRow}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Row
              </Button>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                Upload CSV
              </Button>

              {csvData.length > 0 && (
                <Button
                  type="button"
                  onClick={clearData}
                  variant="destructive"
                  className="flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Clear Data
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            {csvData.length > 0 && (
              <div className="text-sm text-green-600">
                Successfully loaded {csvData.length} records.
              </div>
            )}
          </div>

          {csvData.length > 0 && (
            // RESPONSIVE CHANGE: On mobile, this will contain "cards". On desktop, a table.
            <div className="overflow-hidden">
              {/* This overflow is a fallback for medium-sized screens where the table might still be too wide */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {/* RESPONSIVE CHANGE: Hide the traditional table header on mobile */}
                  <thead className="hidden md:table-header-group">
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="px-4 py-2 text-left bg-background font-medium text-white whitespace-nowrap capitalize"
                        >
                          {header.replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-left bg-background font-medium text-white whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((row) => (
                      // RESPONSIVE CHANGE: Each row becomes a block-level card on mobile
                      <tr
                        key={row.id}
                        className="block md:table-row mb-4 md:mb-0 border rounded-lg overflow-hidden md:border-0 md:rounded-none md:border-t hover:bg-muted/50"
                      >
                        {headers.map((header) => (
                          // RESPONSIVE CHANGE: Each cell is a block with its label
                          <td
                            key={header}
                            className="block md:table-cell px-4 py-3 md:py-2 md:whitespace-nowrap border-b md:border-0 last:border-b-0"
                          >
                            {/* Mobile-only label */}
                            <span className="font-medium capitalize text-muted-foreground md:hidden mb-1 block">
                              {header.replace(/_/g, " ")}
                            </span>
                            {/* Input fields now have responsive widths */}
                            {header === "is_custom" ? (
                              <Input
                                type="text"
                                value="true"
                                disabled
                                className="bg-muted text-muted-foreground border-none w-full"
                              />
                            ) : booleanFields.has(header) ? (
                              <Select
                                value={String(row[header])}
                                onValueChange={(value) =>
                                  handleEditCell(
                                    row.id,
                                    header,
                                    value === "true"
                                  )
                                }
                              >
                                <SelectTrigger className="w-full md:w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">True</SelectItem>
                                  <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : textFields.has(header) ? (
                              <Input
                                type="text"
                                value={(row[header] as string) || ""}
                                onChange={(e) =>
                                  handleEditCell(row.id, header, e.target.value)
                                }
                                required={header === "name"}
                                className="w-full md:w-40"
                              />
                            ) : (
                              <Input
                                type="number"
                                value={(row[header] as number) || 0}
                                onChange={(e) =>
                                  handleEditCell(
                                    row.id,
                                    header,
                                    e.target.valueAsNumber || 0
                                  )
                                }
                                min="0"
                                step="any"
                                className="w-full md:w-20"
                              />
                            )}
                          </td>
                        ))}
                        {/* Actions cell, also responsive */}
                        <td className="block md:table-cell px-4 py-3 md:py-2">
                          <span className="font-medium capitalize text-muted-foreground md:hidden mb-1 block">
                            Actions
                          </span>
                          <Button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            variant="destructive"
                            size="sm"
                            className="w-full md:w-auto" // Full width on mobile
                          >
                            <Trash2 size={14} className="md:mr-0" />
                            <span className="ml-2 md:hidden">Delete Row</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || csvData.length === 0}
            className="w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Import{" "}
                {csvData.length > 0 ? `${csvData.length} Records` : "Data"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ImportFromCSV;
