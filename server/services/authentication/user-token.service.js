class UserTokenService {
  static tokens = {};

  static async create(token, userId) {
    if (!token) throw new Error("Missing token to save");
    return (this.tokens[token] = userId);
  }

  static clearAll() {
    this.tokens = {};
  }

  static clearUserToken(userId) {
    if (!userId) return;
    const foundTokenIndex = Object.values(this.tokens).findIndex(
      (tokenUserId) => userId === tokenUserId
    );
    if (foundTokenIndex === -1) return;
    delete this.tokens[foundTokenIndex];
  }
}

module.exports = {
  UserTokenService
};
