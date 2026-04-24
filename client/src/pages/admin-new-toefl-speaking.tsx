import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  Plus, 
  Edit, 
  Trash2,
  ArrowLeft,
  Save,
  FileText,
  Eye,
  EyeOff,
  Upload,
  RefreshCw,
  MessageCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseNewToeflSpeakingText, validateParsedSpeaking, type ParsedNewToeflSpeaking } from "@/lib/newToeflSpeakingParser";
import type { NewToeflSpeakingTest } from "@shared/schema";

export default function AdminNewToeflSpeakingPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTest, setEditingTest] = useState<NewToeflSpeakingTest | null>(null);
  
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedNewToeflSpeaking | null>(null);
  
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isActive, setIsActive] = useState(true);

  const { data: tests = [], isLoading: loadingTests } = useQuery<NewToeflSpeakingTest[]>({
    queryKey: ['/api/admin/new-toefl-speaking'],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await apiRequest("POST", "/api/admin/new-toefl-speaking", testData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-speaking'] });
      toast({ title: "Test saved", description: "Speaking test saved successfully." });
      setShowCreateForm(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save the test.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/new-toefl-speaking/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-speaking'] });
      toast({ title: "Test updated", description: "Changes saved successfully." });
      setEditingTest(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update the test.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/new-toefl-speaking/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-speaking'] });
      toast({ title: "Test deleted", description: "Test removed successfully." });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not delete the test.", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/admin-login");
      return;
    }

    if (!isLoading && isAuthenticated && user?.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "Admin privileges required.",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/");
      }, 1500);
      return;
    }
  }, [isLoading, isAuthenticated, user, toast, navigate]);

  const handleParseText = () => {
    if (!rawText.trim()) {
      toast({
        title: "No text provided",
        description: "Please paste the test content to parse.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsed = parseNewToeflSpeakingText(rawText);
      const validation = validateParsedSpeaking(parsed);
      
      if (!validation.valid) {
        toast({
          title: "Parsing issues",
          description: validation.errors.join("; "),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Parsing successful",
          description: `Found ${parsed.listenAndRepeat.statements.length} Listen & Repeat statements and ${parsed.takeAnInterview.questions.length} Interview questions`,
        });
      }
      
      setParsedData(parsed);
    } catch (error) {
      console.error("Parse error:", error);
      toast({
        title: "Parse error",
        description: "Failed to parse the text. Check format.",
        variant: "destructive",
      });
    }
  };

  const handleSaveTest = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for this test.",
        variant: "destructive",
      });
      return;
    }

    if (!parsedData) {
      toast({
        title: "No data",
        description: "Please parse the text first.",
        variant: "destructive",
      });
      return;
    }

    const testData = {
      title,
      listenAndRepeat: parsedData.listenAndRepeat,
      takeAnInterview: parsedData.takeAnInterview,
      difficulty,
      isActive
    };

    createMutation.mutate(testData);
  };

  const handleUpdateTest = () => {
    if (!editingTest) return;

    updateMutation.mutate({
      id: editingTest.id,
      updates: { title, difficulty, isActive }
    });
  };

  const handleDeleteTest = (id: string) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (test: NewToeflSpeakingTest) => {
    updateMutation.mutate({
      id: test.id,
      updates: { isActive: !test.isActive }
    });
  };

  const resetForm = () => {
    setRawText("");
    setParsedData(null);
    setTitle("");
    setDifficulty("medium");
    setIsActive(true);
  };

  const startEditing = (test: NewToeflSpeakingTest) => {
    setEditingTest(test);
    setTitle(test.title);
    setDifficulty(test.difficulty as "easy" | "medium" | "hard" || "medium");
    setIsActive(test.isActive ?? true);
  };

  const getQuestionCount = (test: NewToeflSpeakingTest) => {
    const listenRepeat = Array.isArray((test.listenAndRepeat as any)?.statements) 
      ? (test.listenAndRepeat as any).statements.length 
      : 0;
    const interview = Array.isArray((test.takeAnInterview as any)?.questions) 
      ? (test.takeAnInterview as any).questions.length 
      : 0;
    return listenRepeat + interview + 1;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New TOEFL Speaking (2026)</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage New TOEFL Speaking tests with Listen and Repeat and Take an Interview sections</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)} data-testid="button-create-test">
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Create New Speaking Test
              </CardTitle>
              <CardDescription>
                Paste raw text to parse and create a new speaking test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Raw Text (paste test content)</Label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Listen and Repeat
