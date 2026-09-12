export type LatestRequestGuard = {
  begin: () => number;
  invalidate: () => void;
  isCurrent: (token: number) => boolean;
};

export function createLatestRequestGuard(): LatestRequestGuard {
  let latestToken = 0;

  return {
    begin: () => {
      latestToken += 1;
      return latestToken;
    },
    invalidate: () => {
      latestToken += 1;
    },
    isCurrent: (token) => token === latestToken,
  };
}
