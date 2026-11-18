import { MatchGroup } from "../components/Characters/CharacterMetadata";
import { CharacterStats } from "../state-management/models/CharacterStats";

export function AreCharactersWithinBoundDistanceByGroup_AABB(stats: CharacterStats[], group: MatchGroup, boundDistance: number): boolean {
  if (!Number.isFinite(boundDistance) || boundDistance < 0) return false;

  const grouped = stats.filter((s) => s.matchingGroup === group);
  if (grouped.length <= 1) return true;

  for (const s of grouped) {
    if (typeof s.currentX !== "number" || typeof s.currentY !== "number") return false;
  }

  let minX = grouped[0].currentX!;
  let maxX = grouped[0].currentX!;
  let minY = grouped[0].currentY!;
  let maxY = grouped[0].currentY!;

  for (let i = 1; i < grouped.length; i++) {
    const x = grouped[i].currentX!;
    const y = grouped[i].currentY!;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    if (maxX - minX > boundDistance || maxY - minY > boundDistance) return false;
  }

  return true;
}
