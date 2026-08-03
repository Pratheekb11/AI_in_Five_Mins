import regressionRaw from "@data/regression.json";
import spamRaw from "@data/spam-bench.json";
import type { Point } from "./ml";

/**
 * Typed views over the generated datasets. Both files are produced by scripts
 * in data/scripts from corpora that are not committed — see data/PROVENANCE.md
 * for what they are and how to fetch them.
 */

export type SpamRule = { id: string; label: string };

export type RuleScore = SpamRule & {
  caught: number;
  falseAlarms: number;
  missed: number;
  accuracy: number;
};

export type SpamExample = {
  body: string;
  spam: boolean;
  mask: number;
};

export const SPAM_BENCH = spamRaw as {
  generatedBy: string;
  corpus: { name: string; total: number; spam: number; ham: number };
  rules: SpamRule[];
  perRule: RuleScore[];
  bestSubset: {
    mask: number;
    rules: string[];
    caught: number;
    falseAlarms: number;
    missed: number;
    accuracy: number;
  };
  baseline: {
    caught: number;
    falseAlarms: number;
    missed: number;
    accuracy: number;
  };
  learned: {
    method: string;
    trainSize: number;
    testSize: number;
    caught: number;
    falseAlarms: number;
    missed: number;
    accuracy: number;
  };
  examples: SpamExample[];
  testSet: number[];
  ruleCount: number;
};

export const REGRESSION = regressionRaw as {
  generatedBy: string;
  source: { title: string; author: string; via: string; note: string };
  encoding: string;
  sampleSize: number;
  points: (Point & { text: string })[];
  best: { slope: number; charsPerToken: number; mse: number };
  curve: { slope: number; mse: number }[];
};
