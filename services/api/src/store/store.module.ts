import { Global, Module } from "@nestjs/common";
import { InMemoryStore, REPORTS_STORE, type ReportsStore } from "../reports/reports.store";

// The persistence boundary, provided app-wide. Postgres when DATABASE_URL is set
// (durable, multi-instance correct), else in-memory (CI, local, offline). Global
// so both ReportsService and NumbersService can inject REPORTS_STORE without an
// import cycle (reports -> classifier -> numbers would otherwise loop back).
const storeProvider = {
  provide: REPORTS_STORE,
  useFactory: async (): Promise<ReportsStore> => {
    const url = process.env.DATABASE_URL;
    if (url) {
      const { PostgresStore } = await import("../reports/reports.postgres-store");
      return new PostgresStore(url);
    }
    return new InMemoryStore();
  },
};

@Global()
@Module({
  providers: [storeProvider],
  exports: [REPORTS_STORE],
})
export class StoreModule {}
