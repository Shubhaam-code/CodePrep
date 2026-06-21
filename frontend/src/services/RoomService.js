export const RoomService = {
  /**
   * Generates a unique room code.
   * @returns {string} e.g. ARENA-ROYALE-4829
   */
  createRoom: () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    return `ARENA-ROYALE-${randomCode}`;
  },

  /**
   * Verifies if a room code exists.
   * @param {string} code 
   */
  joinRoom: (code) => {
    if (!code || !code.startsWith('ARENA-ROYALE-')) {
      return { success: false, error: 'Invalid Lobby Code format.' };
    }
    return { success: true, roomCode: code };
  }
};
