"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const reports_service_1 = require("./reports.service");
// Separate Lambda entry point bound to the SQS report-intake queue by the CDK
// construct. Reports flow: app submits -> API enqueues -> this consumer
// classifies, indexes, persists, and notifies. Bootstrapped once and cached.
let service;
async function getService() {
    if (service)
        return service;
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ["error", "warn", "log"],
    });
    const resolved = app.get(reports_service_1.ReportsService);
    service = resolved;
    return resolved;
}
const handler = async (event) => {
    const reports = await getService();
    const batchItemFailures = [];
    // Partial-batch response: a failed message is retried without re-running the
    // ones that succeeded. The processing is idempotent (dedupe on reportId).
    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            await reports.process(body);
        }
        catch {
            batchItemFailures.push({ itemIdentifier: record.messageId });
        }
    }
    return { batchItemFailures };
};
exports.handler = handler;
