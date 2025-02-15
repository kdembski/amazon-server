import { RequestQueueService } from "@/services/RequestQueueService";
import { Hercai, QuestionData } from "hercai";

export class AiChatService {
  private static instance: AiChatService;
  private herc;
  private requestQueueService;

  private constructor(
    herc = new Hercai(),
    requestQueueService = new RequestQueueService(10000)
  ) {
    this.herc = herc;
    this.requestQueueService = requestQueueService;

    setInterval(() => {
      console.log(`queue: ${this.requestQueueService.queue.length}`);
    }, 2000);
  }

  public static getInstance(): AiChatService {
    if (!AiChatService.instance) {
      AiChatService.instance = new AiChatService();
    }

    return AiChatService.instance;
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
            .catch((e) => {
              console.error(e.status, e.message);
              resolve(undefined);
            });
        })
    );
  }

  async getProductName(adName: string) {
    const response = await this.ask(
      `Give me the name of a product listed under that ad: "${adName}". The name should contain brand and model name if possible. The name should be in polish`
    );

    if (!(response && response.reply)) return;
    if (response.reply === "Question Error!") return;

    return response.reply;
  }
}
