import { IsOptional, IsString, MinLength, MaxLength } from "class-validator";

// Validated by the global ValidationPipe (whitelist + forbidNonWhitelisted).
// Every controller boundary takes a DTO like this; never trust the raw body.
export class CheckMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

  // Optional Sender ID (e.g. "CPF") to enable the trusted-sender check.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sender?: string;
}
