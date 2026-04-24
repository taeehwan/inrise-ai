import type { Test } from "@shared/schema";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  editingTest: Test | null;
  setEditingTest: (test: Test | null) => void;
  editForm: { title: string; description: string; duration: number; isActive: boolean };
  setEditForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; duration: number; isActive: boolean }>>;
  onSave: () => void;
  isPending: boolean;
}

export default function AdminFullTestEditDialog({
  editingTest,
  setEditingTest,
  editForm,
  setEditForm,
  onSave,
  isPending,
}: Props) {
  return (
    <Dialog open={!!editingTest} onOpenChange={(open) => !open && setEditingTest(null)}>
      <DialogContent className="bg-[#0D1326] border-white/10 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Pencil className="h-5 w-5 text-blue-400" />
            테스트 수정
          </DialogTitle>
          <DialogDescription className="text-gray-400">테스트 정보를 수정합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-gray-300">제목</Label>
            <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-gray-300">설명</Label>
            <Textarea id="edit-description" value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} className="bg-white/5 border-white/10 text-white min-h-[100px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-duration" className="text-gray-300">시간 (분)</Label>
            <Input id="edit-duration" type="number" value={editForm.duration} onChange={(e) => setEditForm((prev) => ({ ...prev, duration: parseInt(e.target.value, 10) || 0 }))} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-active" className="text-gray-300">활성화</Label>
            <Switch id="edit-active" checked={editForm.isActive} onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, isActive: checked }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingTest(null)} className="bg-white/10 border-white/10 text-gray-300 hover:bg-white/20">취소</Button>
          <Button onClick={onSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">{isPending ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
