/** Hide by default, including while an old cached link list is being verified. */
export function shouldDisplayLinkingCode(state: {
  isFetchedAfterMount: boolean;
  isError: boolean;
  data?: readonly unknown[];
}): boolean {
  return state.isFetchedAfterMount && !state.isError && state.data?.length === 0;
}