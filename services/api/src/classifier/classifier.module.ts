import { Module } from "@nestjs/common";
import { ClassifierService } from "./classifier.service";
import { NumbersModule } from "../numbers/numbers.module";

@Module({
  imports: [NumbersModule],
  providers: [ClassifierService],
  exports: [ClassifierService],
})
export class ClassifierModule {}
