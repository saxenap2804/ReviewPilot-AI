export type Severity = "high" | "medium" | "low";

export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface Finding {
  file: string;
  severity: Severity;
  message: string;
}

export interface ReviewResult {
  filesChanged: number;
  additions: number;
  deletions: number;
  riskScore: number;
  findings: Finding[];
}

const RULES: Array<{
  pattern: RegExp;
  severity: Severity;
  message: string;
}> = [
  {
    pattern: /\beval\s*\(/,
    severity: "high",
    message: "Avoid eval(); it can execute untrusted code.",
  },
  {
    pattern:
      /(api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"']+["']/i,
    severity: "high",
    message: "Possible hardcoded credential detected.",
  },
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: "medium",
    message: "Empty catch block may hide important errors.",
  },
  {
    pattern: /console\.log\s*\(/,
    severity: "low",
    message: "Remove debug console output before production.",
  },
  {
    pattern: /\bTODO\b/i,
    severity: "low",
    message: "Unresolved TODO found in added code.",
  },
];

function getAddedCode(patch?: string): string {
  if (!patch) {
    return "";
  }

  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");
}

export function analyzeFiles(files: ChangedFile[]): ReviewResult {
  const findings: Finding[] = [];

  for (const file of files) {
    const addedCode = getAddedCode(file.patch);

    for (const rule of RULES) {
      if (rule.pattern.test(addedCode)) {
        findings.push({
          file: file.filename,
          severity: rule.severity,
          message: rule.message,
        });
      }
    }
  }

  const weights: Record<Severity, number> = {
    high: 30,
    medium: 15,
    low: 5,
  };

  const riskScore = Math.min(
    100,
    findings.reduce(
      (score, finding) => score + weights[finding.severity],
      0,
    ),
  );

  return {
    filesChanged: files.length,
    additions: files.reduce((sum, file) => sum + file.additions, 0),
    deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    riskScore,
    findings,
  };
}