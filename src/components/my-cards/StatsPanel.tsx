import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsViewModel {
  totalCards: number;
  aiOriginalCount: number;
  aiEditedCount: number;
  manualCount: number;
  aiAcceptanceRate: number;
}

interface StatsPanelProps {
  stats: StatsViewModel;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Łączna liczba fiszek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCards}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">AI Oryginalne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.aiOriginalCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">AI Edytowane</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.aiEditedCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ręczne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.manualCount}</div>
        </CardContent>
      </Card>
    </div>
  );
};
