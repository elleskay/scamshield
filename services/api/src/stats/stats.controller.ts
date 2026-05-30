import { Controller, Get } from "@nestjs/common";
import { ReportsService } from "../reports/reports.service";

// Public awareness counters (checks, reports, confirmed scams).
@Controller("stats")
export class StatsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  get() {
    return this.reports.stats();
  }
}
