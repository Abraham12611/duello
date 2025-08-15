"use client";
import { CategoryTabs } from "@/components/ui/CategoryTabs";
import { GameSchedule } from "@/components/ui/GameSchedule";
import React from "react";
import type { Tag } from "@/lib/marketStore";

export default function HomePage() {
  const [tag, setTag] = React.useState<Tag>("MLB");
  return (
    <main>
      <CategoryTabs selected={tag} onSelect={setTag} />
      <GameSchedule tag={tag} />
    </main>
  );
}

