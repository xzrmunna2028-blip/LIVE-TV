/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  playlistSource: string;
  status: 'online' | 'offline' | 'unknown';
  latency?: number;
}

export interface PlaylistInfo {
  url: string;
  name: string;
  count: number;
}

export interface AppState {
  channels: Channel[];
  loading: boolean;
  error: string | null;
  selectedChannel: Channel | null;
  favorites: string[];
  searchQuery: string;
  selectedGroup: string;
}
