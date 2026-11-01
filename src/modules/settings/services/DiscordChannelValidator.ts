import {
  DiscordChannelCreateDto,
  DiscordChannelUpdateDto,
} from "@/modules/settings/dtos/DiscordChannelDtos";

const MAX_NAME_LENGTH = 63;
// <webhook id>/<webhook token>, the part of a webhook URL after /api/webhooks/
const TOKEN_PATTERN = /^\d+\/[\w-]+$/;

const invalid = (message: string) => Object.assign(new Error(message), { status: 400 });

export class DiscordChannelValidator {
  validateCreate(dto: unknown): DiscordChannelCreateDto {
    const fields = this.validateObject(dto);
    return {
      name: this.validateName(fields.name),
      token: this.validateToken(fields.token),
    };
  }

  validateUpdate(dto: unknown): DiscordChannelUpdateDto {
    const fields = this.validateObject(dto);
    return {
      name: fields.name === undefined ? undefined : this.validateName(fields.name),
      token: fields.token === undefined ? undefined : this.validateToken(fields.token),
    };
  }

  private validateObject(dto: unknown) {
    if (typeof dto !== "object" || dto === null || Array.isArray(dto)) {
      throw invalid("Discord channel must be an object");
    }
    return dto as Record<string, unknown>;
  }

  private validateName(name: unknown) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_NAME_LENGTH) {
      throw invalid(`Discord channel name must be a string of 1 to ${MAX_NAME_LENGTH} characters`);
    }
    return name.trim();
  }

  private validateToken(token: unknown) {
    if (typeof token !== "string" || !TOKEN_PATTERN.test(token.trim())) {
      throw invalid("Discord channel token must be the webhook URL part <id>/<token>");
    }
    return token.trim();
  }
}
