import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminGuard } from "./admin.guard";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [ReportsModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
