import { expect, type Page } from '@playwright/test';
import { demoCode } from './catalogue';

/** Sign in through a surface's own screen with the stand-in code. */
export async function signIn(page: Page, loginPath: string, phone: string): Promise<void> {
  await page.goto(loginPath);
  await page.getByLabel(/Mobile number|ಮೊಬೈಲ್ ನಂಬರ್/).fill(phone);
  await page.getByRole('button', { name: /Get code|ಕೋಡ್ ಪಡೆಯಿರಿ/ }).click();
  await page.getByLabel(/6-digit code|6 ಅಂಕಿಯ ಕೋಡ್/).fill(demoCode());
  await page.getByRole('button', { name: /^(Sign in|ಸೈನ್ ಇನ್)$/ }).click();
  await expect(page).not.toHaveURL(new RegExp(`${loginPath}$`));
}
