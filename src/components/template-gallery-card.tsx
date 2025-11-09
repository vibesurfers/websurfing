"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Users } from "lucide-react";

interface TemplateColumn {
  title: string;
  position: number;
  dataType: string;
}

interface TemplateGalleryCardProps {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isAutonomous?: boolean;
  isPublic?: boolean;
  columns: TemplateColumn[];
  usageCount?: number;
  onUse: (templateId: string) => void;
}

export function TemplateGalleryCard({
  id,
  name,
  description,
  icon,
  isAutonomous,
  isPublic,
  columns,
  usageCount,
  onUse,
}: TemplateGalleryCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50 cursor-pointer">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon && <span className="text-4xl">{icon}</span>}
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                {name}
              </CardTitle>
              <div className="flex gap-2 mt-2">
                {isAutonomous && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Autonomous
                  </Badge>
                )}
                {isPublic && (
                  <Badge variant="outline" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        {description && (
          <CardDescription className="text-sm line-clamp-2">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Columns ({columns.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {columns.slice(0, 4).map((col) => (
              <Badge
                key={col.position}
                variant="outline"
                className="text-xs font-normal bg-secondary/50"
              >
                {col.title}
              </Badge>
            ))}
            {columns.length > 4 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{columns.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {usageCount !== undefined && (
            <p className="text-xs text-muted-foreground">
              {usageCount} {usageCount === 1 ? 'use' : 'uses'}
            </p>
          )}
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => onUse(id)}
          >
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
