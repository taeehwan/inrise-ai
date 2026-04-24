import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

interface FullscreenWrapperProps {
  children: ReactNode;
  className?: string;
  hideButton?: boolean;
  style?: React.CSSProperties;
}

export default function FullscreenWrapper({ children, className = "", hideButton = false, style }: FullscreenWrapperProps) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Fullscreen Toggle Button - only show if not hidden */}
      {!hideButton && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            size="sm"
            onClick={toggleFullscreen}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold border-0 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {isFullscreen ? (
              <>
                <Minimize className="h-4 w-4" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize className="h-4 w-4" />
                <span>Full Screen</span>
              </>
            )}
          </Button>
        </div>
      )}
      
      {children}
    </div>
  );
}