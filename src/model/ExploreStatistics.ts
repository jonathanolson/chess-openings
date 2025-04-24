import { LichessExploreSummary, LichessExploreType } from "./getLichessExplore";

export class ExploreStatistics {
  public constructor(
    public readonly summary: LichessExploreSummary,
    public readonly type: LichessExploreType,
    public readonly hasTranspositions: boolean,
  ) {}
}
