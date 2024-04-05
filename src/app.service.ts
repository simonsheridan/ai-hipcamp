import { Injectable } from '@nestjs/common';
import { runConversation } from './functions';

@Injectable()
export class AppService {
  getAIResponse(userQuery: string): Promise<any> {
    return runConversation(userQuery)
      .then((response: any) => {
        const messageContent: string = response.choices[0].message.content;
        return messageContent;
      })
      .catch((error: string) => {
        console.error(error);
        return error;
      });
  }
}
