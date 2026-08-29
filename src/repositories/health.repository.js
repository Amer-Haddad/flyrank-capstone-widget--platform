async function getCurrentIsoTime() {
  return new Date().toISOString();
}

module.exports = {
  getCurrentIsoTime,
};
