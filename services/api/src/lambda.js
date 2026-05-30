"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Must be first: registers Reflect.metadata before any decorated class loads,
// so the design:paramtypes metadata (emitted by tsc preCompilation) is stored
// and NestJS DI can resolve constructor injection in the bundle.
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const serverless_express_1 = __importDefault(require("@codegenie/serverless-express"));
const express_1 = __importDefault(require("express"));
const app_module_1 = require("./app.module");
// Cache the bootstrapped server across warm invocations. Re-bootstrapping on
// every call balloons cold-start latency and memory (CLAUDE.md gotcha #5).
let cached;
async function bootstrapServer() {
    const expressApp = (0, express_1.default)();
    const adapter = new platform_express_1.ExpressAdapter(expressApp);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    return (0, serverless_express_1.default)({ app: expressApp });
}
const handler = async (event, context, callback) => {
    cached ??= await bootstrapServer();
    // serverless-express's handler is typed as returning Promise<any>; the result
    // is passed straight back to Lambda.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cached(event, context, callback);
};
exports.handler = handler;
