import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { CheckMessageDto } from "./dto/check-message.dto";
import { CreateReportDto } from "./dto/create-report.dto";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Synchronous classify for the app's Check screen. Not a creation, so 200 (not
  // Nest's default POST 201).
  @HttpCode(200)
  @Post("check")
  async check(@Body() dto: CheckMessageDto) {
    return this.reports.check(dto.text);
  }

  // Enqueue a report for async processing. Returns a report id immediately.
  @Post()
  async submit(@Body() dto: CreateReportDto) {
    return this.reports.submit(dto);
  }
}
