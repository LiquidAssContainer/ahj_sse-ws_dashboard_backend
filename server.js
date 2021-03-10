const http = require('http');
const path = require('path');
const Koa = require('koa');
const koaBody = require('koa-body');
const serve = require('koa-static');
const Router = require('@koa/router');
const { streamEvents } = require('http-event-stream');

const initCors = require('./cors');
const InstanceActions = require('./InstanceActions');

const app = new Koa();
const router = new Router();

const publicDirPath = path.join(__dirname, '/public');

app.use(initCors);
app.use(
  koaBody({
    text: true,
    urlencoded: true,
    multipart: true,
    json: true,
  })
);

const instances = [];
const clients = new Map();
const instance = new InstanceActions(instances, clients);

// парсинг JSON в самом начале, чтобы везде не писать одно и то же
app.use(async (ctx, next) => {
  if (Object.keys(ctx.request.body).length === 0) return await next();
  try {
    const { user, action } = JSON.parse(ctx.request.body);
    ctx.user = user;
    ctx.action = action;
  } catch (e) {
    ctx.status = 400;
    return;
  }
  return await next();
});

router
  // просто добавление пользователя, будем считать это заглушкой вместо полноценной авторизации и куки
  .post('/users', async (ctx, next) => {
    clients.set(ctx.user, null);
    ctx.status = 204;
    return await next();
  })

  .get('/sse/:user', async (ctx, next) => {
    const { user } = ctx.params;

    streamEvents(ctx.req, ctx.res, {
      async fetch(lastEventId) {
        return [];
      },

      stream(sse) {
        if (clients.has(user)) {
          clients.set(user, sse);
        }

        return () => {
          clients.delete(user);
        };
      },
    });
    ctx.respond = false;
    return await next();
  })

  .get('/instances', async (ctx, next) => {
    ctx.body = instances;
    return await next();
  })

  .post('/instances', async (ctx, next) => {
    instance.create(ctx.user);
    ctx.status = 204;
    return await next();
  })

  .del('/instances/:id/:user', async (ctx, next) => {
    const { id, user } = ctx.params;
    instance.remove(id, user);
    ctx.status = 204;
    return await next();
  })

  .put('/instances/:id', async (ctx, next) => {
    const { id } = ctx.params;
    switch (ctx.action) {
      case 'stop':
        instance.stop(id, ctx.user);
        break;
      case 'run':
        instance.run(id, ctx.user);
        break;
      default:
        ctx.status = 400;
    }

    ctx.status = 204;
    return await next();
  });

app.use(router.routes()).use(router.allowedMethods());
app.use(serve(publicDirPath));

const port = process.env.PORT || 7070;
http.createServer(app.callback()).listen(port);
