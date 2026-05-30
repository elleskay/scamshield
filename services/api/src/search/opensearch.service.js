"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OpenSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSearchService = void 0;
const common_1 = require("@nestjs/common");
/**
 * Indexes scam reports into OpenSearch and groups similar messages (the real
 * ScamShield uses OpenSearch for clustering similar scam messages). No-ops
 * cleanly when OPENSEARCH_ENDPOINT is unset so the API runs locally and in CI
 * without a cluster. Swap the fetch calls for @opensearch-project/opensearch
 * with SigV4 signing in production.
 */
let OpenSearchService = OpenSearchService_1 = class OpenSearchService {
    constructor() {
        this.logger = new common_1.Logger(OpenSearchService_1.name);
        this.endpoint = process.env.OPENSEARCH_ENDPOINT;
        this.indexName = "scam-reports";
    }
    get enabled() {
        return Boolean(this.endpoint);
    }
    async index(report) {
        if (!this.enabled) {
            this.logger.debug("OpenSearch disabled; skipping index.");
            return;
        }
        await fetch(`${this.endpoint}/${this.indexName}/_doc/${report.id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(report),
        });
    }
    /** Returns ids of reports whose text is similar to the given one. */
    async findSimilar(text, limit = 10) {
        if (!this.enabled)
            return [];
        const res = await fetch(`${this.endpoint}/${this.indexName}/_search`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                size: limit,
                query: { match: { text: { query: text, fuzziness: "AUTO" } } },
            }),
        });
        if (!res.ok)
            return [];
        const data = (await res.json());
        return (data.hits?.hits ?? []).map((h) => h._id);
    }
};
exports.OpenSearchService = OpenSearchService;
exports.OpenSearchService = OpenSearchService = OpenSearchService_1 = __decorate([
    (0, common_1.Injectable)()
], OpenSearchService);
