export function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isMacOS(): boolean {
  return navigator.platform.toLowerCase().includes('mac') || 
    navigator.userAgent.toLowerCase().includes('macintosh');
}

export function isAppleDevice(): boolean {
  return isSafari() || isIOS() || isMacOS();
}

export function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && 
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia !== 'undefined';
}

export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return 'audio/mp4';
  }
  
  const mimeTypes = isSafari() ? [
    'audio/mp4',
    'audio/aac',
    'audio/webm',
    'audio/webm;codecs=opus',
  ] : [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ];
  
  for (const mimeType of mimeTypes) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    } catch (e) {
      continue;
    }
  }
  
  return isSafari() ? 'audio/mp4' : 'audio/webm';
}

export function createSafariCompatibleAudio(src?: string): HTMLAudioElement {
  const audio = new Audio();
  
  if (isAppleDevice()) {
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
  }
  
  if (src) {
    audio.src = src;
  }
  
  return audio;
}

export async function playSafariCompatibleAudio(
  audio: HTMLAudioElement, 
  options: { forceLoad?: boolean; waitForBuffer?: boolean } = {}
): Promise<void> {
  if (isAppleDevice() && options.forceLoad) {
    const currentTime = audio.currentTime;
    audio.load();
    await new Promise(resolve => setTimeout(resolve, 100));
    if (currentTime > 0) {
      audio.currentTime = currentTime;
    }
  }
  
  const waitForBuffer = options.waitForBuffer !== false;
  
  if (waitForBuffer && audio.readyState < 4) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        resolve();
      }, 3000);
      
      const onReady = () => {
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        resolve();
      };
      
      const onError = () => {
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        reject(new Error('Audio loading failed'));
      };
      
      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
      
      if (audio.readyState >= 4) {
        clearTimeout(timeout);
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        resolve();
      }
    });
  }
  
  try {
    await audio.play();
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      console.warn('Audio playback requires user interaction on this device');
      throw new Error('REQUIRES_USER_INTERACTION');
    }
    throw error;
  }
}

export function createSafariCompatibleMediaRecorder(
  stream: MediaStream,
  options?: MediaRecorderOptions
): MediaRecorder {
  if (!isMediaRecorderSupported()) {
    throw new Error('MEDIARECORDER_NOT_SUPPORTED');
  }
  
  const mimeType = getSupportedMimeType();
  console.log(`Creating MediaRecorder with mimeType: ${mimeType}, Safari: ${isSafari()}`);
  
  const mergedOptions: MediaRecorderOptions = {
    ...options,
    mimeType
  };
  
  try {
    return new MediaRecorder(stream, mergedOptions);
  } catch (error) {
    console.warn(`Failed to create MediaRecorder with ${mimeType}, trying without mimeType`);
    try {
      return new MediaRecorder(stream);
    } catch (fallbackError) {
      console.error('MediaRecorder creation failed completely:', fallbackError);
      throw new Error('MEDIARECORDER_CREATION_FAILED');
    }
  }
}

export async function requestMicrophonePermission(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('MEDIADEVICES_NOT_SUPPORTED');
  }
  
  try {
    const constraints: MediaStreamConstraints = {
      audio: isSafari() ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } : true
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error: any) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('MICROPHONE_PERMISSION_DENIED');
    }
    if (error.name === 'NotFoundError') {
      throw new Error('MICROPHONE_NOT_FOUND');
    }
    throw error;
  }
}

export function getBlobMimeType(): string {
  const mimeType = getSupportedMimeType();
  if (mimeType.includes('mp4')) return 'audio/mp4';
  if (mimeType.includes('ogg')) return 'audio/ogg';
  if (mimeType.includes('wav')) return 'audio/wav';
  return 'audio/webm';
}

let audioContextUnlocked = false;

export async function unlockAudioContext(): Promise<void> {
  if (audioContextUnlocked) return;
  
  if (isAppleDevice()) {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        await ctx.resume();
        audioContextUnlocked = true;
      }
    } catch (e) {
      console.warn('Failed to unlock audio context:', e);
    }
  }
  
  audioContextUnlocked = true;
}
