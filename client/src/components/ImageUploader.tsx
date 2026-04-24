import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImageUploaderProps {
  onImageUpload?: (imageUrl: string) => void;
  currentImage?: string;
  className?: string;
}

export function ImageUploader({ onImageUpload, currentImage, className }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImage || "");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "파일 형식 오류",
        description: "이미지 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "파일 크기 오류", 
        description: "파일 크기는 5MB 이하여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // Get upload URL
      const response = await fetch("/api/objects/upload", { method: "POST" });
      const result = await response.json();
      const uploadURL = result.uploadURL;
      const objectPath =
        result.objectPath ||
        `/objects${new URL(uploadURL).pathname.split('/').slice(-2).join('/')}`;
      
      // Upload file
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      setImageUrl(objectPath);
      onImageUpload?.(objectPath);
      
      toast({
        title: "업로드 완료",
        description: "이미지가 성공적으로 업로드되었습니다.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "업로드 실패",
        description: "이미지 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl("");
    onImageUpload?.("");
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {imageUrl ? (
          <div className="relative">
            <img 
              src={imageUrl} 
              alt="Uploaded" 
              className="w-full h-32 object-cover rounded border"
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={removeImage}
              className="absolute top-2 right-2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">이미지를 업로드하세요</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "업로드 중..." : "이미지 선택"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
