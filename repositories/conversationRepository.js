import { graphqlRequest } from "../lib/graphql/request.js";

export async function saveConversationTurn({
  token,
  conversationId,
  userMessage,
  assistantMessage,
}) {
  const data = await graphqlRequest({
    token,
    query: `
      mutation SaveConversationTurn($input: SaveConversationTurnInput!) {
        saveConversationTurn(input: $input) {
          conversationId
          preview
          updatedAt
        }
      }
    `,
    variables: {
      input: {
        conversationId,
        userMessage,
        assistantMessage,
      },
    },
  });

  return data.saveConversationTurn;
}

export async function getConversationById({ token, conversationId }) {
  const data = await graphqlRequest({
    token,
    query: `
      query Conversation($id: ID!) {
        conversation(id: $id) {
          id
          userId
          createdAt
          updatedAt
          messages {
            role
            content
            createdAt
          }
        }
      }
    `,
    variables: { id: conversationId },
  });

  return data.conversation;
}

export async function getUserConversations({ token }) {
  const data = await graphqlRequest({
    token,
    query: `
      query Conversations {
        conversations {
          id
          preview
          updatedAt
        }
      }
    `,
  });

  return data.conversations;
}
