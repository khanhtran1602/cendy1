import { router } from 'expo-router';

// Route definitions with path mappings
const routes = {
  Home: '/(tabs)/home',
  Chats: '/(tabs)/chats',
  Settings: '/(tabs)/settings',
  Login: '/(auth)/login',
  Onboarding: '/(auth)/onboarding',
  Profile: '/(tabs)/home/profile/[name]',
  ProfileFollowers: '/(tabs)/home/profile-followers/[name]',
  AccountSettings: '/(tabs)/settings/account-settings',
  PrivacyAndSecurity: '/(tabs)/settings/privacy-and-security',
  FaceID: '/(tabs)/settings/privacy-and-security/face-id',
  Notifications: '/(tabs)/home/notifications',
  NotificationSettings: '/(tabs)/home/notifications/settings',
  Messages: '/(tabs)/chats/messages',
  MessageConversation: '/(tabs)/chats/messages/[conversationId]',
  Hello: '/hello',
} as const;

// Type for route names
type RouteName = keyof typeof routes;

// Type for route parameters
type RouteParams = {
  Home?: never;
  Chats?: never;
  Settings?: never;
  Login?: never;
  Profile: { name: string };
  ProfileFollowers: { name: string };
  AccountSettings?: never;
  PrivacyAndSecurity?: never;
  FaceID?: never;
  Notifications?: never;
  NotificationSettings?: never;
  Messages?: never;
  MessageConversation: { conversationId: string };
  Hello: never;
};

// Navigate function with type safety
export const navigate = <T extends RouteName>(
  route: T,
  params?: RouteParams[T],
  options?: { replace?: boolean }
): void => {
  let path: string = routes[route]; // Explicitly type as string

  // Replace dynamic parameters in the path
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`[${key}]`, encodeURIComponent(value));
    }
  }

  if (options?.replace) {
    router.replace(path as any);
  } else {
    router.push(path as any);
  }
};

// Helper to get the path for a route
export const getPath = <T extends RouteName>(
  route: T,
  params?: RouteParams[T]
): string => {
  let path: string = routes[route]; // Explicitly type as string
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`[${key}]`, encodeURIComponent(value));
    }
  }
  return path;
};