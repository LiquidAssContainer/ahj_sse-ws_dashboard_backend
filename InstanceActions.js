const uuid = require('uuid');

module.exports = class InstanceActions {
  constructor(instances, clients) {
    this.instances = instances;
    this.clients = clients;
  }

  create(user) {
    const event = this.newEvent('received', { info: 'Create command', server: 'creating', date: new Date() });
    this.sendEvent(event, user);

    setTimeout(() => {
      const id = uuid.v4();
      this.instances.push({ id, state: 'stopped' });

      const event = this.newEvent('created', { info: 'Created', server: id, date: new Date(), status: 'stopped' });
      this.sendEvent(event, user);
    }, 2000);
  }

  remove(id, user) {
    const instance = this.find(id);
    if (this.isInstanceChanging(instance)) return;
    instance.state = 'changing';

    const event = this.newEvent('received', { info: 'Remove command', server: id, status: 'changing', date: new Date() });
    this.sendEvent(event, user);

    setTimeout(() => {
      const index = this.findIndex(id);
      this.instances.splice(index, 1);

      const event = this.newEvent('removed', { info: 'Removed', server: id, date: new Date() });
      this.sendEvent(event, user);
    }, 2000);
  }

  run(id, user) {
    const instance = this.find(id);
    if (this.isInstanceChanging(instance)) return;
    instance.state = 'changing';

    const event = this.newEvent('received', { info: 'Start command', server: id, status: 'changing', date: new Date() });
    this.sendEvent(event, user);

    setTimeout(() => {
      instance.state = 'running';
      const event = this.newEvent('started', { info: 'Started', server: id, date: new Date() });
      this.sendEvent(event, user);
    }, 4000);
  }

  stop(id, user) {
    const instance = this.find(id);
    if (this.isInstanceChanging(instance)) return;
    instance.state = 'changing';

    const event = this.newEvent('received', { info: 'Stop command', server: id, status: 'changing', date: new Date() });
    this.sendEvent(event, user);

    setTimeout(() => {
      instance.state = 'stopped';
      const event = this.newEvent('stopped', { info: 'Stopped', server: id, date: new Date() });
      this.sendEvent(event, user);
    }, 4000);
  }

  isInstanceChanging(instance) {
    return !instance || instance.state === 'changing';
  }

  newEvent(event, data) {
    return {
      id: uuid.v4(),
      data: JSON.stringify(data),
      event,
    };
  }

  sendEvent(event, user) {
    if (this.clients.has(user)) {
      this.clients.get(user).sendEvent(event);
    }
  }

  find(id) {
    return this.instances.find((elem) => elem.id === id);
  }

  findIndex(id) {
    return this.instances.findIndex((elem) => elem.id === id);
  }
};
