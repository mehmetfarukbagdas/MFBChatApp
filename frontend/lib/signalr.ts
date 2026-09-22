import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://mfbchatapp.onrender.com";

export const createChatConnection = (token: string): HubConnection => {
  return new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/chat`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();
};
