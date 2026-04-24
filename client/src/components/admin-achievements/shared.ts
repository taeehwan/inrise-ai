export interface Achievement {
  id: string;
  photoUrl: string;
  videoUrl?: string;
  previousScore: number;
  currentScore: number;
  examType: "toefl" | "gre";
  reviewText: string;
  reviewerName: string;
  reviewerCountry: string;
  rating: number;
  isDisplayed: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
