"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PushService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
/**
 * Sends push notifications via the Expo push service (APNs/FCM under the hood).
 * No-ops cleanly when given no device token. The Expo access token is optional
 * (only needed for enhanced security on the push endpoint).
 */
let PushService = PushService_1 = class PushService {
    constructor() {
        this.logger = new common_1.Logger(PushService_1.name);
        this.accessToken = process.env.EXPO_ACCESS_TOKEN;
    }
    async notifyScam(deviceToken, reportId) {
        if (!deviceToken)
            return false;
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
            },
            body: JSON.stringify({
                to: deviceToken,
                title: "ScamShield",
                body: "A scam you reported has been confirmed. Thanks for helping keep others safe.",
                data: { reportId },
            }),
        });
        if (!res.ok) {
            this.logger.warn(`push send failed: ${res.status}`);
        }
        return res.ok;
    }
};
exports.PushService = PushService;
exports.PushService = PushService = PushService_1 = __decorate([
    (0, common_1.Injectable)()
], PushService);
