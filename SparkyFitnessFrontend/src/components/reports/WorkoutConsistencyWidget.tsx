import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkoutConsistencyWidgetProps {
  consistencyData: {
    currentStreak: number;
    longestStreak: number;
    weeklyFrequency: number;
    monthlyFrequency: number;
  } | null;
}

const WorkoutConsistencyWidget: React.FC<WorkoutConsistencyWidgetProps> = ({ consistencyData }) => {
  if (!consistencyData) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
        <span className="text-2xl font-bold">{consistencyData.currentStreak}</span>
        <span className="text-sm text-muted-foreground">Current Streak (days)</span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
        <span className="text-2xl font-bold">{consistencyData.longestStreak}</span>
        <span className="text-sm text-muted-foreground">Longest Streak (days)</span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
        <span className="text-2xl font-bold">{consistencyData.weeklyFrequency.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">Weekly Frequency</span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
        <span className="text-2xl font-bold">{consistencyData.monthlyFrequency.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">Monthly Frequency</span>
      </div>
    </div>
  );
};

export default WorkoutConsistencyWidget;