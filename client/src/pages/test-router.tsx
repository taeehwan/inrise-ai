import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type RoutableTest = {
  examType: "toefl" | "gre" | "sat";
  section: string;
};

export default function TestRouter() {
  const { testId } = useParams();
  const [, setLocation] = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  const { data: test, isLoading } = useQuery<RoutableTest>({
    queryKey: ['/api/tests', testId],
    enabled: !!testId,
  });

  useEffect(() => {
    if (test && !redirecting) {
      setRedirecting(true);
      
      // Redirect based on exam section
      let redirectPath = '/';
      
      if (test.examType === 'toefl') {
        switch (test.section) {
          case 'reading':
            redirectPath = `/toefl-reading/${testId}`;
            break;
          case 'listening':
            redirectPath = `/toefl-listening/${testId}`;
            break;
          case 'speaking':
            redirectPath = `/toefl-speaking-new/${testId}`;
            break;
          case 'writing':
            redirectPath = `/toefl-writing/${testId}`;
            break;
          default:
            redirectPath = '/tests';
        }
      } else if (test.examType === 'gre') {
        switch (test.section) {
          case 'verbal':
            redirectPath = `/gre/verbal-reasoning/${testId}`;
            break;
          case 'quantitative':
            redirectPath = `/gre/quantitative-reasoning/${testId}`;
            break;
          case 'analytical':
            redirectPath = `/gre/analytical-writing/${testId}`;
            break;
          default:
            redirectPath = '/tests';
        }
      }

      console.log(`Redirecting to: ${redirectPath}`);
      setLocation(redirectPath);
    }
  }, [test, testId, setLocation, redirecting]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading test...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="p-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Redirecting...</p>
      </Card>
    </div>
  );
}
