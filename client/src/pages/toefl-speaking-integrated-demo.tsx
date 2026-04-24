import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Volume2, Mic, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import studentImage from "@assets/stock_images/professional_student_05543d81.jpg";
import conversationImage from "@assets/stock_images/university_students__1cb944cc.jpg";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleMediaRecorder,
  getSupportedMimeType
} from "@/lib/safariAudioCompat";

type Phase = "intro" | "reading" | "listening" | "question" | "preparation" | "speaking" | "complete";

export default function TOEFLSpeakingIntegratedDemo() {
  const { toast } = useToast();
  const [currentPhase, setCurrentPhase] = useState<Phase>("intro");
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sample test data
  const testData = {
    readingPassage: `Behavior Modification

Individuals often modify their behavior based on what they have learned about the possible consequences of their actions. When an individual learns through experience that a certain behavior results in pleasant consequences, that behavior is likely to be repeated. An unpleasant consequence, on the other hand, discourages further repetition of the behavior. While behavior modification can be observed in experiments, it also occurs frequently in everyday settings, when individuals change their behavior based on what they have learned about the consequences of that behavior.`,
    listeningScript: `This happens all the time with kids in schools. Say, there's a little boy or girl who's just starting school. Well, they're not really used to the rules about proper behavior for a classroom. So, at the beginning, they might, I don't know, interrupt the teacher, walk around the classroom when they are supposed to be sitting down. You know, just misbehaving in general. 

Ok, but what happens? Well, the teacher gets angry with them when they act this way. They may get punished. They have to sit at their desks when everyone else is allowed to go outside and play. And they certainly don't like that. Soon, they'll learn that this kind of behavior gets them in trouble. 

They also learn when they raise their hand to talk to the teacher and sit quietly and pay attention during class, they are rewarded. The teacher tells them she's proud of them and maybe puts little happy face stickers on their homework. Now their behavior gets a good reaction from the teacher. The kids learn to always act this way in class and not behave the way they used to.`,
    question: `Using the example from the lecture, explain what behavior modification is and how it works.`,
    sampleAnswer: `Behavior modification means that people tend to repeat behaviors that can bring pleasant consequences but stop behaviors leading to unpleasant consequences. The professor gives an example. Kids who just start school are not used to rules for classes. They may interrupt the teacher or walk around the classroom. Then the teacher may punish them by not allowing them to go outside and play. They know this gets them in trouble, so they will stop doing so. However, when they obey the rules like raising hand to talk to the teacher or pay attention to class, they are rewarded. The teacher will be proud of them and put happy face stickers on their homework. Because they get good reaction, they learn to always act this way.`
  };

  useEffect(() => {
    if (isTimerActive && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isTimerActive) {
      handlePhaseComplete();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timeRemaining]);

  const handlePhaseComplete = () => {
    setIsTimerActive(false);
    
    if (currentPhase === "reading") {
      setCurrentPhase("listening");
    } else if (currentPhase === "preparation") {
      setCurrentPhase("speaking");
      setTimeRemaining(60);
      setIsTimerActive(true);
    } else if (currentPhase === "speaking") {
      stopRecording();
      setCurrentPhase("complete");
    }
  };

  const startPhase = (phase: Phase, duration: number) => {
    setCurrentPhase(phase);
    setTimeRemaining(duration);
    setIsTimerActive(true);
  };

  const startRecording = async () => {
    try {
      await unlockAudioContext();
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const recorder = createSafariCompatibleMediaRecorder(stream);
      const chunks: BlobPart[] = [];
      const mimeType = getSupportedMimeType();

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blobType = mimeType.includes('mp4') ? 'audio/mp4' : 
                         mimeType.includes('ogg') ? 'audio/ogg' : 
                         mimeType.includes('wav') ? 'audio/wav' : 'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        const url = URL.createObjectURL(blob);
        setRecordedAudio(url);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error: any) {
      let message = "Please allow microphone access to record your response.";
      if (error.message === 'MEDIARECORDER_NOT_SUPPORTED') {
        message = "이 브라우저에서는 음성 녹음을 지원하지 않습니다. Chrome 또는 Firefox를 사용해주세요.";
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message = "마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.";
      } else if (error.name === 'NotFoundError') {
        message = "마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.";
      }
      toast({
        title: "Recording Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100">
      {/* Header */}
      <div className="bg-teal-500 border-b-2 border-teal-600 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/tests/toefl">
            <Button variant="ghost" size="sm" className="text-white hover:bg-teal-600" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-white text-xl font-bold uppercase tracking-wider" style={{fontFamily: 'Arial, sans-serif'}}>TOEFL Speaking</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-white text-sm font-semibold" style={{fontFamily: 'Arial, sans-serif'}}>Question 3 of 4</span>
          <div className="bg-teal-700 px-4 py-1 rounded text-white text-sm font-bold" style={{fontFamily: 'Arial, sans-serif'}}>
            00:00:00
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-8">
        <div className="w-full max-w-4xl">
          
          {/* Intro Phase */}
          {currentPhase === "intro" && (
            <div className="bg-white rounded-lg shadow-2xl p-12 text-center space-y-6 border-2 border-teal-200">
              <img 
                src={studentImage} 
                alt="Student with headphones" 
                className="w-48 h-48 rounded-full mx-auto object-cover border-4 border-teal-500"
              />
              <h2 className="text-3xl font-bold text-teal-700" style={{fontFamily: 'Arial, sans-serif'}}>
                TOEFL Speaking - Integrated Task
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto" style={{fontFamily: 'Arial, sans-serif'}}>
                You will read a short passage about a campus situation, listen to a conversation, and then speak about what you have learned.
              </p>
              <div className="space-y-3 text-left max-w-md mx-auto bg-teal-50 p-6 rounded-lg border border-teal-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold" style={{fontFamily: 'Arial, sans-serif'}}>1</div>
                  <span className="text-gray-700" style={{fontFamily: 'Arial, sans-serif'}}>Read the passage (45 seconds)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold" style={{fontFamily: 'Arial, sans-serif'}}>2</div>
                  <span className="text-gray-700" style={{fontFamily: 'Arial, sans-serif'}}>Listen to a conversation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold" style={{fontFamily: 'Arial, sans-serif'}}>3</div>
                  <span className="text-gray-700" style={{fontFamily: 'Arial, sans-serif'}}>Prepare your response (30 seconds)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold" style={{fontFamily: 'Arial, sans-serif'}}>4</div>
                  <span className="text-gray-700" style={{fontFamily: 'Arial, sans-serif'}}>Record your response (60 seconds)</span>
                </div>
              </div>
              <Button 
                onClick={() => startPhase("reading", 45)}
                className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-6 text-lg font-semibold"
                style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                data-testid="button-start-test"
              >
                Start Test
              </Button>
            </div>
          )}

          {/* Reading Phase */}
          {currentPhase === "reading" && (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-teal-200">
              <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{fontFamily: 'Arial, sans-serif'}}>Reading Time: 45 seconds</h3>
                <div className="text-3xl font-mono font-bold">
                  {formatTime(timeRemaining)}
                </div>
              </div>
              <div className="p-8">
                <div className="prose max-w-none text-gray-800 leading-relaxed text-lg" style={{fontFamily: 'Arial, sans-serif'}}>
                  {testData.readingPassage}
                </div>
              </div>
              <Progress value={(timeRemaining / 45) * 100} className="h-2 bg-teal-100" />
            </div>
          )}

          {/* Listening Phase */}
          {currentPhase === "listening" && (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-teal-200">
              <div className="bg-teal-600 text-white px-6 py-4 flex items-center space-x-3">
                <Volume2 className="w-6 h-6" />
                <h3 className="text-xl font-bold" style={{fontFamily: 'Arial, sans-serif'}}>Now listen to a professor discussing this concept.</h3>
              </div>
              <div className="p-8 text-center space-y-6">
                <img 
                  src={conversationImage} 
                  alt="Students conversation" 
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg border-2 border-teal-200"
                />
                <div className="bg-teal-50 p-6 rounded-lg text-left max-w-2xl mx-auto border border-teal-200">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line" style={{fontFamily: 'Arial, sans-serif'}}>
                    {testData.listeningScript}
                  </p>
                </div>
                <Button 
                  onClick={() => setCurrentPhase("question")}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3"
                  style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                  data-testid="button-continue-question"
                >
                  Continue to Question
                </Button>
              </div>
            </div>
          )}

          {/* Question Phase */}
          {currentPhase === "question" && (
            <div className="bg-white rounded-lg shadow-2xl p-12 text-center space-y-6 border-2 border-teal-200">
              <div className="bg-teal-50 border-l-4 border-teal-500 p-6 text-left">
                <p className="text-xl text-gray-800 font-semibold" style={{fontFamily: 'Arial, sans-serif'}}>
                  {testData.question}
                </p>
              </div>
              <div className="text-gray-600" style={{fontFamily: 'Arial, sans-serif'}}>
                <p className="mb-4">You will have 30 seconds to prepare your response.</p>
                <p>Then you will have 60 seconds to speak.</p>
              </div>
              <Button 
                onClick={() => startPhase("preparation", 30)}
                className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-6 text-lg font-semibold"
                style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                data-testid="button-start-preparation"
              >
                Begin Preparation
              </Button>
            </div>
          )}

          {/* Preparation Phase */}
          {currentPhase === "preparation" && (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-teal-200">
              <div className="bg-yellow-500 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{fontFamily: 'Arial, sans-serif'}}>Preparation Time</h3>
                <div className="text-3xl font-mono font-bold">
                  {formatTime(timeRemaining)}
                </div>
              </div>
              <Progress value={(timeRemaining / 30) * 100} className="h-2 bg-yellow-100" />
              <div className="p-12 text-center space-y-6">
                <div className="text-6xl animate-pulse">⏱️</div>
                <h2 className="text-3xl font-bold text-teal-700" style={{fontFamily: 'Arial, sans-serif'}}>Prepare Your Response</h2>
                <div className="bg-teal-50 border-l-4 border-teal-500 p-6 text-left max-w-2xl mx-auto">
                  <p className="text-lg text-gray-800" style={{fontFamily: 'Arial, sans-serif'}}>
                    {testData.question}
                  </p>
                </div>
                <p className="text-gray-600" style={{fontFamily: 'Arial, sans-serif'}}>
                  The speaking phase will begin automatically when preparation time ends.
                </p>
              </div>
            </div>
          )}

          {/* Speaking Phase */}
          {currentPhase === "speaking" && (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-teal-200">
              <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{fontFamily: 'Arial, sans-serif'}}>Response Time</h3>
                <div className="text-3xl font-mono font-bold">
                  {formatTime(timeRemaining)}
                </div>
              </div>
              <Progress value={(timeRemaining / 60) * 100} className="h-2 bg-red-100" />
              <div className="p-12 text-center space-y-6">
                {isRecording && (
                  <div className="flex items-center justify-center space-x-3 text-red-600">
                    <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-xl font-bold" style={{fontFamily: 'Arial, sans-serif'}}>RECORDING</span>
                  </div>
                )}
                
                <div className="text-6xl">{isRecording ? "🎙️" : "🎤"}</div>
                <h2 className="text-3xl font-bold text-teal-700" style={{fontFamily: 'Arial, sans-serif'}}>Speak Now</h2>
                
                <div className="bg-teal-50 border-l-4 border-teal-500 p-6 text-left max-w-2xl mx-auto">
                  <p className="text-lg text-gray-800" style={{fontFamily: 'Arial, sans-serif'}}>
                    {testData.question}
                  </p>
                </div>

                <div className="flex justify-center space-x-4">
                  {!isRecording ? (
                    <Button 
                      onClick={startRecording}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg"
                      style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                      data-testid="button-start-recording"
                    >
                      <Mic className="w-6 h-6 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopRecording}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-6 text-lg"
                      style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                      data-testid="button-stop-recording"
                    >
                      <Square className="w-6 h-6 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Complete Phase */}
          {currentPhase === "complete" && (
            <div className="bg-white rounded-lg shadow-2xl p-12 text-center space-y-6 border-2 border-teal-200">
              <div className="text-6xl">✅</div>
              <h2 className="text-3xl font-bold text-green-600" style={{fontFamily: 'Arial, sans-serif'}}>Response Recorded!</h2>
              <p className="text-gray-600 text-lg" style={{fontFamily: 'Arial, sans-serif'}}>
                Your response has been successfully recorded.
              </p>
              
              {recordedAudio && (
                <div className="bg-teal-50 p-6 rounded-lg border border-teal-200">
                  <p className="text-sm text-gray-600 mb-3" style={{fontFamily: 'Arial, sans-serif'}}>Play back your response:</p>
                  <audio controls src={recordedAudio} className="w-full" playsInline webkit-playsinline="true"></audio>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={() => {
                    setCurrentPhase("intro");
                    setTimeRemaining(60);
                    setRecordedAudio(null);
                  }}
                  variant="outline"
                  className="px-6 py-3 border-teal-300 text-teal-600 hover:bg-teal-50"
                  style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                  data-testid="button-retry"
                >
                  Try Another Question
                </Button>
                <Link href="/tests/toefl">
                  <Button className="bg-teal-500 hover:bg-teal-600 px-6 py-3" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}} data-testid="button-back-tests">
                    Back to Tests
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
