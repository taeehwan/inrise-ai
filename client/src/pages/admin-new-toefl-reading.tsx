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
  BookOpen, 
  Plus, 
  Edit, 
  Trash2,
  ArrowLeft,
  Save,
  FileText,
  Eye,
  EyeOff,
  Upload,
  Check
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
import { parseNewToeflReadingText, type ParsedNewToeflReading } from "@/lib/newToeflReadingParser";
import type { NewToeflReadingTest, CompleteWordsData, ComprehensionPassageData, AcademicPassageData } from "@shared/schema";

export default function AdminNewToeflReadingPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTest, setEditingTest] = useState<NewToeflReadingTest | null>(null);
  
  const [rawText, setRawText] = useState("");
  const [parsedModules, setParsedModules] = useState<ParsedNewToeflReading[]>([]);
  const [selectedModule, setSelectedModule] = useState<ParsedNewToeflReading | null>(null);
  
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isActive, setIsActive] = useState(true);

  // React Query for fetching tests
  const { data: tests = [], isLoading: loadingTests } = useQuery<NewToeflReadingTest[]>({
    queryKey: ['/api/admin/new-toefl-reading'],
    enabled: isAuthenticated && user?.role === "admin",
  });

  // Mutation for creating tests
  const createMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await apiRequest("POST", "/api/admin/new-toefl-reading", testData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-reading'] });
      toast({ title: "Test saved", description: "Module saved successfully." });
      setShowCreateForm(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save the test.", variant: "destructive" });
    }
  });

  // Mutation for updating tests
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/new-toefl-reading/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-reading'] });
      toast({ title: "Test updated", description: "Changes saved successfully." });
      setEditingTest(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update the test.", variant: "destructive" });
    }
  });

  // Mutation for deleting tests
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/new-toefl-reading/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-reading'] });
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
      const modules = parseNewToeflReadingText(rawText);
      setParsedModules(modules);
      
      if (modules.length === 0) {
        toast({
          title: "No modules found",
          description: "Could not parse any modules from the text. Make sure text starts with 'Reading Section, Module 1' or 'Reading Section, Module 2'.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Parsing successful",
          description: `Found ${modules.length} module(s).`,
        });
        setSelectedModule(modules[0]);
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast({
        title: "Parse error",
        description: "Failed to parse the text. Check format.",
        variant: "destructive",
      });
    }
  };

  const handleSaveModule = (module: ParsedNewToeflReading) => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for this test.",
        variant: "destructive",
      });
      return;
    }

    const testData = {
      title,
      moduleNumber: module.moduleNumber,
      completeWords: module.completeWords,
      comprehensionPassages: module.comprehensionPassages,
      academicPassage: module.academicPassage,
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

  const handleToggleActive = (test: NewToeflReadingTest) => {
    updateMutation.mutate({
      id: test.id,
      updates: { isActive: !test.isActive }
    });
  };

  const resetForm = () => {
    setRawText("");
    setParsedModules([]);
    setSelectedModule(null);
    setTitle("");
    setDifficulty("medium");
    setIsActive(true);
  };

  const startEditing = (test: NewToeflReadingTest) => {
    setEditingTest(test);
    setTitle(test.title);
    setDifficulty(test.difficulty as "easy" | "medium" | "hard" || "medium");
    setIsActive(test.isActive ?? true);
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New TOEFL Reading (2026)</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage New TOEFL Reading tests with Complete Words, Comprehension, and Academic passages</p>
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
                Create New Test
              </CardTitle>
              <CardDescription>
                Paste raw text to parse and create a new test module
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Raw Text (paste test content)</Label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Reading Section, Module 1

Complete the Words
Fill in the missing letters to complete each word.

Social me__ __ __ has become...

Read a notice.
...

Read an email.
...

Read an academic passage.
...`}
                  className="min-h-[300px] font-mono text-sm"
                  data-testid="input-raw-text"
                />
              </div>

              <Button onClick={handleParseText} data-testid="button-parse">
                <FileText className="w-4 h-4 mr-2" />
                Parse Text
              </Button>

              {parsedModules.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex gap-2">
                    {parsedModules.map((module) => (
                      <Button
                        key={module.moduleNumber}
                        variant={selectedModule?.moduleNumber === module.moduleNumber ? "default" : "outline"}
                        onClick={() => setSelectedModule(module)}
                        data-testid={`button-select-module-${module.moduleNumber}`}
                      >
                        Module {module.moduleNumber}
                      </Button>
                    ))}
                  </div>

                  {selectedModule && (
                    <Tabs defaultValue="complete-words" className="w-full">
                      <TabsList>
                        <TabsTrigger value="complete-words">Complete Words ({selectedModule.completeWords.answers.length})</TabsTrigger>
                        <TabsTrigger value="comprehension">Comprehension ({selectedModule.comprehensionPassages.length})</TabsTrigger>
                        <TabsTrigger value="academic">Academic ({selectedModule.academicPassage.questions.length})</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="complete-words" className="space-y-2">
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{selectedModule.completeWords.paragraph.slice(0, 500)}...</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedModule.completeWords.answers.map((a, i) => (
                            <Badge key={i} variant="secondary">
                              {a.word} ({a.missingLetters})
                            </Badge>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="comprehension" className="space-y-2">
                        {selectedModule.comprehensionPassages.map((passage, i) => (
                          <div key={i} className="border rounded-lg p-4">
                            <Badge>{passage.type}</Badge>
                            <h4 className="font-medium mt-2">{passage.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {passage.questions.length} questions
                            </p>
                          </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="academic" className="space-y-2">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium">{selectedModule.academicPassage.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {selectedModule.academicPassage.content.slice(0, 200)}...
                          </p>
                          <p className="text-sm mt-2">
                            {selectedModule.academicPassage.questions.length} questions
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}

                  <div className="border-t pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="New TOEFL Reading Test 1"
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
                        onClick={() => selectedModule && handleSaveModule(selectedModule)} 
                        disabled={createMutation.isPending || !selectedModule}
                        data-testid="button-save"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {createMutation.isPending ? "Saving..." : "Save Module"}
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
              <BookOpen className="w-5 h-5" />
              Existing Tests ({tests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTests ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : tests.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tests created yet.</p>
            ) : (
              <div className="space-y-4">
                {tests.map((test) => (
                  <div 
                    key={test.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`test-item-${test.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium">{test.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">Module {test.moduleNumber}</Badge>
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
              <DialogTitle>Edit Test</DialogTitle>
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
