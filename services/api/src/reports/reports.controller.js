"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const check_message_dto_1 = require("./dto/check-message.dto");
const create_report_dto_1 = require("./dto/create-report.dto");
let ReportsController = class ReportsController {
    constructor(reports) {
        this.reports = reports;
    }
    // Synchronous classify for the app's Check screen. Not a creation, so 200 (not
    // Nest's default POST 201).
    async check(dto) {
        return this.reports.check(dto.text);
    }
    // Enqueue a report for async processing. Returns a report id immediately.
    async submit(dto) {
        return this.reports.submit(dto);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)("check"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [check_message_dto_1.CheckMessageDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "check", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_report_dto_1.CreateReportDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "submit", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)("reports"),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
