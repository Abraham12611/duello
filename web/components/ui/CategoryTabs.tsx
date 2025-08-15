"use client";

import React from "react";
import type { Tag } from "@/lib/marketStore";

const tabs: Tag[] = [
  "MLB",
  "NBA",
  "NHL",
  "PREMIER LEAGUE",
  "LA LIGA",
  "UEFA CHAMPIONS LEAGUE",
];

type Props = { selected: Tag; onSelect: (t: Tag) => void };

export function CategoryTabs({ selected, onSelect }: Props) {
  return (
    <div className="max-w-[1400px] mx-auto px-6 py-4">
      <div className="flex items-center gap-3 overflow-auto">
        {tabs.map((label) => (
          <button
            key={label}
            onClick={() => onSelect(label)}
            className={"chip " + (selected === label ? "chip-elev" : "")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
