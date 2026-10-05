export function parseParishRegularHtml(
  html: string,
  options: {
    templeId: string;
    sourceUrl: string;
    checkedAt: string;
    official?: boolean;
  }
): Array<{
  [key: string]: unknown;
  weekdays: number[];
  starts_at: string;
  kind: string;
  comment?: string;
}>;
