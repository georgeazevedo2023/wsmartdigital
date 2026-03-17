import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionTooltipProps {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

const ActionTooltip = ({ label, side, children }: ActionTooltipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side}>{label}</TooltipContent>
  </Tooltip>
);

export { ActionTooltip };
