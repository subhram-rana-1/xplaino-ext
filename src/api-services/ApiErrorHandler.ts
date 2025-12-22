// src/api-services/ApiErrorHandler.ts

/**
 * Global API error handler registry
 * Allows UI components to register handlers for specific error conditions
 */
export class ApiErrorHandler {
  private static loginRequiredHandler: (() => void) | null = null;

  /**
   * Register a handler to be called when LOGIN_REQUIRED error is detected
   * @param handler - Function to call when login is required
   */
  static registerLoginRequiredHandler(handler: () => void): void {
    this.loginRequiredHandler = handler;
  }

  /**
   * Trigger the login required handler (if registered)
   */
  static triggerLoginRequired(): void {
    if (this.loginRequiredHandler) {
      console.log('[ApiErrorHandler] Triggering LOGIN_REQUIRED handler');
      this.loginRequiredHandler();
    } else {
      console.warn('[ApiErrorHandler] No LOGIN_REQUIRED handler registered');
    }
  }

  /**
   * Unregister the login required handler
   */
  static unregisterLoginRequiredHandler(): void {
    this.loginRequiredHandler = null;
  }
}

