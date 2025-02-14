import { RequestQueueService } from "@/services/RequestQueueService";
import { Hercai, QuestionData } from "hercai";

export class AiChatService {
  private herc;
  private requestQueueService;

  constructor(
    herc = new Hercai(),
    requestQueueService = new RequestQueueService(30000)
  ) {
    this.herc = herc;
    this.requestQueueService = requestQueueService;
  }

  ask(content: string) {
    return this.requestQueueService.push(
      () =>
        new Promise<QuestionData | undefined>((resolve) => {
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
        })
    );
  }

  async getProductName(adName: string) {
    const response = await this.ask(
      `Give me the name of a product listed under that ad: "${adName}". The name should contain brand and model name if possible. The name should be in polish`
    );
    console.log(response);
    if (!(response && response.reply)) return;
    if (response.reply === "Question Error!") return;

    return response.reply;
  }
}
