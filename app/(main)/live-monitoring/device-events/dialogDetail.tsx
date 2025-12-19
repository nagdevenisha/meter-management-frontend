"use client";

import React from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";

interface DetailsHoverCardProps {
  details: Record<string, any>;
  type?: number;
}

export const DetailsHoverCard: React.FC<DetailsHoverCardProps> = ({ details, type }) => {
  const renderContent = () => {
    if (type === 3 && Array.isArray(details.members)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {details.members.map((member: any, idx: number) => (
            <Badge
              key={idx}
              variant={member.active ? "default" : "outline"}
              className="text-xs rounded-sm font-mono"
            >
              {member.age}-{member.gender === "Male" ? "M" : "F"}
            </Badge>
          ))}
        </div>
      );
    }

    const entries = Object.entries(details);
    if (!entries.length) return <span className="text-muted-foreground">—</span>;

    return (
      <div className="text-xs font-mono space-y-1 max-h-[60vh] overflow-y-auto break-words">
        {entries.map(([k, v], idx) => (
          <div key={k} className={`flex flex-col gap-1 ${idx === 0 ? "w-full" : ""}`}>
            <span className="text-muted-foreground font-medium">{k}:</span>
            <span className="whitespace-pre-wrap break-words">
              {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const previewEntries = Object.entries(details).slice(0, 3);
  const firstLine = previewEntries.length > 0 ? `${previewEntries[0][0]}:${previewEntries[0][1]}` : "—";
  const rest = previewEntries.slice(1).map(([k, v]) => `${k}:${v}`).join(", ");
  const previewText = rest ? `${firstLine}, ...` : firstLine;

  const preview = type === 3 && Array.isArray(details.members)
    ? `${details.members.length} member(s)`
    : previewText;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className="text-xs truncate cursor-pointer text-primary hover:underline"
        //   title="Hover to see full details"
        >
          {preview}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-2xl">
        {renderContent()}
      </HoverCardContent>
    </HoverCard>
  );
};
