import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeFiles,
  type ChangedFile,
} from "../src/analyzer.js";

test("detects risky patterns in added code", () => {
  const files: ChangedFile[] = [
    {
      filename: "src/risky.ts",
      status: "added",
      additions: 4,
      deletions: 0,
      patch: [
        "+// TODO: remove temporary code",
        '+const apiKey = "fake-key";',
        '+console.log("debug");',
        "+eval(userInput);",
      ].join("\n"),
    },
  ];

  const result = analyzeFiles(files);

  assert.equal(result.filesChanged, 1);
  assert.equal(result.additions, 4);
  assert.equal(result.deletions, 0);
  assert.equal(result.findings.length, 4);
  assert.equal(result.riskScore, 70);
});

test("returns zero risk for safe code", () => {
  const files: ChangedFile[] = [
    {
      filename: "src/safe.ts",
      status: "modified",
      additions: 2,
      deletions: 1,
      patch: [
        "-const total = items.length;",
        "+const total = items.length;",
        "+return total;",
      ].join("\n"),
    },
  ];

  const result = analyzeFiles(files);

  assert.equal(result.riskScore, 0);
  assert.equal(result.findings.length, 0);
});

test("analyzes only added lines", () => {
  const files: ChangedFile[] = [
    {
      filename: "src/cleanup.ts",
      status: "modified",
      additions: 1,
      deletions: 1,
      patch: [
        '-console.log("old debug statement");',
        '+logger.info("Application started");',
      ].join("\n"),
    },
  ];

  const result = analyzeFiles(files);

  assert.equal(result.riskScore, 0);
  assert.equal(result.findings.length, 0);
});