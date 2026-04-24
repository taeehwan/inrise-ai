import type { ListenAndRepeatData, TakeAnInterviewData } from "@shared/schema";

export interface ParsedNewToeflSpeaking {
  listenAndRepeat: ListenAndRepeatData;
  takeAnInterview: TakeAnInterviewData;
}

export function parseNewToeflSpeakingText(rawText: string): ParsedNewToeflSpeaking {
  const listenAndRepeat = parseListenAndRepeat(rawText);
  const takeAnInterview = parseTakeAnInterview(rawText);
  
  return {
    listenAndRepeat,
    takeAnInterview,
  };
}

function parseListenAndRepeat(content: string): ListenAndRepeatData {
  const defaultData: ListenAndRepeatData = {
    directions: "You will listen as someone speaks to you. Listen carefully and then repeat what you have heard. The clock will indicate how much time you have to speak. No time for preparation will be provided.",
    context: "",
    statements: [],
  };
  
  const sectionMatch = content.match(/Listen and Repeat[\s\S]*?(?=Take an Interview|$)/i);
  if (!sectionMatch) return defaultData;
  
  const sectionContent = sectionMatch[0];
  
  const directionsMatch = sectionContent.match(/Directions:\s*([\s\S]*?)(?=Context:|Script for Audio:|$)/i);
  if (directionsMatch) {
    defaultData.directions = directionsMatch[1].trim().replace(/\n/g, ' ');
  }
  
  const contextMatch = sectionContent.match(/Context:\s*([\s\S]*?)(?=Script for Audio:|$)/i);
  if (contextMatch) {
    defaultData.context = contextMatch[1].trim().replace(/\n/g, ' ');
  }
  
  const statementPattern = /(?:Supervisor\s+)?Statement\s*(\d+):\s*"([^"]+)"/gi;
  let match;
  while ((match = statementPattern.exec(sectionContent)) !== null) {
    defaultData.statements.push({
      id: parseInt(match[1]),
      statement: match[2].trim(),
    });
  }
  
  if (defaultData.statements.length === 0) {
    const altPattern = /(\d+)\.\s*"([^"]+)"/g;
    while ((match = altPattern.exec(sectionContent)) !== null) {
      defaultData.statements.push({
        id: parseInt(match[1]),
        statement: match[2].trim(),
      });
    }
  }
  
  return defaultData;
}

function parseTakeAnInterview(content: string): TakeAnInterviewData {
  const defaultData: TakeAnInterviewData = {
    directions: "An interviewer will ask you questions. Answer the questions and be sure to say as much as you can in the time allowed. No time for preparation will be provided.",
    context: "",
    opening: "",
    questions: [],
  };
  
  const sectionMatch = content.match(/Take an Interview[\s\S]*/i);
  if (!sectionMatch) return defaultData;
  
  const sectionContent = sectionMatch[0];
  
  const directionsMatch = sectionContent.match(/Directions:\s*([\s\S]*?)(?=Context:|Interview Script:|$)/i);
  if (directionsMatch) {
    defaultData.directions = directionsMatch[1].trim().replace(/\n/g, ' ');
  }
  
  const contextMatch = sectionContent.match(/Context:\s*([\s\S]*?)(?=Interview Script:|$)/i);
  if (contextMatch) {
    defaultData.context = contextMatch[1].trim().replace(/\n/g, ' ');
  }
  
  const openingMatch = sectionContent.match(/Interviewer\s+Opening:\s*"([^"]+)"/i);
  if (openingMatch) {
    defaultData.opening = openingMatch[1].trim();
  }
  
  const questionPattern = /Interviewer\s+Question\s*(\d+):\s*"([^"]+)"/gi;
  let match;
  while ((match = questionPattern.exec(sectionContent)) !== null) {
    defaultData.questions.push({
      id: parseInt(match[1]),
      question: match[2].trim(),
    });
  }
  
  return defaultData;
}

export function validateParsedSpeaking(parsed: ParsedNewToeflSpeaking): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!parsed.listenAndRepeat.context) {
    errors.push("Listen and Repeat context is missing");
  }
  
  if (parsed.listenAndRepeat.statements.length === 0) {
    errors.push("No Listen and Repeat statements found");
  }
  
  if (!parsed.takeAnInterview.context) {
    errors.push("Take an Interview context is missing");
  }
  
  if (!parsed.takeAnInterview.opening) {
    errors.push("Interview opening statement is missing");
  }
  
  if (parsed.takeAnInterview.questions.length === 0) {
    errors.push("No interview questions found");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
