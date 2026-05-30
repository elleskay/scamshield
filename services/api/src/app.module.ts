import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { ReportsModule } from "./reports/reports.module";
import { NumbersModule } from "./numbers/numbers.module";
import { AlertsModule } from "./alerts/alerts.module";
import { AdminModule } from "./admin/admin.module";
import { ClassifierModule } from "./classifier/classifier.module";
import { SearchModule } from "./search/search.module";

@Module({
  imports: [
    HealthModule,
    ReportsModule,
    NumbersModule,
    AlertsModule,
    AdminModule,
    ClassifierModule,
    SearchModule,
  ],
})
export class AppModule {}
