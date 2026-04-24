import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileVideo, X } from "lucide-react";

interface VideoFile {
  file: File;
  preview: string;
}

interface VideoUploaderProps {
  onUpload: (videoUrl: string) => void;
  className?: string;
}

export function VideoUploader({ onUpload, className }: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<VideoFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "오류",
        description: "동영상 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "오류",
        description: "파일 크기는 100MB 이하여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedFile({ file, preview });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Step 1: Get upload URL from server
      const response = await fetch('/api/admin/video-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.file.name,
          fileType: selectedFile.file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl } = await response.json();

      // Step 2: Upload file to object storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile.file,
        headers: {
          'Content-Type': selectedFile.file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Extract the video URL
      const videoUrl = uploadUrl.split('?')[0]; // Remove query parameters

      onUpload(videoUrl);
      
      toast({
        title: "성공",
        description: "동영상이 성공적으로 업로드되었습니다.",
      });

      // Reset
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "오류",
        description: "동영상 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview);
      setSelectedFile(null);
    }
  };

  return (
    <div className={className}>
      {!selectedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <FileVideo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Label htmlFor="video-upload" className="cursor-pointer">
            <span className="text-sm font-medium text-gray-900">동영상 파일 선택</span>
            <p className="text-sm text-gray-500 mt-1">또는 파일을 드래그하여 업로드</p>
            <p className="text-xs text-gray-400 mt-2">MP4, AVI, MOV (최대 100MB)</p>
          </Label>
          <Input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileVideo className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  업로드
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleRemove}>
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}