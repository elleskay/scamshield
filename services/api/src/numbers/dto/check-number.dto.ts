import { IsString, MinLength, MaxLength, Matches } from "class-validator";

// Validated by the global ValidationPipe (whitelist + forbidNonWhitelisted).
// Accepts common phone formatting; the service normalizes to digits.
export class CheckNumberDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[+0-9 ()-]+$/, { message: "number contains invalid characters" })
  number!: string;
}
