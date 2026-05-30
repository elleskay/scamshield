import { Controller, Get } from "@nestjs/common";
import { AlertsService } from "./alerts.service";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  // Public awareness feed. No auth, no device scoping.
  @Get()
  list() {
    return this.alerts.list();
  }
}
