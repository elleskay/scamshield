import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from "class-validator";

// Validated by the global ValidationPipe. A batch of scam numbers to add to the
// blocklist; each is a raw string (digits, possibly formatted) normalized server-side.
export class BlocklistDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  numbers!: string[];
}
