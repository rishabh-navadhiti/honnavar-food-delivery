import 'server-only';
import { standInNotifier } from './stand-in';
import type { Notifier } from './types';

export type { MessageKind, Notification, NotificationRecipient, Notifier } from './types';

/** The notifier in use. Currently the declared STAND-IN (see ./stand-in.ts). */
export const notifier: Notifier = standInNotifier;
