module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        host: env('DATABASE_HOST'),
        srv: env.bool('DATABASE_SRV'),
        port: env.int('DATABASE_PORT'),
        database: env('DATABASE_NAME')
      },
      options: {
        authenticationDatabase: env('AUTHENTICATION_DATABASE', null),
        ssl: env.bool('DATABASE_SSL')
      },
    },
  },
});
