import { Loader2, Pause, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ActualTestPauseDialogProps {
  currentSection: string;
  currentSectionIndex: number;
  totalSections: number;
  isPending: boolean;
  onPause: () => void;
}

export default function ActualTestPauseDialog({
  currentSection,
  currentSectionIndex,
  totalSections,
  isPending,
  onPause,
}: ActualTestPauseDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          data-testid="button-pause-test"
        >
          <Pause className="h-4 w-4 mr-1" />
          저장 후 나가기
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">테스트를 일시정지 하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            현재까지의 진행 상황이 저장되며, 나중에 이어서 테스트를 진행할 수 있습니다. 현재 섹션:{" "}
            {currentSection.toUpperCase()} (Section {currentSectionIndex + 1}/{totalSections})
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
            계속 풀기
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onPause}
            disabled={isPending}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            저장 후 나가기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
