import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminGuard } from "./admin.guard";
import { ReportsModule } from "../reports/reports.module";
import { NumbersModule } from "../numbers/numbers.module";

@Module({
  imports: [ReportsModule, NumbersModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
