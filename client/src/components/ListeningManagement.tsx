import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  Music 
} from "lucide-react";

export default function ListeningManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for now - should be replaced with API calls
  const listeningTests = [
    {
      id: "1",
      title: "TOEFL Listening Practice Test 1",
      description: "University Conversation and Academic Lecture",
      audioUrl: "/audio/listening-test-1.mp3",
      duration: 480,
      questionCount: 6,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-charcoal">TOEFL Listening Tests</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Listening Test
        </Button>
      </div>

      {/* Create Listening Test Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Listening Test</CardTitle>
            <CardDescription>Add a new TOEFL Listening test with audio and questions</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Test Title</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="e.g., TOEFL Listening Practice Test 1"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input 
                    id="duration" 
                    name="duration" 
                    type="number" 
                    placeholder="e.g., 480"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  name="description" 
                  placeholder="Brief description of the listening content"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audioUrl">Audio File URL</Label>
                <Input 
                  id="audioUrl" 
                  name="audioUrl" 
                  type="url" 
                  placeholder="https://example.com/audio.mp3"
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="script">Audio Script (JSON)</Label>
                <Textarea 
                  id="script" 
                  name="script" 
                  rows={6}
                  placeholder='[{"start": 0, "end": 10, "text": "Woman: I need to find a quiet place to practice piano..."}, ...]'
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">Image URLs (comma-separated)</Label>
                <Input 
                  id="images" 
                  name="images" 
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  Create Test
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listening Tests List */}
      <div className="grid gap-4">
        {listeningTests.map((test) => (
          <Card key={test.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{test.title}</h3>
                    <Badge variant={test.isActive ? "default" : "secondary"}>
                      {test.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      <Music className="h-3 w-3 mr-1" />
                      {Math.floor(test.duration / 60)}:{(test.duration % 60).toString().padStart(2, '0')}
                    </Badge>
                  </div>
                  
                  <p className="text-cool-gray mb-3">{test.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-cool-gray">
                    <span className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {test.questionCount} questions
                    </span>
                    <span>Created: {new Date(test.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedTest(test.id);
                      setShowQuestionForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Questions
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Question Form */}
      {showQuestionForm && selectedTest && (
        <Card>
          <CardHeader>
            <CardTitle>Add Question to Listening Test</CardTitle>
            <CardDescription>Create a new question for the selected listening test</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="questionType">Question Type</Label>
                  <Select name="questionType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="multiple-select">Multiple Select (2 answers)</SelectItem>
                      <SelectItem value="replay">Replay Question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input 
                    id="points" 
                    name="points" 
                    type="number" 
                    placeholder="1"
                    defaultValue="1"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionText">Question Text</Label>
                <Textarea 
                  id="questionText" 
                  name="questionText" 
                  rows={3}
                  placeholder="What does the woman want to do?"
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="options">Answer Options (one per line)</Label>
                <Textarea 
                  id="options" 
                  name="options" 
                  rows={4}
                  placeholder="Find a quiet place to practice piano&#10;Reserve a practice room in the music building&#10;Talk to her piano teacher&#10;Ask the man for help"
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correctAnswer">Correct Answer</Label>
                <Input 
                  id="correctAnswer" 
                  name="correctAnswer" 
                  placeholder="Find a quiet place to practice piano"
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation</Label>
                <Textarea 
                  id="explanation" 
                  name="explanation" 
                  rows={2}
                  placeholder="The woman clearly states that she needs a quiet place to practice piano..."
                  required 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audioSegment">Audio Segment (JSON)</Label>
                  <Input 
                    id="audioSegment" 
                    name="audioSegment" 
                    placeholder='{"start": 0, "end": 30}'
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replaySegment">Replay Segment (JSON, for replay questions)</Label>
                  <Input 
                    id="replaySegment" 
                    name="replaySegment" 
                    placeholder='{"start": 10, "end": 20}'
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionImages">Question Images (comma-separated URLs)</Label>
                <Input 
                  id="questionImages" 
                  name="questionImages" 
                  placeholder="https://example.com/q1-image.jpg, https://example.com/q1-diagram.jpg"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  Add Question
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowQuestionForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}