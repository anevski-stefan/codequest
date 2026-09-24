import { api } from './github';
import type { NotificationsResponse } from '../types/notification';

export const getNotifications = async (limit: number = 50): Promise<NotificationsResponse> => {
  const { data } = await api.get<NotificationsResponse>(`/api/notifications?limit=${limit}`);
  return data;
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await api.put(`/api/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.put('/api/notifications/read-all');
};
