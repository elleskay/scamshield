import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
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

  @Get("reports")
  list() {
    return this.reports.listAll();
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
