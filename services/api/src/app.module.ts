import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { ReportsModule } from "./reports/reports.module";
import { NumbersModule } from "./numbers/numbers.module";
import { AlertsModule } from "./alerts/alerts.module";
import { AdminModule } from "./admin/admin.module";
import { StatsModule } from "./stats/stats.module";
import { ClassifierModule } from "./classifier/classifier.module";
import { SearchModule } from "./search/search.module";
import { StoreModule } from "./store/store.module";

@Module({
  imports: [
    StoreModule,
    HealthModule,
    ReportsModule,
    NumbersModule,
    AlertsModule,
    AdminModule,
    StatsModule,
    ClassifierModule,
    SearchModule,
  ],
})
export class AppModule {}
