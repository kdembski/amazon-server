import { Hercai } from "hercai";

export class AiChatService {
  private herc;

  constructor(herc = new Hercai()) {
    this.herc = herc;
  }

  ask(content: string) {
    return this.herc.question({
      model: "v3",
      content,
    });
  }

  async getProductInfo(adName: string) {
    const response = await this.ask(
      `From ${adName} extract the product brand and model.
      Return these information in object with keys 'brand' and 'model'.
      Exclude Polish words.`
    );

    if (!response) return;

    const info: { brand?: string; model?: string } = JSON.parse(
      response.reply
        .replace("```json", "")
        .replace("```javascript", "")
        .replace("```", "")
    );

    if (!info.brand || !info.model) return;

    return {
      brand: info.brand.toLocaleLowerCase(),
      model: info.model.toLocaleLowerCase(),
    };
  }
}
