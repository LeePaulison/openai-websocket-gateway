export const userResolvers = {
  Query: {
    me: (_, __, context) => {
      return {
        authenticated: context.authenticated,
        user: context.user,
      };
    },
  },
};
