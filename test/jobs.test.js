const test = require("node:test");
const assert = require("node:assert/strict");

const jobs = require("../src/jobs");

test("registered jobs execute asynchronously after enqueue", async () => {
  const calls = [];
  jobs.registerJob("test-job", async (payload) => {
    calls.push(payload);
  });

  jobs.enqueueJob("test-job", { submissionId: "submission-1" });
  assert.deepEqual(calls, []);

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, [{ submissionId: "submission-1" }]);
});
