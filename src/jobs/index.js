const registeredJobs = new Map();

function registerJob(name, handler) {
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError("Job name is required.");
  }
  if (typeof handler !== "function") {
    throw new TypeError(`Handler for job "${name}" must be a function.`);
  }

  registeredJobs.set(name, handler);
}

function enqueueJob(name, payload) {
  const handler = registeredJobs.get(name);

  if (!handler) {
    throw new Error(`Job "${name}" is not registered.`);
  }

  setImmediate(() => {
    Promise.resolve(handler(payload)).catch((error) => {
      console.error(`[job:${name}] failed:`, error.message);
    });
  });
}

function registerJobs(handlers = {}) {
  Object.entries(handlers).forEach(([name, handler]) => registerJob(name, handler));
  return registeredJobs.size;
}

module.exports = {
  registerJob,
  enqueueJob,
  registerJobs,
};
