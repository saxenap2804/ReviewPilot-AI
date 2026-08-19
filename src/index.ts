import type { Probot } from "probot";

export default function reviewPilot(app: Probot): void {
  app.log.info("ReviewPilot AI loaded successfully.");

  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ],
    async (context) => {
      const pullRequest = context.payload.pull_request;

      context.log.info(
        {
          repository: context.payload.repository.full_name,
          pullRequest: pullRequest.number,
          action: context.payload.action,
        },
        "Pull request event received",
      );

      const comment = context.issue({
        body:
          "## ReviewPilot AI\n\n" +
          `Pull request **#${pullRequest.number}** was received successfully.\n\n` +
          "Automated AI code review will be added in the next development phase.",
      });

      await context.octokit.rest.issues.createComment(comment);
    },
  );
}