import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReportsService } from "../reports/reports.service";
import { AdminGuard } from "./admin.guard";
import { VerifyReportDto } from "./dto/verify-report.dto";

// Admin verification surface (the "police verify reported scams" dashboard).
// All routes require the shared admin token (AdminGuard).
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly reports: ReportsService) {}

  // CSV export, optionally bounded by a created-at date range. Declared before the
  // list route so "reports/export" is not shadowed.
  @Get("reports/export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="scamshield-reports.csv"')
  exportCsv(@Query("from") from?: string, @Query("to") to?: string, @Query("q") q?: string) {
    return this.reports.exportCsv({ q, from, to });
  }

  // List all reports; q searches content/status/channel/id/device, from/to bound dates.
  @Get("reports")
  list(@Query("q") q?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.reports.listAll({ q, from, to });
  }

  // Set the authoritative status. Marking scam notifies the reporter.
  @HttpCode(200)
  @Patch("reports/:id")
  async verify(@Param("id") id: string, @Body() dto: VerifyReportDto) {
    const updated = await this.reports.verify(id, dto.verdict);
    if (!updated) throw new NotFoundException("report not found");
    return updated;
  }
}
