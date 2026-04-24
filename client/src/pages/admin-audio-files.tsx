import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  playSafariCompatibleAudio,
  unlockAudioContext,
  createSafariCompatibleAudio
} from "@/lib/safariAudioCompat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Trash2,
  FileAudio,
  HardDrive,
  Search,
  Play,
  Pause,
  RefreshCw,
  Archive,
  Volume2,
  Mic,
  Headphones,
  MessageSquare,
  ArrowLeft,
  Zap,
  FolderOpen,
  DatabaseZap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface AudioFile {
  name: string;
  path: string;
  size: number;
  createdAt: string;
  type: string;
  source: "root" | "audio";
}

interface AudioFilesResponse {
  files: AudioFile[];
  totalCount: number;
  totalSize: number;
  totalSizeMB: string;
}

const TYPE_LABELS: Record<string, string> = {
  "new-toefl": "New TOEFL",
  listening: "Listening",
  question: "Question",
  tts: "TTS",
  speaking: "Speaking",
  lecture: "Lecture",
  conversation: "Conversation",
  other: "기타",
};

const TYPE_COLORS: Record<string, string> = {
  "new-toefl": "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  listening: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  question: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  tts: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  speaking: "bg-green-500/20 text-green-300 border border-green-500/30",
  lecture: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  conversation: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  other: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

const TYPE_ICONS: Record<string, JSX.Element> = {
  "new-toefl": <Zap className="h-3.5 w-3.5 text-violet-400" />,
  listening: <Headphones className="h-3.5 w-3.5 text-blue-400" />,
  question: <MessageSquare className="h-3.5 w-3.5 text-purple-400" />,
  tts: <Volume2 className="h-3.5 w-3.5 text-indigo-400" />,
  speaking: <Mic className="h-3.5 w-3.5 text-green-400" />,
  lecture: <Volume2 className="h-3.5 w-3.5 text-orange-400" />,
  conversation: <MessageSquare className="h-3.5 w-3.5 text-teal-400" />,
  other: <FileAudio className="h-3.5 w-3.5 text-slate-400" />,
};

const FILTER_TYPES = ["all", "new-toefl", "listening", "tts", "speaking", "question", "conversation", "other"];

export default function AdminAudioFiles() {
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [deleteFile, setDeleteFile] = useState<AudioFile | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");

  const { data: audioData, isLoading, refetch } = useQuery<AudioFilesResponse>({
    queryKey: ["/api/admin/audio-files"],
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (file: AudioFile) => {
      const sourceSuffix = file.source === "audio" ? "?source=audio" : "";
      const response = await apiRequest("DELETE", `/api/admin/audio-files/${encodeURIComponent(file.name)}${sourceSuffix}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "삭제 완료", description: "음성 파일이 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audio-files"] });
      setDeleteFile(null);
    },
    onError: (error: Error) => {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/clear-choose-response-cache");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "캐시 초기화 완료",
        description: `캐시 ${data.deletedCacheRows}개 삭제, ${data.clearedTests}개 테스트 초기화됨. 테스트 재생 시 optionTimestamps와 함께 오디오가 재생성됩니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audio-files"] });
    },
    onError: (error: Error) => {
      toast({ title: "캐시 초기화 실패", description: error.message, variant: "destructive" });
    },
  });

  const handlePlay = async (path: string) => {
    if (playingAudio === path) {
      audioElement?.pause();
      setPlayingAudio(null);
      setAudioElement(null);
    } else {
      audioElement?.pause();
      const audio = createSafariCompatibleAudio(path);
      audio.onended = () => {
        setPlayingAudio(null);
        setAudioElement(null);
      };
      await unlockAudioContext();
      await playSafariCompatibleAudio(audio);
      setPlayingAudio(path);
      setAudioElement(audio);
    }
  };

  const handleDownloadAll = () => {
    const link = document.createElement("a");
    link.href = "/api/admin/audio-files/download-all";
    link.download = "tts_audio_files.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "다운로드 시작", description: "모든 음성 파일을 ZIP으로 다운로드합니다." });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Card className="bg-slate-800/60 border-white/10 w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400 font-medium">관리자 권한이 필요합니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const files = audioData?.files || [];

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || file.type === filterType;
    const matchesSource = filterSource === "all" || file.source === filterSource;
    return matchesSearch && matchesType && matchesSource;
  });

  const typeCount = files.reduce((acc, file) => {
    acc[file.type] = (acc[file.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rootCount = files.filter((f) => f.source === "root").length;
  const audioSubCount = files.filter((f) => f.source === "audio").length;
  const newToeflCount = typeCount["new-toefl"] || 0;
  const listeningCount = (typeCount["listening"] || 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header Nav */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-2 h-8">
                <ArrowLeft className="h-4 w-4" />
                관리자 패널
              </Button>
            </Link>
            <span className="text-gray-600">/</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FileAudio className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white text-sm">TTS 음성 파일 관리</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-gray-400 hover:text-white gap-2 h-8 bg-white/5 border border-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              새로고침
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearCacheMutation.mutate()}
              disabled={clearCacheMutation.isPending}
              className="text-orange-400 hover:text-orange-300 gap-2 h-8 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20"
              title="choose-response 유형의 TTS 캐시를 초기화합니다"
            >
              <DatabaseZap className="h-3.5 w-3.5" />
              {clearCacheMutation.isPending ? "초기화 중..." : "캐시 초기화"}
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadAll}
              disabled={files.length === 0}
              className="gap-2 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
            >
              <Archive className="h-3.5 w-3.5" />
              전체 ZIP 다운로드
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-300 text-xs mb-1">총 파일 수</p>
                  <p className="text-2xl font-bold text-white">{audioData?.totalCount ?? 0}</p>
                </div>
                <FileAudio className="h-8 w-8 text-indigo-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-xs mb-1">총 용량</p>
                  <p className="text-2xl font-bold text-white">{audioData?.totalSizeMB ?? "0"} MB</p>
                </div>
                <HardDrive className="h-8 w-8 text-purple-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/30 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-300 text-xs mb-1">New TOEFL</p>
                  <p className="text-2xl font-bold text-white">{newToeflCount}</p>
                  <p className="text-[10px] text-violet-400 mt-0.5">uploads/audio/</p>
                </div>
                <Zap className="h-8 w-8 text-violet-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-xs mb-1">기존 TOEFL</p>
                  <p className="text-2xl font-bold text-white">{rootCount}</p>
                  <p className="text-[10px] text-blue-400 mt-0.5">uploads/</p>
                </div>
                <FolderOpen className="h-8 w-8 text-blue-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="bg-slate-800/60 border-white/10 backdrop-blur-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="파일명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-500 h-9 text-sm"
                />
              </div>
              {/* Source filter */}
              <div className="flex gap-1.5">
                {[
                  { val: "all", label: "전체" },
                  { val: "audio", label: "🆕 New TOEFL" },
                  { val: "root", label: "기존 TOEFL" },
                ].map(({ val, label }) => (
                  <Button
                    key={val}
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterSource(val)}
                    className={`h-9 text-xs px-3 ${
                      filterSource === val
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-slate-700/50 text-gray-400 hover:text-white border border-slate-600 hover:bg-slate-600"
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            {/* Type filter */}
            <div className="flex flex-wrap gap-1.5">
              {FILTER_TYPES.map((type) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterType(type)}
                  className={`h-7 text-xs px-2.5 ${
                    filterType === type
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-slate-700/50 text-gray-400 hover:text-white border border-slate-600 hover:bg-slate-600"
                  }`}
                >
                  {type === "all" ? "전체 타입" : TYPE_LABELS[type] || type}
                  {type !== "all" && typeCount[type] ? (
                    <span className="ml-1 text-[10px] opacity-70">({typeCount[type]})</span>
                  ) : null}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Files Table */}
        <Card className="bg-slate-800/60 border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-0 px-5 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-indigo-400" />
              음성 파일 목록
              <Badge className="ml-1 bg-slate-700 text-gray-300 border-0 text-xs">
                {filteredFiles.length}개
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-500 text-sm">음성 파일을 불러오는 중...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-16">
                <FileAudio className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {searchTerm || filterType !== "all" || filterSource !== "all"
                    ? "검색 결과가 없습니다."
                    : "음성 파일이 없습니다."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-b-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-slate-700/30 hover:bg-slate-700/30">
                      <TableHead className="text-gray-400 text-xs w-8 pl-5"></TableHead>
                      <TableHead className="text-gray-400 text-xs">파일명</TableHead>
                      <TableHead className="text-gray-400 text-xs">타입</TableHead>
                      <TableHead className="text-gray-400 text-xs">소스</TableHead>
                      <TableHead className="text-gray-400 text-xs">크기</TableHead>
                      <TableHead className="text-gray-400 text-xs">생성일</TableHead>
                      <TableHead className="text-gray-400 text-xs text-right pr-5">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow
                        key={`${file.source}:${file.name}`}
                        className="border-white/5 hover:bg-slate-700/30 transition-colors"
                      >
                        <TableCell className="pl-5">
                          {TYPE_ICONS[file.type] ?? <FileAudio className="h-3.5 w-3.5 text-slate-400" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-200">
                          <div className="max-w-xs truncate" title={file.name}>
                            {file.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[file.type] ?? TYPE_COLORS.other}`}>
                            {TYPE_LABELS[file.type] ?? file.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${
                              file.source === "audio"
                                ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                                : "bg-slate-500/20 text-slate-400 border border-slate-500/25"
                            }`}
                          >
                            {file.source === "audio" ? "uploads/audio" : "uploads"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          {new Date(file.createdAt).toLocaleDateString("ko-KR", {
                            year: "2-digit",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePlay(file.path)}
                              className={`h-7 w-7 p-0 ${
                                playingAudio === file.path
                                  ? "text-emerald-400 bg-emerald-500/10"
                                  : "text-gray-500 hover:text-white hover:bg-slate-600"
                              }`}
                            >
                              {playingAudio === file.path ? (
                                <Pause className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                              asChild
                            >
                              <a href={file.path} download={file.name}>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteFile(file)}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent className="bg-slate-800 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">음성 파일 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              <span className="font-mono text-xs text-gray-300 block mb-1">{deleteFile?.name}</span>
              이 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFile && deleteMutation.mutate(deleteFile)}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
