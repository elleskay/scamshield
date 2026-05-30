import { Module } from "@nestjs/common";
import { StatsController } from "./stats.controller";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [ReportsModule],
  controllers: [StatsController],
})
export class StatsModule {}
