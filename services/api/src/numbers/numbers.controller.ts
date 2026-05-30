import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { NumbersService } from "./numbers.service";
import { CheckNumberDto } from "./dto/check-number.dto";

@Controller("numbers")
export class NumbersController {
  constructor(private readonly numbers: NumbersService) {}

  // Synchronous lookup for the app's Check Call screen. 200, not 201.
  @HttpCode(200)
  @Post("check")
  check(@Body() dto: CheckNumberDto) {
    return this.numbers.classify(dto.number);
  }

  // Known-scam numbers the device pushes into the native call-screening store.
  @Get("blocklist")
  blocklist() {
    return { numbers: this.numbers.blocklist() };
  }
}
