import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ClassifierModule } from "../classifier/classifier.module";
import { SearchModule } from "../search/search.module";
import { PushModule } from "../push/push.module";
import { InMemoryStore, REPORTS_STORE, type ReportsStore } from "./reports.store";

// Choose the store at startup: Postgres when DATABASE_URL is set (durable,
// multi-instance correct), else in-memory (CI, local, offline). The Postgres
// module is imported lazily so node-postgres stays out of the no-DB path.
const storeProvider = {
  provide: REPORTS_STORE,
  useFactory: async (): Promise<ReportsStore> => {
    const url = process.env.DATABASE_URL;
    if (url) {
      const { PostgresStore } = await import("./reports.postgres-store");
      return new PostgresStore(url);
    }
    return new InMemoryStore();
  },
};

@Module({
  imports: [ClassifierModule, SearchModule, PushModule],
  controllers: [ReportsController],
  providers: [ReportsService, storeProvider],
  exports: [ReportsService],
})
export class ReportsModule {}
