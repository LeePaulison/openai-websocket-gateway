export const userResolvers = {
  Query: {
    me: (_, __, context) => {
      console.log("me: context: ", context);
      return {
        authenticated: context.authenticated,
        user: context.user,
      };
    },
  },
};