Directions:
You will listen as someone speaks to you. Listen carefully and then repeat what you have heard.
Context: You are training to work at a museum. Listen to your supervisor and repeat what she says.

Script for Audio:
Supervisor Statement 1: "Welcome to the City Art Museum."
Supervisor Statement 2: "Photography is permitted in most galleries."
...

Take an Interview
Directions:
An interviewer will ask you questions. Answer the questions and be sure to say as much as you can.
Context: You have agreed to participate in a survey about technology use.

Interview Script:
Interviewer Opening: "Thank you for participating in this survey today..."
Interviewer Question 2: "How do you feel technology affects your daily productivity?"
Interviewer Question 3: "Do you agree that people who use social media have richer social lives?"
Interviewer Question 4: "Do you think schools should restrict smartphone use?"`}
                  className="min-h-[300px] font-mono text-sm"
                  data-testid="input-raw-text"
                />
              </div>

              <Button onClick={handleParseText} data-testid="button-parse">
                <FileText className="w-4 h-4 mr-2" />
                Parse Text
              </Button>

              {parsedData && (
                <div className="space-y-4 border-t pt-4">
                  <Tabs defaultValue="listen-repeat" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="listen-repeat">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Listen & Repeat ({parsedData.listenAndRepeat.statements.length})
                      </TabsTrigger>
                      <TabsTrigger value="interview">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Interview ({parsedData.takeAnInterview.questions.length + 1})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="listen-repeat" className="space-y-2 max-h-[400px] overflow-y-auto">
                      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <Badge className="mb-2">Listen and Repeat</Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Directions:</strong> {parsedData.listenAndRepeat.directions}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Context:</strong> {parsedData.listenAndRepeat.context}
                        </p>
                      </div>
                      {parsedData.listenAndRepeat.statements.map((s, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-white dark:bg-gray-700">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline">S{s.id}</Badge>
                            <p className="text-sm flex-1">"{s.statement}"</p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="interview" className="space-y-2 max-h-[400px] overflow-y-auto">
                      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <Badge className="mb-2">Take an Interview</Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Directions:</strong> {parsedData.takeAnInterview.directions}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Context:</strong> {parsedData.takeAnInterview.context}
                        </p>
                      </div>
                      {parsedData.takeAnInterview.opening && (
                        <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
                          <div className="flex items-start gap-2">
                            <Badge variant="secondary">Opening</Badge>
                            <p className="text-sm flex-1 line-clamp-3">"{parsedData.takeAnInterview.opening}"</p>
                          </div>
                        </div>
                      )}
                      {parsedData.takeAnInterview.questions.map((q, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-white dark:bg-gray-700">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline">Q{q.id}</Badge>
                            <p className="text-sm flex-1 line-clamp-3">"{q.question}"</p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Test Title</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., New TOEFL Speaking Test 1"
                        data-testid="input-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={difficulty} onValueChange={(v: "easy" | "medium" | "hard") => setDifficulty(v)}>
                        <SelectTrigger data-testid="select-difficulty">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleSaveTest} 
                      disabled={createMutation.isPending}
                      data-testid="button-save"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createMutation.isPending ? "Saving..." : "Save Test"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateForm(false);
                        resetForm();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Speaking Tests
            </CardTitle>
            <CardDescription>
              {tests.length} test(s) available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTests ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No speaking tests yet. Create your first test above.
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((test) => (
                  <div 
                    key={test.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{test.title}</span>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getQuestionCount(test)} items
                          </Badge>
                          <Badge 
                            variant={test.difficulty === "hard" ? "destructive" : test.difficulty === "easy" ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {test.difficulty}
                          </Badge>
                          <Badge 
                            variant={test.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {test.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(test)}
                        data-testid={`button-toggle-${test.id}`}
                      >
                        {test.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(test)}
                        data-testid={`button-edit-${test.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTest(test.id)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${test.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingTest} onOpenChange={(open) => !open && setEditingTest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Speaking Test</DialogTitle>
              <DialogDescription>
                Update test details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-edit-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v: "easy" | "medium" | "hard") => setDifficulty(v)}>
                  <SelectTrigger data-testid="select-edit-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTest(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTest} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
