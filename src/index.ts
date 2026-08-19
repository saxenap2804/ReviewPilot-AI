import type { Probot } from "probot";
import "dotenv/config";

import { generateAiReview } from "./ai-reviewer.js";
import {
  analyzeFiles,
  type ChangedFile,
  type Finding,
} from "./analyzer.js";

function formatFinding(finding: Finding): string {
  const icon = {
    high: "🔴",
    medium: "🟠",
    low: "🟡",
  }[finding.severity];

  return (
    `${icon} **${finding.severity.toUpperCase()}** — ` +
    `\`${finding.file}\`: ${finding.message}`
  );
}

export default function reviewPilot(app: Probot): void {
  app.log.info("ReviewPilot AI loaded successfully.");

  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ],
    async (context) => {
      const { owner, repo } = context.repo();
      const pullRequest = context.payload.pull_request;

      const files = await context.octokit.paginate(
        context.octokit.rest.pulls.listFiles,
        {
          owner,
          repo,
          pull_number: pullRequest.number,
          per_page: 100,
        },
      );

      const changedFiles: ChangedFile[] = files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      }));

      const result = analyzeFiles(changedFiles);

      let aiReview: string | null = null;

      try {
        aiReview = await generateAiReview({
          title: pullRequest.title,
          description: pullRequest.body ?? "",
          files: changedFiles,
        });
      } catch (error) {
        context.log.warn(
          { error },
          "Gemini review failed; continuing with rule-based analysis.",
        );
      }

      const findings =
        result.findings.length > 0
          ? result.findings.map(formatFinding).join("\n\n")
          : "✅ No risky patterns were detected by the current rules.";

      const aiReviewSection =
        aiReview ??
        "AI analysis was unavailable; rule-based analysis completed successfully.";

      const body = [
        "## 🤖 ReviewPilot Automated Review",
        "",
        `**Risk score:** ${result.riskScore}/100`,
        "",
        "### Change summary",
        "",
        `- Files changed: ${result.filesChanged}`,
        `- Additions: ${result.additions}`,
        `- Deletions: ${result.deletions}`,
        "",
        "### Deterministic findings",
        "",
        findings,
        "",
        "### AI review",
        "",
        aiReviewSection,
        "",
        "---",
        "_ReviewPilot performs automated analysis. Human review is still recommended._",
      ].join("\n");

      await context.octokit.rest.issues.createComment(
        context.issue({ body }),
      );

      context.log.info(
        {
          repository: context.payload.repository.full_name,
          pullRequest: pullRequest.number,
          riskScore: result.riskScore,
          aiReviewGenerated: aiReview !== null,
        },
        "Pull request analyzed",
      );
    },
  );
}