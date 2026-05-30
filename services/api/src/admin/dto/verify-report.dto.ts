import { IsIn } from "class-validator";

export class VerifyReportDto {
  @IsIn(["scam", "suspicious", "clean"])
  verdict!: "scam" | "suspicious" | "clean";
}
