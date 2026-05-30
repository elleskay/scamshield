import { IsIn } from "class-validator";

export class VerifyReportDto {
  @IsIn(["scam", "suspicious", "clean", "spam"])
  verdict!: "scam" | "suspicious" | "clean" | "spam";
}
