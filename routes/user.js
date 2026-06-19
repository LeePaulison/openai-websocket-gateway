import express from "express";
import { auth } from "../auth/auth.js";

const router = express.Router();

router.get("/me", async (request, response) => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return response.json({
        authenticated: false,
        user: null,
      });
    }

    return response.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
    });
  } catch (error) {
    console.error("Failed to resolve session:", error);

    return response.status(500).json({
      authenticated: false,
      user: null,
      error: "Failed to resolve session",
    });
  }
});

export default router;
