export function calculateScore(linesChanged: number): number {
  if (linesChanged <= 0) return 1;
  return 1 + Math.log2(linesChanged);
}
