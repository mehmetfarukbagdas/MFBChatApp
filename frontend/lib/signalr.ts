import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

const API_URL = "http://localhost:5000";

export const createChatConnection = (token: string): HubConnection => {
  return new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/chat`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();
};
