import {
  getConversationById,
  getUserConversations,
  saveConversationTurn as saveConversationTurnRepository,
} from "../repositories/conversationRepository.js";

export function saveConversationTurn(input) {
  return saveConversationTurnRepository(input);
}

export function getConversation({ token, conversationId }) {
  return getConversationById({ token, conversationId });
}

export function getUserConversationList({ token }) {
  return getUserConversations({ token });
}
