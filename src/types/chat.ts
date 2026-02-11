export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
}

export interface SendChatMessageRequest {
  peerId: string;
  body: string;
}
