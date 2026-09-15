// Mute actions the client itself requested, so a mute coming from a server-side
// voice state change can be told apart from one the user just asked for.
const COMMAND_LIFETIME_MS = 5000;

let pendingCommand = null;

export const stampMuteCommand = (muted) => {
  pendingCommand = { muted, at: Date.now() };
};

export const consumeMuteCommand = (muted) => {
  if (pendingCommand === null) return false;

  if (Date.now() - pendingCommand.at >= COMMAND_LIFETIME_MS) {
    pendingCommand = null;

    return false;
  }

  // Deliberately kept on a value mismatch: a probe for one direction must not
  // eat a command stamped for the other.
  if (pendingCommand.muted !== muted) return false;

  pendingCommand = null;

  return true;
};

export default { stampMuteCommand, consumeMuteCommand };
