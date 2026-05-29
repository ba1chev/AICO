export abstract class AppError extends Error {
  public readonly userMessage: string;

  constructor(message: string, userMessage?: string) {
    super(message);
    this.name = this.constructor.name;
    this.userMessage = userMessage ?? message;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
