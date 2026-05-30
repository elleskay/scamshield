import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";

/**
 * Demo admin auth: a single shared bearer token from ADMIN_TOKEN. This is NOT
 * real authn (no user accounts, no sessions) and is documented as such; the real
 * ScamShield dashboard is behind government SSO. Secure default: if ADMIN_TOKEN
 * is unset, every admin request is denied.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const token = process.env.ADMIN_TOKEN;
    if (!token) return false;
    const req = context.switchToHttp().getRequest<Request>();
    return req.headers.authorization === `Bearer ${token}`;
  }
}
