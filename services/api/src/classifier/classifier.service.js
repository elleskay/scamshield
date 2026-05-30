"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ClassifierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifierService = void 0;
const common_1 = require("@nestjs/common");
/**
 * Scam / phishing classifier. Calls the configured LLM endpoint when available,
 * otherwise falls back to a deterministic heuristic so the API is functional and
 * testable without a model. Mirrors the app's offline heuristic so verdicts are
 * consistent between device and server.
 */
let ClassifierService = ClassifierService_1 = class ClassifierService {
    constructor() {
        this.logger = new common_1.Logger(ClassifierService_1.name);
        this.apiUrl = process.env.CLASSIFIER_API_URL;
        this.apiKey = process.env.CLASSIFIER_API_KEY;
    }
    async classify(text) {
        if (this.apiUrl && this.apiKey) {
            try {
                return await this.classifyWithLlm(text);
            }
            catch (err) {
                this.logger.warn(`LLM classify failed, falling back to heuristic: ${err.message}`);
            }
        }
        return this.heuristic(text);
    }
    async classifyWithLlm(text) {
        const res = await fetch(`${this.apiUrl}/classify`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({ text }),
        });
        if (!res.ok)
            throw new Error(`classifier ${res.status}`);
        const data = (await res.json());
        return { ...data, source: "llm" };
    }
    heuristic(text) {
        const t = text.toLowerCase();
        const hasLink = /https?:\/\/|\bwww\./.test(t);
        const lure = /(verify|urgent|prize|gift|otp|password|bank|click)/.test(t);
        if (hasLink && lure)
            return { verdict: "scam", score: 0.9, reason: "Link plus urgency lure.", source: "heuristic" };
        if (hasLink || lure)
            return {
                verdict: "suspicious",
                score: 0.5,
                reason: "Contains a link or pressure language.",
                source: "heuristic",
            };
        return { verdict: "clean", score: 0.1, reason: "No common scam markers.", source: "heuristic" };
    }
};
exports.ClassifierService = ClassifierService;
exports.ClassifierService = ClassifierService = ClassifierService_1 = __decorate([
    (0, common_1.Injectable)()
], ClassifierService);
