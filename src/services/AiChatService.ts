import { Hercai, QuestionData } from "hercai";

export class AiChatService {
  private herc;

  constructor(herc = new Hercai()) {
    this.herc = herc;
  }

  ask(content: string) {
    return new Promise<QuestionData | undefined>((resolve) => {
      this.herc
        .question({
          model: "v3",
          content,
        })
        .then((response) => {
          resolve(response);
        })
        .catch(() => {
          resolve(undefined);
        });
    });
  }

  async getProductInfo(adName: string) {
    adName = adName.replaceAll("&", "");

    const response = await this.ask(
      `From ${adName} extract the product brand and model. Return these information in object with keys 'brand' and 'model'. Exclude Polish words.`
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
