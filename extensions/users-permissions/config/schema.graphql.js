'use strict';

const _ = require('lodash');

/**
 * Throws an ApolloError if context body contains a bad request
 * @param contextBody - body of the context object given to the resolver
 * @throws ApolloError if the body is a bad request
 */
function checkBadRequest(contextBody) {
  if (_.get(contextBody, 'statusCode', 200) !== 200) {
    const message = _.get(contextBody, 'error', 'Bad Request');
    const exception = new Error(message);
    exception.code = _.get(contextBody, 'statusCode', 400);
    exception.data = contextBody;
    throw exception;
  }
}

module.exports = {
  type: {
    UsersPermissionsPermission: false, // Make this type NOT queryable
  },
  definition: /* GraphQL */ `
    type UserMe {
      id: ID!
      firstName: String!
      lastName: String!
      email: String!
      avatar: String
      confirmed: Boolean
      blocked: Boolean
      role: UsersPermissionsMeRole
    }

    input UsersRegisterInput {
      firstName: String!
      lastName: String!
      email: String!
      password: String!
    }

    input UsersLoginInput {
      identifier: String!
      password: String!
      provider: String = "local"
    }

    type UsersLoginPayload {
      jwt: String
      user: UserMe!
    }

    type UsersPasswordPayload {
      ok: Boolean!
    }
  `,
  query: `
    userMe: UserMe
  `,
  mutation: `
    userLogin(input: UsersLoginInput!): UsersLoginPayload!
    userRegister(input: UsersRegisterInput!): UsersLoginPayload!
    userForgotPassword(email: String!): UsersPasswordPayload
    userResetPassword(password: String!, passwordConfirmation: String!, code: String!): UsersLoginPayload
    userEmailConfirmation(confirmation: String!): UsersLoginPayload
  `,
  resolver: {
    Query: {
      userMe: {
        resolver: 'plugins::users-permissions.user.me',
      },
    },
    Mutation: {
      userRegister: {
        description: 'Register a user',
        resolverOf: 'plugins::users-permissions.auth.register',
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options.input);

          await strapi.plugins['users-permissions'].controllers.auth.register(context);
          let output = context.body.toJSON ? context.body.toJSON() : context.body;

          checkBadRequest(output);
          return {
            user: output.user || output,
            jwt: output.jwt,
          };
        },
      },
      userLogin: {
        resolverOf: 'plugins::users-permissions.auth.callback',
        resolver: async (obj, options, { context }) => {
          context.params = {
            ...context.params,
            provider: options.input.provider,
          };
          context.request.body = _.toPlainObject(options.input);

          await strapi.plugins['users-permissions'].controllers.auth.callback(context);
          let output = context.body.toJSON ? context.body.toJSON() : context.body;

          checkBadRequest(output);
          return {
            user: output.user || output,
            jwt: output.jwt,
          };
        },
      },
      userForgotPassword: {
        description: 'Request a reset password token',
        resolverOf: 'plugins::users-permissions.auth.forgotPassword',
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options);

          await strapi.plugins['users-permissions'].controllers.auth.forgotPassword(context);
          let output = context.body.toJSON ? context.body.toJSON() : context.body;

          checkBadRequest(output);

          return {
            ok: output.ok || output,
          };
        },
      },
      userResetPassword: {
        description: 'Reset user password. Confirm with a code (resetToken from forgotPassword)',
        resolverOf: 'plugins::users-permissions.auth.resetPassword',
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options);

          await strapi.plugins['users-permissions'].controllers.auth.resetPassword(context);
          let output = context.body.toJSON ? context.body.toJSON() : context.body;

          checkBadRequest(output);

          return {
            user: output.user || output,
            jwt: output.jwt,
          };
        },
      },
      userEmailConfirmation: {
        description: 'Confirm an email users email address',
        resolverOf: 'plugins::users-permissions.auth.emailConfirmation',
        resolver: async (obj, options, { context }) => {
          context.query = _.toPlainObject(options);

          await strapi.plugins['users-permissions'].controllers.auth.emailConfirmation(
            context,
            null,
            true
          );
          let output = context.body.toJSON ? context.body.toJSON() : context.body;

          checkBadRequest(output);

          return {
            user: output.user || output,
            jwt: output.jwt,
          };
        },
      }
    }
  }
}
