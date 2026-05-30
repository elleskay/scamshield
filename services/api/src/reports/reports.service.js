"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const classifier_service_1 = require("../classifier/classifier.service");
const opensearch_service_1 = require("../search/opensearch.service");
const push_service_1 = require("../push/push.service");
/**
 * Check-and-report domain. `check` classifies a message synchronously for the
 * app. `submit` enqueues a report onto SQS for async processing. The heavy work
 * (classify, index, notify) happens in the SQS consumer, not on the request path.
 */
let ReportsService = ReportsService_1 = class ReportsService {
    constructor(classifier, search, push) {
        this.classifier = classifier;
        this.search = search;
        this.push = push;
        this.logger = new common_1.Logger(ReportsService_1.name);
        this.queueUrl = process.env.REPORTS_QUEUE_URL;
        // Idempotency guard. SQS is at-least-once, so dedupe on reportId. In-memory
        // for the MVP; back this with a Postgres unique key (or a dedupe table) for
        // multi-instance correctness.
        this.processed = new Set();
    }
    async check(text) {
        return this.classifier.classify(text);
    }
    async submit(dto) {
        const reportId = (0, node_crypto_1.randomUUID)();
        await this.enqueue({ reportId, ...dto });
        return { reportId, status: "queued" };
    }
    /**
     * Processes one report from the queue. Idempotent: a duplicate delivery of the
     * same reportId is a no-op (CLAUDE.md gotcha #7).
     */
    async process(message) {
        if (this.processed.has(message.reportId)) {
            this.logger.debug(`duplicate delivery of ${message.reportId}; skipping`);
            return;
        }
        this.processed.add(message.reportId);
        const classification = await this.classifier.classify(message.text);
        await this.search.index({
            id: message.reportId,
            text: message.text,
            verdict: classification.verdict,
            createdAt: new Date().toISOString(),
        });
        // Notify the reporter when their report is confirmed a scam.
        if (classification.verdict === "scam" && message.deviceToken) {
            await this.push.notifyScam(message.deviceToken, message.reportId);
        }
        this.logger.log(`processed report ${message.reportId}: ${classification.verdict} (${classification.source})`);
    }
    async enqueue(payload) {
        if (!this.queueUrl) {
            // Local / CI: no queue. Process inline so the flow still works end to end.
            this.logger.debug("REPORTS_QUEUE_URL unset; processing inline.");
            await this.process(payload);
            return;
        }
        const { SQSClient, SendMessageCommand } = await Promise.resolve().then(() => __importStar(require("@aws-sdk/client-sqs")));
        const client = new SQSClient({});
        await client.send(new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify(payload),
        }));
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = ReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [classifier_service_1.ClassifierService,
        opensearch_service_1.OpenSearchService,
        push_service_1.PushService])
], ReportsService);
