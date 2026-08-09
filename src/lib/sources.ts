/**
 * Citations.
 */
export type Source = {
  /** Title as published. */
  title: string;
  /** Who published it, an organisation or an author list. */
  publisher: string;
  url: string;
  /** What this lesson actually took from it. One line, specific. */
  used: string;
  /** Present when the source is a dataset or model with licence terms. */
  licence?: string;
};
