import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PalaceBuilder } from "@/features/builder/PalaceBuilder";

export const metadata: Metadata = { title: "Palace Architect" };

export default function BuilderPage() {
  return (
    <>
      <PageHeader
        eyebrow="Palace Architect"
        title="Design the labyrinth."
        lead="Choose a template, place the entrance, treasure, clues and shadows, then hide a message inside each clue's media."
      />
      <PalaceBuilder />
    </>
  );
}
