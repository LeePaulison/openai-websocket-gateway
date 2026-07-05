import { ObjectId } from "mongodb";

import { getMongoDatabase } from "../lib/db/mongo.js";

export async function createConversation({ userId, messages }) {
  const database = await getMongoDatabase();

  const conversationsCollection = database.collection("conversations");

  const now = new Date();

  const result = await conversationsCollection.insertOne({
    userId,

    createdAt: now,
    updatedAt: now,

    messages,
  });

  return {
    conversationId: result.insertedId.toString(),
  };
}

export async function appendMessages({ conversationId, messages }) {
  const database = await getMongoDatabase();

  const conversationsCollection = database.collection("conversations");

  const now = new Date();

  await conversationsCollection.updateOne(
    {
      _id: new ObjectId(conversationId),
    },
    {
      $push: {
        messages: {
          $each: messages,
        },
      },

      $set: {
        updatedAt: now,
      },
    },
  );

  return {
    conversationId,
  };
}

export async function getConversationById(conversationId) {
  const database = await getMongoDatabase();

  const conversationsCollection = database.collection("conversations");

  return conversationsCollection.findOne({
    _id: new ObjectId(conversationId),
  });
}

export async function getUserConversations(userId) {
  const database = await getMongoDatabase();

  const conversationsCollection = database.collection("conversations");

  return conversationsCollection
    .find(
      { userId },
      {
        projection: {
          updatedAt: 1,
          messages: {
            $slice: -1,
          },
        },
      },
    )
    .sort({
      updatedAt: -1,
    })
    .toArray();
}
