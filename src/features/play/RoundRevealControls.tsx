import { Text } from "@/src/shared/components/Text";
import { Button } from "@/src/shared/components/Button";

interface RoundRevealControlsProps {
  revealedCount: number;
  totalCount: number;
  canRevealMore: boolean;
  onRevealNext: () => void;
  onRevealAll: () => void;
}

export function RoundRevealControls({
  revealedCount,
  totalCount,
  canRevealMore,
  onRevealNext,
  onRevealAll,
}: RoundRevealControlsProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Text variant="tertiary" className="text-sm">
        Showing {revealedCount} of {totalCount}
      </Text>
      {canRevealMore && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onRevealNext}>
            Show next
          </Button>
          <Button variant="ghost" onClick={onRevealAll}>
            Show all
          </Button>
        </div>
      )}
    </div>
  );
}
