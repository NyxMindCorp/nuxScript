/**
 * nuxScript Advanced Concurrency System
 * Actors, Channels, and CSP-style concurrency
 */

class Actor {
    constructor(behavior) {
        this.id = Actor.nextId++;
        this.behavior = behavior;
        this.mailbox = [];
        this.state = null;
        this.status = 'created';
    }

    static nextId = 0;

    static spawn(behavior) {
        const actor = new Actor(behavior);
        ActorSystem.register(actor);
        return actor;
    }

    static where(pattern) {
        return ActorSystem.actors.filter(a => {
            if (typeof pattern === 'function') return pattern(a);
            if (typeof pattern === 'string') return a.status === pattern;
            return true;
        });
    }

    send(message) {
        this.mailbox.push(message);
        ActorSystem.deliver(this.id, message);
        return this;
    }

    tell(message) {
        return this.send(message);
    }

    ask(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const corrId = this.id + ':' + Date.now();
            this.mailbox.push({ 
                type: 'ask', 
                message, 
                correlationId: corrId,
                replyTo: null 
            });
            
            ActorSystem.pending.set(corrId, { resolve, reject, timeout: setTimeout(() => {
                ActorSystem.pending.delete(corrId);
                reject(new Error('Timeout'));
            }, timeout)});
            
            ActorSystem.deliver(this.id, message);
        });
    }

    receive(message) {
        if (typeof this.behavior === 'function') {
            return this.behavior(message, this.state, (newState) => {
                this.state = newState;
            });
        }
        return null;
    }

    stop() {
        this.status = 'stopped';
        ActorSystem.unregister(this.id);
    }
}

class ActorSystem {
    static actors = new Map();
    static channels = new Map();
    static pending = new Map();
    static running = false;

    static register(actor) {
        this.actors.set(actor.id, actor);
        actor.status = 'running';
    }

    static unregister(actorId) {
        this.actors.delete(actorId);
    }

    static deliver(actorId, message) {
        const actor = this.actors.get(actorId);
        if (actor && actor.receive) {
            actor.receive(message);
        }
    }

    static actorOf(pattern) {
        return Actor.where(pattern);
    }

    static kill(actorId) {
        const actor = this.actors.get(actorId);
        if (actor) actor.stop();
    }
}

class Channel {
    constructor(bufferSize = 0) {
        this.id = Channel.nextId++;
        this.buffer = [];
        this.bufferSize = bufferSize;
        this.readers = [];
        this.writers = [];
        this.closed = false;
    }

    static nextId = 0;

    static create(bufferSize = 0) {
        return new Channel(bufferSize);
    }

    static buffer(size) {
        return new Channel(size);
    }

    send(value) {
        if (this.closed) {
            throw new Error('Channel is closed');
        }
        
        if (this.readers.length > 0) {
            const reader = this.readers.shift();
            reader(value);
            return true;
        }
        
        if (this.bufferSize > 0 && this.buffer.length >= this.bufferSize) {
            this.writers.push(value);
            return false;
        }
        
        this.buffer.push(value);
        return true;
    }

    receive(handler) {
        if (this.buffer.length > 0) {
            const value = this.buffer.shift();
            if (this.writers.length > 0 && this.buffer.length < this.bufferSize) {
                this.buffer.push(this.writers.shift());
            }
            handler(value);
            return true;
        }
        
        if (this.closed) {
            handler(null);
            return true;
        }
        
        this.readers.push(handler);
        return false;
    }

    poll() {
        if (this.buffer.length > 0) {
            return this.buffer.shift();
        }
        return null;
    }

    close() {
        this.closed = true;
        for (const reader of this.readers) {
            reader(null);
        }
        this.readers = [];
    }

    isClosed() {
        return this.closed;
    }

    isEmpty() {
        return this.buffer.length === 0;
    }

    isFull() {
        return this.bufferSize > 0 && this.buffer.length >= this.bufferSize;
    }

    length() {
        return this.buffer.length;
    }
}

class Select {
    static select(...cases) {
        return new Promise((resolve) => {
            const handlers = cases.map((c, i) => {
                return {
                    index: i,
                    ready: () => {
                        if (c.channel && !c.channel.isEmpty()) return true;
                        if (c.condition && c.condition()) return true;
                        return false;
                    },
                    execute: () => {
                        if (c.channel) return c.channel.poll();
                        if (c.condition) return c.value;
                        return c();
                    }
                };
            });

            const trySelect = () => {
                for (const h of handlers) {
                    if (h.ready()) {
                        resolve({ 
                            case: h.index, 
                            value: h.execute() 
                        });
                        return true;
                    }
                }
                return false;
            };

            if (trySelect()) return;

            setImmediate(trySelect);
        });
    }

    static alts(...channels) {
        return this.select(...channels.map(ch => ({ channel: ch })));
    }
}

// Process-based concurrency
class Process {
    constructor(fn) {
        this.fn = fn;
        this.id = Process.nextId++;
        this.channels = {};
    }

    static nextId = 0;

    static spawn(fn, ...args) {
        const proc = new Process(fn);
        proc.start(...args);
        return proc;
    }

    async start(...args) {
        this.pid = ProcessSystem.spawn(this);
        await this.fn(...args);
        ProcessSystem.terminate(this.pid);
    }

    kill() {
        ProcessSystem.terminate(this.pid);
    }
}

class ProcessSystem {
    static processes = new Map();
    static pidCounter = 0;

    static spawn(proc) {
        const pid = ++this.pidCounter;
        this.processes.set(pid, { proc, status: 'running' });
        return pid;
    }

    static terminate(pid) {
        const proc = this.processes.get(pid);
        if (proc) {
            proc.status = 'terminated';
            this.processes.delete(pid);
        }
    }

    static killall() {
        for (const [pid] of this.processes) {
            this.terminate(pid);
        }
    }
}

// Concurrency built-ins
const concurrencyBuiltins = {
    // Actor operations
    actor: (behavior) => Actor.spawn(behavior),
    send: (actor, msg) => actor.send(msg),
    tell: (actor, msg) => actor.tell(msg),
    ask: (actor, msg) => actor.ask(msg),
    stop: (actor) => actor.stop(),
    
    // Actor queries
    actors: () => Array.from(ActorSystem.actors.values()),
    actor_of: (pattern) => Actor.where(pattern),
    
    // Channel operations
    channel: () => Channel.create(),
    channel_buffer: (size) => Channel.buffer(size),
    send_to: (ch, val) => ch.send(val),
    receive_from: (ch, handler) => ch.receive(handler),
    poll: (ch) => ch.poll(),
    close: (ch) => ch.close(),
    select: (...cases) => Select.select(...cases),
    alts: (...chs) => Select.alts(...chs),
    
    // Process operations
    spawn: (fn, ...args) => Process.spawn(fn, ...args),
    kill: (proc) => proc.kill(),
    killall: () => ProcessSystem.killall(),
    
    // Sleep/delay
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),
    after: (ms, fn) => setTimeout(fn, ms),
    every: (ms, fn) => setInterval(fn, ms),
    interval: (ms, fn) => setInterval(fn, ms),
};

module.exports = { 
    Actor, ActorSystem, 
    Channel, Select, 
    Process, ProcessSystem,
    concurrencyBuiltins 
};