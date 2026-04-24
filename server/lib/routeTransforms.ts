export function extractSectionFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("reading")) return "reading";
  if (titleLower.includes("listening")) return "listening";
  if (titleLower.includes("speaking")) return "speaking";
  if (titleLower.includes("writing")) return "writing";
  if (titleLower.includes("verbal")) return "verbal";
  if (titleLower.includes("quantitative")) return "quantitative";
  if (titleLower.includes("analytical")) return "analytical";
  return "reading";
}

export function inferExclusiveSectionFromTitle(title: string): string | null {
  const titleLower = title.toLowerCase();
  if (
    titleLower.includes("reading") &&
    !titleLower.includes("listening") &&
    !titleLower.includes("speaking") &&
    !titleLower.includes("writing")
  ) {
    return "reading";
  }
  if (
    titleLower.includes("listening") &&
    !titleLower.includes("reading") &&
    !titleLower.includes("speaking") &&
    !titleLower.includes("writing")
  ) {
    return "listening";
  }
  if (
    titleLower.includes("speaking") &&
    !titleLower.includes("reading") &&
    !titleLower.includes("listening") &&
    !titleLower.includes("writing")
  ) {
    return "speaking";
  }
  if (
    titleLower.includes("writing") &&
    !titleLower.includes("reading") &&
    !titleLower.includes("listening") &&
    !titleLower.includes("speaking")
  ) {
    return "writing";
  }
  if (titleLower.includes("verbal") && !titleLower.includes("quantitative")) {
    return "verbal";
  }
  if (titleLower.includes("quantitative") && !titleLower.includes("verbal")) {
    return "quantitative";
  }
  if (titleLower.includes("analytical")) {
    return "analytical";
  }
  return null;
}

export function normalizeToToefl30(score: number): number {
  if (score > 30) {
    return Math.min(30, Math.round(score * 0.3));
  }
  return Math.min(30, Math.max(0, Math.round(score)));
}

export function inferScriptType(content: string): string {
  const lowerContent = content.toLowerCase();

  if (
    /listen to (a |part of a )?lecture/i.test(lowerContent) ||
    /professor:/i.test(lowerContent) ||
    /in a .*(class|course)/i.test(lowerContent)
  ) {
    return "lecture";
  }

  if (
    (/student(\s*\d*)?\s*:/i.test(lowerContent) &&
      (/advisor\s*:/i.test(lowerContent) || /librarian\s*:/i.test(lowerContent))) ||
    (/\bman\s*:/i.test(lowerContent) && /\bwoman\s*:/i.test(lowerContent))
  ) {
    return "conversation";
  }

  if (
    /announcement/i.test(lowerContent) ||
    /attention (students|everyone)/i.test(lowerContent)
  ) {
    return "conversation";
  }

  return "lecture";
}

export function cleanScriptForTTS(content: string): string {
  let cleaned = content;

  const questionPatterns = [
    /\n\s*1\.\s+What\s+(is|are|does|did|was|were|do|has|have)\s+/i,
    /\n\s*Question\s*1[:\.]?\s*/i,
    /\n\s*\[Questions?\]/i,
    /\nLecture\s*\n\s*1\.\s+/i,
  ];

  for (const pattern of questionPatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index);
      break;
    }
  }

  if (cleaned.length > 4000) {
    cleaned = cleaned.substring(0, 4000);
  }

  return cleaned.trim();
}

export function normalizeAnswerToLetter(answer: unknown, opts: unknown[]): string {
  if (typeof answer === "number" && answer >= 0 && answer < 26) {
    return String.fromCharCode(65 + answer);
  }

  let ansStr = String(answer).trim();
  ansStr = ansStr.replace(/^(정답|answer|correct answer|correct|ans)[:\s\-]*/i, "").trim();

  if (/^[0-4]$/.test(ansStr)) {
    return String.fromCharCode(65 + parseInt(ansStr, 10));
  }

  if (/^[A-Ea-e][\.\:\)\s\-]?$/.test(ansStr)) {
    return ansStr.charAt(0).toUpperCase();
  }

  const circledMatch = ansStr.match(/[①②③④⑤⑥⑦⑧⑨⑩]/);
  if (circledMatch) {
    const circledIndex = "①②③④⑤⑥⑦⑧⑨⑩".indexOf(circledMatch[0]);
    if (circledIndex >= 0 && circledIndex < 5) {
      return String.fromCharCode(65 + circledIndex);
    }
  }

  const keycapMatch = ansStr.match(/[1-5]/);
  if (keycapMatch) {
    const digit = parseInt(keycapMatch[0], 10);
    if (!ansStr.match(/[A-Ea-e]/) && digit >= 1 && digit <= 5) {
      return String.fromCharCode(64 + digit);
    }
  }

  if (opts.length > 0) {
    const idx = opts.findIndex((opt) => String(opt).trim() === ansStr);
    if (idx >= 0 && idx < 5) {
      return String.fromCharCode(65 + idx);
    }
  }

  const letterStartMatch = ansStr.toUpperCase().match(/^[A-E][\.\:\)\s\-]/);
  if (letterStartMatch) {
    return letterStartMatch[0].charAt(0);
  }

  return ansStr;
}

export function detectAttemptSection(testId?: string, sectionScores?: unknown): string {
  if (sectionScores && typeof sectionScores === "object" && "section" in sectionScores) {
    return String((sectionScores as { section?: string }).section || "unknown");
  }
  if (!testId) return "unknown";
  const id = testId.toLowerCase();
  if (id.includes("reading") || id.includes("read")) return "reading";
  if (id.includes("listening") || id.includes("listen")) return "listening";
  if (id.includes("speaking") || id.includes("speak")) return "speaking";
  if (id.includes("writing") || id.includes("write")) return "writing";
  if (id.includes("verbal")) return "verbal";
  if (id.includes("quantitative") || id.includes("quant")) return "quantitative";
  if (id.includes("analytical")) return "analytical";
  return "general";
}

export function detectAttemptExamType(testId?: string, sectionScores?: unknown): string {
  if (sectionScores && typeof sectionScores === "object" && "examType" in sectionScores) {
    return String((sectionScores as { examType?: string }).examType || "toefl");
  }
  if (!testId) return "toefl";
  const id = testId.toLowerCase();
  if (id.includes("gre")) return "gre";
  if (id.includes("sat")) return "sat";
  return "toefl";
}
