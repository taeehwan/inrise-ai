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
  Headphones, 
  Plus, 
  Edit, 
  Trash2,
  ArrowLeft,
  Save,
  FileText,
  Eye,
  EyeOff,
  Upload,
  MessageSquare,
  Radio,
  GraduationCap
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
import { parseNewToeflListeningText, validateParsedListening, type ParsedNewToeflListening } from "@/lib/newToeflListeningParser";
import type { NewToeflListeningTest } from "@shared/schema";

export default function AdminNewToeflListeningPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTest, setEditingTest] = useState<NewToeflListeningTest | null>(null);
  
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedNewToeflListening | null>(null);
  
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isActive, setIsActive] = useState(true);

  const { data: tests = [], isLoading: loadingTests } = useQuery<NewToeflListeningTest[]>({
    queryKey: ['/api/admin/new-toefl-listening'],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await apiRequest("POST", "/api/admin/new-toefl-listening", testData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-listening'] });
      toast({ title: "Test saved", description: "Listening test saved successfully." });
      setShowCreateForm(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save the test.", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/new-toefl-listening/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-listening'] });
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
      await apiRequest("DELETE", `/api/admin/new-toefl-listening/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-listening'] });
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
      const parsed = parseNewToeflListeningText(rawText);
      const validation = validateParsedListening(parsed);
      
      if (!validation.valid) {
        toast({
          title: "Parsing issues",
          description: validation.errors.join("; "),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Parsing successful",
          description: `Found ${parsed.listenAndChoose.length} Listen & Choose, ${parsed.conversations.length} Conversations, ${parsed.announcements.length} Announcements, ${parsed.academicTalks.length} Academic Talks`,
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
      listenAndChoose: parsedData.listenAndChoose,
      conversations: parsedData.conversations,
      announcements: parsedData.announcements,
      academicTalks: parsedData.academicTalks,
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

  const handleToggleActive = (test: NewToeflListeningTest) => {
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

  const startEditing = (test: NewToeflListeningTest) => {
    setEditingTest(test);
    setTitle(test.title);
    setDifficulty(test.difficulty as "easy" | "medium" | "hard" || "medium");
    setIsActive(test.isActive ?? true);
  };

  const getQuestionCount = (test: NewToeflListeningTest) => {
    const listenAndChoose = Array.isArray(test.listenAndChoose) ? test.listenAndChoose.length : 0;
    const conversations = Array.isArray(test.conversations) 
      ? test.conversations.reduce((sum: number, c: any) => sum + (c.questions?.length || 0), 0) : 0;
    const announcements = Array.isArray(test.announcements)
      ? test.announcements.reduce((sum: number, a: any) => sum + (a.questions?.length || 0), 0) : 0;
    const academicTalks = Array.isArray(test.academicTalks)
      ? test.academicTalks.reduce((sum: number, t: any) => sum + (t.questions?.length || 0), 0) : 0;
    return listenAndChoose + conversations + announcements + academicTalks;
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New TOEFL Listening (2026)</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage New TOEFL Listening tests with Listen & Choose, Conversations, Announcements, and Academic Talks</p>
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
                Create New Listening Test
              </CardTitle>
              <CardDescription>
                Paste raw text to parse and create a new listening test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Raw Text (paste test content)</Label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Listen and Choose a Response (Questions 1-8)
Question 1 Woman: Where is the student health center? Man: (A) Student Union building... (B)... (C)... (D)...

Conversation (Questions 9-10)
Student: Professor Kim, I missed yesterday's exam...
Question 9: Why can the student take a makeup exam? (A)... (B)... (C)... (D)...

Announcement (Questions 13-14)
Attention students: Starting Monday, new parking rules...
Question 13: Commuter permit cost? (A)... (B)... (C)... (D)...

Academic Talk (Questions 15-20)
Podcast Host: Have you ever wondered...
Question 15: Short-term memory capacity? (A)... (B)... (C)... (D)...`}
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
                  <Tabs defaultValue="listen-choose" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="listen-choose">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Listen & Choose ({parsedData.listenAndChoose.length})
                      </TabsTrigger>
                      <TabsTrigger value="conversations">
                        <Radio className="w-4 h-4 mr-1" />
                        Conversations ({parsedData.conversations.length})
                      </TabsTrigger>
                      <TabsTrigger value="announcements">
                        <Radio className="w-4 h-4 mr-1" />
                        Announcements ({parsedData.announcements.length})
                      </TabsTrigger>
                      <TabsTrigger value="academic">
                        <GraduationCap className="w-4 h-4 mr-1" />
                        Academic ({parsedData.academicTalks.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="listen-choose" className="space-y-2 max-h-[400px] overflow-y-auto">
                      {parsedData.listenAndChoose.map((q, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline">Q{q.id}</Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{q.dialogue}</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {q.options.map((opt, j) => (
                                  <div key={j} className={`text-xs p-1 rounded ${String.fromCharCode(65 + j) === q.correctAnswer ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    {String.fromCharCode(65 + j)}) {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="conversations" className="space-y-2 max-h-[400px] overflow-y-auto">
                      {parsedData.conversations.map((passage, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Badge className="mb-2">{passage.title}</Badge>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                            {passage.content}
                          </p>
                          <p className="text-sm font-medium mt-2">
                            {passage.questions.length} questions
                          </p>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="announcements" className="space-y-2 max-h-[400px] overflow-y-auto">
                      {parsedData.announcements.map((passage, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Badge className="mb-2">{passage.title}</Badge>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                            {passage.content}
                          </p>
                          <p className="text-sm font-medium mt-2">
                            {passage.questions.length} questions
                          </p>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="academic" className="space-y-2 max-h-[400px] overflow-y-auto">
                      {parsedData.academicTalks.map((passage, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <Badge className="mb-2">{passage.title}</Badge>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                            {passage.content}
                          </p>
                          <p className="text-sm font-medium mt-2">
                            {passage.questions.length} questions
                          </p>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>

                  <div className="border-t pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="New TOEFL Listening Test 1"
                          data-testid="input-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Difficulty</Label>
                        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
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
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveTest} 
                        disabled={createMutation.isPending || !parsedData}
                        data-testid="button-save"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {createMutation.isPending ? "Saving..." : "Save Test"}
                      </Button>
                      <Button variant="outline" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              Existing Tests ({tests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTests ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : tests.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No listening tests created yet.</p>
            ) : (
              <div className="space-y-4">
                {tests.map((test) => (
                  <div 
                    key={test.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`test-item-${test.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Headphones className="w-8 h-8 text-pink-500" />
                      <div>
                        <h3 className="font-medium">{test.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{getQuestionCount(test)} questions</Badge>
                          <Badge variant={test.difficulty === "easy" ? "secondary" : test.difficulty === "hard" ? "destructive" : "default"}>
                            {test.difficulty}
                          </Badge>
                          <Badge variant={test.isActive ? "default" : "secondary"}>
                            {test.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(test)}
                        data-testid={`button-toggle-${test.id}`}
                      >
                        {test.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(test)}
                        data-testid={`button-edit-${test.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTest(test.id)}
                        data-testid={`button-delete-${test.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingTest} onOpenChange={() => { setEditingTest(null); resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Listening Test</DialogTitle>
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
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingTest(null); resetForm(); }}>
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
