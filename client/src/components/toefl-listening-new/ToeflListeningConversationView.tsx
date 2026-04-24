import { ArrowRight, Clock, FileText, Headphones, Pause, Play, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Passage, ScriptLine } from "@/components/toefl-listening-new/shared";

interface ToeflListeningConversationViewProps {
  currentPassage: Passage;
  currentPassageIndex: number;
  passagesLength: number;
  showScript: boolean;
  isPlaying: boolean;
  currentTime: number;
  formatTime: (seconds: number) => string;
  togglePlayPause: () => void | Promise<void>;
  goToQuestions: () => void;
  currentScriptIndex: number;
}

export default function ToeflListeningConversationView({
  currentPassage,
  currentPassageIndex,
  passagesLength,
  showScript,
  isPlaying,
  currentTime,
  formatTime,
  togglePlayPause,
  goToQuestions,
  currentScriptIndex,
}: ToeflListeningConversationViewProps) {
  return (
    <div className="space-y-8">
      {showScript ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-240px)]">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-blue-50 backdrop-blur-sm h-full flex flex-col">
            <CardContent className="p-8 flex-1 flex flex-col justify-center overflow-hidden">
              <div className="text-center space-y-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  {currentPassage.type === "conversation" ? (
                    <Users className="w-5 h-5 text-pink-600" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  )}
                  <span
                    className={`text-sm font-medium uppercase tracking-wide ${
                      currentPassage.type === "conversation" ? "text-pink-600" : "text-purple-600"
                    }`}
                  >
                    {currentPassage.type}
                  </span>
                </div>

                <div className="flex items-center justify-center space-x-2 mb-6">
                  <span className="text-xs text-gray-500">
                    {currentPassageIndex + 1} of {passagesLength}
                  </span>
                  <div className="flex space-x-1">
                    {Array.from({ length: passagesLength }).map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentPassageIndex
                            ? "bg-pink-500"
                            : index < currentPassageIndex
                              ? "bg-green-500"
                              : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="relative mx-auto w-80 h-52 rounded-2xl overflow-hidden shadow-2xl">
                  <img src={currentPassage.image} alt="Listening Comprehension" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-semibold text-lg">{currentPassage.title}</h3>
                    <p className="text-white/80 text-sm">
                      {currentPassage.type === "conversation" ? "Campus Conversation" : "Academic Lecture"}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <Button
                    onClick={togglePlayPause}
                    size="lg"
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-2xl transition-all transform hover:scale-110 active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                  </Button>

                  <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/60">
                    <div className="flex items-center justify-center space-x-4 text-sm text-slate-700 mb-3">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">
                        {formatTime(currentTime)} / {formatTime(currentPassage.duration || 180)}
                      </span>
                    </div>

                    <Progress value={(currentTime / (currentPassage.duration || 180)) * 100} className="w-full h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm h-full flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center space-x-3 mb-6 flex-shrink-0">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-800 text-lg">Audio Script</h4>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {Array.isArray(currentPassage.script) ? (
                  currentPassage.script.map((line: ScriptLine, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl transition-all duration-300 ${
                        index === currentScriptIndex
                          ? "bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 shadow-lg transform scale-105"
                          : "bg-white/70 hover:bg-white/90 border border-slate-200/50"
                      }`}
                    >
                      <div className="flex space-x-3">
                        <div
                          className={`font-bold min-w-0 flex-shrink-0 px-2 py-1 rounded-md text-xs uppercase tracking-wide ${
                            index === currentScriptIndex ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {line.speaker}
                        </div>
                        <span
                          className={`leading-relaxed ${
                            index === currentScriptIndex ? "text-slate-900 font-medium" : "text-slate-700"
                          }`}
                        >
                          {line.text}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-xl bg-white/70 border border-slate-200/50">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">{currentPassage.script}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50 to-indigo-100 backdrop-blur-sm">
          <CardContent className="p-12">
            <div className="text-center space-y-8">
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  <span className="text-lg font-medium text-blue-600 uppercase tracking-wide">{currentPassage.type}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{currentPassage.title}</h2>
              </div>

              <div className="relative mx-auto w-96 h-64 rounded-2xl overflow-hidden shadow-2xl">
                <img src={currentPassage.image} alt="Listening Comprehension" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white text-lg font-medium">Listen carefully to the audio content</p>
                  <p className="text-white/80 text-sm">
                    You can replay the audio multiple times before proceeding to questions
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <Button
                  onClick={togglePlayPause}
                  size="lg"
                  className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-2xl transition-all transform hover:scale-110 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
                </Button>

                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/60 max-w-md mx-auto">
                  <div className="flex items-center justify-center space-x-4 text-slate-700 mb-4">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold text-lg">
                      {formatTime(currentTime)} / {formatTime(currentPassage.duration || 180)}
                    </span>
                  </div>

                  <Progress value={(currentTime / (currentPassage.duration || 180)) * 100} className="w-full h-3" />
                </div>
              </div>

              <Button
                size="sm"
                onClick={goToQuestions}
                className="flex items-center gap-2 bg-white text-pink-600 hover:bg-gray-100 shadow-lg transition-all transform hover:scale-105 mx-auto"
              >
                Begin Questions
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
