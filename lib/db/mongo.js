import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

const globalForMongo = global;

export const mongoClient = globalForMongo.mongoClient || new MongoClient(uri);

if (process.env.NODE_ENV !== "production") {
  globalForMongo.mongoClient = mongoClient;
}

export async function getMongoDatabase() {
  await mongoClient.connect();

  return mongoClient.db("saigely");
}
